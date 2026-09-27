import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { body, fonts, heading, label } from "@/theme/typography";
import { AppointmentsStackParamList } from "@/navigation/types";
import { Cita } from "@/types/domain";
import { cancelarCita, getCitaPorId, getHorariosDisponibles, reprogramarCita } from "@/services/appointmentsService";
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
 */
export function AppointmentDetailScreen({ route, navigation }: Props) {
  const t = useT();
  const dato = useDato();
  const { idioma, diaSemanaCorto, fechaCorta, fechaLarga } = useFormato();
  const { citaId } = route.params;
  const [cita, setCita] = useState<Cita | null>(null);
  const [hoja, setHoja] = useState<"cancelar" | "reprogramar" | null>(null);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [elegido, setElegido] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    getCitaPorId(citaId).then((c) => setCita(c ? { ...c } : null));
  }, [citaId]);

  const volver = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("AppointmentsList"));

  if (!cita) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <ScreenHeader title={t("citas.detalle")} onBack={volver} />
      </SafeAreaView>
    );
  }

  const estado = { activo: ACTIVO[cita.estado] };
  const especialidad = dato("especialidades", cita.especialidad);
  const porVenir = new Date(cita.fechaHoraISO).getTime() > Date.now();
  const editable = cita.estado === "confirmada" && porVenir;
  const recuperada = cita.origen === "cupo-recuperado";

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
    }
    setHoja(null);
  }

  async function confirmarCancelacion() {
    const cancelada = await cancelarCita(cita!.id);
    if (cancelada) {
      setCita({ ...cancelada });
      setAviso(t("citas.canceladaAviso"));
    }
    setHoja(null);
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <ScreenHeader title={t("citas.detalle")} onBack={volver} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {aviso ? (
          <View style={styles.aviso} accessibilityLiveRegion="polite">
            <Ionicons name="information-circle-outline" size={18} color={colors.accent700} />
            <Text style={[body(13, colors.accent800), styles.flex]}>{aviso}</Text>
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
            <View style={styles.icono}>
              <Ionicons name="location-outline" size={20} color={colors.accent700} />
            </View>
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
            {editable ? (
              <Dato icono="notifications-outline" etiqueta={t("citas.recordatorio")} valor={t("citas.dosHorasAntes")} divisor />
            ) : null}
          </Card>
        </Seccion>
      </ScrollView>

      {editable ? (
        <View style={styles.acciones}>
          <PrimaryButton label={t("citas.reprogramar")} onPress={abrirReprogramar} style={styles.flex} />
          <Pressable
            onPress={() => setHoja("cancelar")}
            accessibilityRole="button"
            accessibilityLabel={t("citas.cancelarCita")}
            style={({ pressed }) => [styles.cancelar, pressed && styles.presionado]}
          >
            <Text style={styles.cancelarTexto}>{t("citas.cancelarCita")}</Text>
          </Pressable>
        </View>
      ) : null}

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
    </SafeAreaView>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.seccion}>
      <Text style={label(10, colors.neutral600)}>{titulo}</Text>
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
  return (
    <View style={[styles.dato, divisor && styles.divisor]}>
      <Ionicons name={icono} size={18} color={colors.accent700} />
      <View style={styles.flex}>
        <Text style={body(12, colors.neutral600)}>{etiqueta}</Text>
        <Text style={[body(15, colors.text), styles.medio]}>{valor}</Text>
        {detalle ? <Text style={body(13, colors.neutral700)}>{detalle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
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
  aviso: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.accent100,
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
    backgroundColor: colors.neutral100,
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
    color: colors.neutral700,
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
    backgroundColor: colors.accent100,
    alignItems: "center",
    justifyContent: "center",
  },
  icono: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.superficie,
    borderTopWidth: 1,
    borderTopColor: colors.borde,
  },
  cancelar: {
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: radius.md + 2,
    borderWidth: 1,
    borderColor: colors.borde,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelarTexto: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.accent900,
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
    color: "#ffffff",
  },
});
