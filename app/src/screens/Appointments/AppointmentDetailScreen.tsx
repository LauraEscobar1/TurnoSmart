import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { Pantalla } from "@/components/Vidrio";
import { IconoCirculo, TituloSeccion } from "@/components/Adornos";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { radius } from "@/theme/spacing";
import { body, fonts, heading } from "@/theme/typography";
import { AppointmentsStackParamList } from "@/navigation/types";
import { Cita } from "@/types/domain";
import {
  cancelarCita,
  confirmarAsistencia,
  getCitaPorId,
  getHorariosDisponibles,
  reprogramarCita,
} from "@/services/appointmentsService";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Card } from "@/components/Card";
import { HojaInferior } from "@/components/HojaInferior";
import { PrimaryButton } from "@/components/PrimaryButton";
import { fechaLarga as fechaLargaEn, hora, useFormato } from "@/utils/format";
import { Idioma, useDato, useT } from "@/i18n";

type Props = NativeStackScreenProps<AppointmentsStackParamList, "AppointmentDetail">;

/** Solo la cita confirmada se ve «activa» (acero); el resto, en gris. El texto sale de i18n. */
const ACTIVO: Record<Cita["estado"], boolean> = {
  confirmada: true,
  asistida: false,
  cancelada: false,
  reasignada: false,
  "no-show": false,
};

/** "Jueves, 8 de octubre" · "Thursday, October 8" */
function fechaTitulo(iso: string, idioma: Idioma) {
  const larga = fechaLargaEn(new Date(iso), idioma);
  if (idioma !== "es") return larga;
  const [diaSemana, ...resto] = larga.split(" ");
  return `${diaSemana[0].toUpperCase()}${diaSemana.slice(1)}, ${resto.join(" ")}`;
}

const iniciales = (nombre: string) =>
  nombre
    .replace(/^(Dr|Dra|Lic)\.\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(-2)
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

/**
 * Detalle de cita — una ficha completa: encabezado con especialidad, fecha,
 * hora y estado; secciones Especialista, Lugar e Información de la reserva;
 * y acciones fijas abajo (Reprogramar, Cancelar cita) mientras la cita
 * esté confirmada y por venir. Solo muestra datos que la app tiene.
 *
 * «Confirma tu asistencia»: mientras la cita esté por venir y sin confirmar,
 * una tarjeta pide confirmarla; si no puede ir, «Cancelar cita» (abajo)
 * devuelve el cupo a la lista de espera a tiempo. La notificación del mismo nombre abre esta pantalla con
 * `accion` = "confirmar" (confirma al abrir) o "cancelar" (abre la hoja).
 */
export function AppointmentDetailScreen({ route, navigation }: Props) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const dato = useDato();
  const { idioma, diaSemanaCorto, fechaCorta, fechaLarga } = useFormato();
  const insets = useSafeAreaInsets();
  const { citaId, accion } = route.params;
  const [cita, setCita] = useState<Cita | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  /** La acción de la notificación se aplica una sola vez por cita. */
  const accionAplicada = useRef<string | null>(null);
  const [hoja, setHoja] = useState<"cancelar" | "reprogramar" | null>(null);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [elegido, setElegido] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    getCitaPorId(citaId).then(async (c) => {
      if (!vigente) return;
      setCita(c ? { ...c } : null);
      const clave = `${citaId}:${accion ?? ""}`;
      if (!c || !accion || accionAplicada.current === clave) return;
      accionAplicada.current = clave;
      if (c.estado !== "confirmada" || new Date(c.fechaHoraISO).getTime() <= Date.now()) return;
      if (accion === "cancelar") setHoja("cancelar");
      else if (!c.asistenciaConfirmadaISO) {
        const confirmada = await confirmarAsistencia(c.id);
        if (!vigente) return;
        if (confirmada) setCita({ ...confirmada });
        setAviso(confirmada ? t("citas.asistenciaConfirmadaAviso") : t("citas.errorConfirmar"));
      }
    });
    return () => {
      vigente = false;
    };
    // Sin `t` en las dependencias: cambiar el idioma no debe repetir la acción.
  }, [citaId, accion]);

  const volver = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("AppointmentsList"));

  if (!cita) {
    return (
      <Pantalla edges={["top"]} style={styles.safe}>
        <ScreenHeader title={t("citas.detalle")} onBack={volver} />
      </Pantalla>
    );
  }

  const estado = { activo: ACTIVO[cita.estado] };
  const especialidad = dato("especialidades", cita.especialidad);
  const porVenir = new Date(cita.fechaHoraISO).getTime() > Date.now();
  const editable = cita.estado === "confirmada" && porVenir;
  const recuperada = cita.origen === "cupo-recuperado";
  const asistenciaConfirmada = !!cita.asistenciaConfirmadaISO;

  async function confirmarMiAsistencia() {
    setConfirmando(true);
    const confirmada = await confirmarAsistencia(cita!.id);
    setConfirmando(false);
    if (confirmada) setCita({ ...confirmada });
    setAviso(confirmada ? t("citas.asistenciaConfirmadaAviso") : t("citas.errorConfirmar"));
  }

  async function abrirReprogramar() {
    setElegido(null);
    setHorarios(await getHorariosDisponibles(cita!));
    setHoja("reprogramar");
  }

  async function confirmarReprogramacion() {
    if (!elegido) return;
    const nueva = await reprogramarCita(cita!.id, elegido);
    if (nueva) {
      setCita({ ...nueva });
      setAviso(t("citas.reprogramada", { fecha: fechaCorta(elegido), hora: hora(elegido) }));
    } else {
      setAviso(t("citas.errorReprogramar"));
    }
    setHoja(null);
  }

  async function confirmarCancelacion() {
    const cancelada = await cancelarCita(cita!.id);
    if (cancelada) {
      setCita({ ...cancelada });
      setAviso(t("citas.canceladaAviso"));
    } else {
      setAviso(t("citas.errorCancelar"));
    }
    setHoja(null);
  }

  return (
    <Pantalla edges={["top"]} style={styles.safe}>
      <ScreenHeader title={t("citas.detalle")} onBack={volver} />
      {/* Carga → contenido: la ficha aparece con un fundido suave. */}
      <Animated.ScrollView
        entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {aviso ? (
          <View style={styles.aviso} accessibilityLiveRegion="polite">
            <Ionicons name="information-circle-outline" size={18} color={colors.icono} />
            <Text style={[body(13, colors.info), styles.flex]}>{aviso}</Text>
          </View>
        ) : null}

        {/* Encabezado de la ficha */}
        <View style={[styles.hero, !estado.activo && styles.heroInactivo]}>
          <Text style={heading(32, colors.accent900)}>{especialidad}</Text>
          <Text style={[body(16, colors.accent800), styles.heroFecha]}>{fechaTitulo(cita.fechaHoraISO, idioma)}</Text>
          <View style={styles.heroFila}>
            <Text style={[styles.heroHora, !estado.activo && styles.heroHoraInactiva]}>{hora(cita.fechaHoraISO)}</Text>
            <View style={[styles.estado, !estado.activo && styles.estadoInactivo]}>
              <View style={[styles.estadoPunto, !estado.activo && styles.estadoPuntoInactivo]} />
              <Text
                style={[
                  styles.estadoTexto,
                  !estado.activo && styles.estadoTextoInactivo,
                  cita.estado === "cancelada" && styles.tachado,
                ]}
              >
                {dato("estadosCita", cita.estado)}
              </Text>
            </View>
          </View>
        </View>

        {editable && !asistenciaConfirmada ? (
          <Card tono="acento" style={styles.confirmar}>
            <View style={styles.confirmarCabecera}>
              <Ionicons name="checkmark-circle-outline" size={22} color={colors.icono} />
              <Text style={[heading(20, colors.accent900), styles.flex]}>{t("citas.confirmarTitulo")}</Text>
            </View>
            <Text style={body(14, colors.accent800)}>{t("citas.confirmarTexto")}</Text>
            <PrimaryButton
              label={t("citas.confirmar")}
              onPress={confirmarMiAsistencia}
              disabled={confirmando}
              style={styles.confirmarBoton}
            />
          </Card>
        ) : null}

        {/* Especialista */}
        <Seccion titulo={t("comun.especialista")}>
          <Card style={styles.fila}>
            <View style={styles.avatar}>
              <Text style={heading(18, colors.accent700)}>{iniciales(cita.profesional)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={heading(19, colors.accent900)}>{cita.profesional}</Text>
              <Text style={body(13, colors.neutral700)}>{especialidad}</Text>
            </View>
          </Card>
        </Seccion>

        {/* Lugar */}
        <Seccion titulo={t("citas.lugar")}>
          <Card style={styles.fila}>
            <IconoCirculo nombre="location-outline" tamano={52} tamanoIcono={22} />
            <View style={styles.flex}>
              <Text style={body(12, colors.neutral600)}>{t("comun.consultorio")}</Text>
              <Text style={heading(19, colors.accent900)}>{cita.consultorio}</Text>
            </View>
          </Card>
        </Seccion>

        {/* Información de la reserva */}
        <Seccion titulo={t("citas.infoReserva")}>
          <Card style={styles.lista}>
            <Dato
              icono={recuperada ? "flash-outline" : "calendar-outline"}
              etiqueta={t("citas.origen")}
              valor={t(recuperada ? "citas.cupoRecuperado" : "citas.reservaDirecta")}
              detalle={recuperada ? t("citas.cupoRecuperadoDetalle") : undefined}
            />
            {editable && asistenciaConfirmada ? (
              <Dato icono="checkmark-done-outline" etiqueta={t("citas.asistencia")} valor={t("citas.asistenciaConfirmada")} divisor />
            ) : null}
            {editable ? (
              <Dato icono="notifications-outline" etiqueta={t("citas.recordatorio")} valor={t("citas.dosHorasAntes")} divisor />
            ) : null}
          </Card>
        </Seccion>

        {/* Acciones al final del contenido: se desplazan con la pantalla y nunca tapan la información. */}
        {editable ? (
          <View style={styles.acciones}>
            <PrimaryButton label={t("citas.reprogramar")} onPress={abrirReprogramar} style={styles.flex} />
            <PrimaryButton
              label={t("citas.cancelarCita")}
              variant="peligro"
              onPress={() => setHoja("cancelar")}
              style={styles.flex}
            />
          </View>
        ) : null}
      </Animated.ScrollView>

      <HojaInferior
        visible={hoja === "cancelar"}
        onCerrar={() => setHoja(null)}
        titulo={t("citas.cancelarPregunta")}
        descripcion={t("citas.cancelarDescripcion", {
          especialidad,
          fecha: fechaCorta(cita.fechaHoraISO),
          hora: hora(cita.fechaHoraISO),
        })}
      >
        <PrimaryButton label={t("citas.siCancelar")} onPress={confirmarCancelacion} />
        <PrimaryButton label={t("citas.mantener")} variant="secondary" onPress={() => setHoja(null)} />
      </HojaInferior>

      <HojaInferior
        visible={hoja === "reprogramar"}
        onCerrar={() => setHoja(null)}
        titulo={t("citas.elegirHorario")}
        descripcion={t("citas.horariosCon", { profesional: cita.profesional })}
      >
        <View style={styles.horarios}>
          {horarios.map((iso) => {
            const activo = iso === elegido;
            return (
              <Pressable
                key={iso}
                onPress={() => setElegido(iso)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={`${fechaLarga(new Date(iso))}, ${hora(iso)}`}
                style={[styles.horario, activo && styles.horarioActivo]}
              >
                <Text style={[styles.horarioDia, activo && styles.horarioTextoActivo]}>
                  {diaSemanaCorto(new Date(iso))} {fechaCorta(iso)}
                </Text>
                <Text style={[heading(18, colors.accent900), activo && styles.horarioTextoActivo]}>{hora(iso)}</Text>
              </Pressable>
            );
          })}
        </View>
        <PrimaryButton label={t("citas.confirmarHorario")} onPress={confirmarReprogramacion} disabled={!elegido} />
      </HojaInferior>
    </Pantalla>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const styles = useEstilos(crearStyles);
  return (
    <View style={styles.seccion}>
      <TituloSeccion titulo={titulo} />
      {children}
    </View>
  );
}

function Dato({
  icono,
  etiqueta,
  valor,
  detalle,
  divisor,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  etiqueta: string;
  valor: string;
  detalle?: string;
  divisor?: boolean;
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  return (
    <View style={[styles.dato, divisor && styles.divisor]}>
      <IconoCirculo nombre={icono} tamano={34} tamanoIcono={17} />
      <View style={styles.flex}>
        <Text style={body(12, colors.neutral600)}>{etiqueta}</Text>
        <Text style={[body(15, colors.text), styles.medio]}>{valor}</Text>
        {detalle ? <Text style={body(13, colors.neutral700)}>{detalle}</Text> : null}
      </View>
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 22,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  medio: {
    fontFamily: fonts.bodyMedium,
  },
  presionado: {
    opacity: 0.7,
  },
  confirmar: {
    padding: 18,
    gap: 10,
  },
  confirmarCabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  confirmarBoton: {
    marginTop: 4,
  },
  aviso: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.infoFondo,
    borderWidth: 1,
    borderColor: colors.accent200,
  },
  // Encabezado
  hero: {
    padding: 22,
    borderRadius: radius.xl,
    backgroundColor: colors.accent100,
    borderWidth: 1,
    borderColor: colors.accent200,
  },
  heroInactivo: {
    backgroundColor: colors.superficie,
    borderColor: colors.borde,
  },
  heroFecha: {
    marginTop: 4,
  },
  heroFila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  heroHora: {
    fontFamily: fonts.heading,
    fontSize: 44,
    lineHeight: 48,
    color: colors.accent700,
  },
  heroHoraInactiva: {
    color: colors.neutral600,
  },
  estado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.superficie,
  },
  estadoInactivo: {
    backgroundColor: colors.neutralTinte,
    borderWidth: 1,
    borderColor: colors.neutralBorde,
  },
  estadoPunto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  estadoPuntoInactivo: {
    backgroundColor: colors.neutral300,
  },
  estadoTexto: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.accent900,
  },
  estadoTextoInactivo: {
    color: colors.neutralTexto,
  },
  tachado: {
    textDecorationLine: "line-through",
  },
  // Secciones
  seccion: {
    gap: 10,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.bordeCirculoIcono,
    borderTopColor: colors.bordeSuperiorCard,
    backgroundColor: colors.accent100,
    alignItems: "center",
    justifyContent: "center",
  },
  lista: {
    paddingHorizontal: 16,
  },
  dato: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
  },
  divisor: {
    borderTopWidth: 1,
    borderTopColor: colors.borde,
  },
  // Acciones
  acciones: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  // Horarios
  horarios: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  horario: {
    width: "31.5%",
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borde,
    backgroundColor: colors.fondo,
  },
  horarioActivo: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  horarioDia: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.neutral700,
  },
  horarioTextoActivo: {
    color: colors.sobreAcento,
  },
});
