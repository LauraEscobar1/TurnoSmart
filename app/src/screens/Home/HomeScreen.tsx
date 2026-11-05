import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCargarDatos } from "@/hooks/useCargarDatos";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { Pantalla } from "@/components/Vidrio";
import Animated, { FadeIn, LinearTransition, ReduceMotion } from "react-native-reanimated";
import { IconoCirculo, TituloSeccion } from "@/components/Adornos";
import { Presionable } from "@/components/Presionable";
import { TarjetaListaEspera } from "@/components/TarjetaListaEspera";
import { getSolicitudesActivas } from "@/services/solicitudesEsperaService";
import { radius } from "@/theme/spacing";
import { body, fonts, heading, label } from "@/theme/typography";
import { OfferCard } from "@/components/OfferCard";
import { AppointmentCard } from "@/components/AppointmentCard";
import { Card } from "@/components/Card";
import { MenuAjustes } from "@/components/MenuAjustes";
import { Cita, Notificacion, OfertaCupo } from "@/types/domain";
import { getOfertaPendiente } from "@/services/offersService";
import { getCitasProximas } from "@/services/appointmentsService";
import { getNotificaciones } from "@/services/notificationsService";
import { RootStackParamList } from "@/navigation/types";
import { usePaciente } from "@/auth/AuthContext";
import { useFormato } from "@/utils/format";
import { T, useT } from "@/i18n";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MARGEN = 20;

function saludo(t: T) {
  const h = new Date().getHours();
  if (h < 12) return t("inicio.saludo.manana");
  if (h < 20) return t("inicio.saludo.tarde");
  return t("inicio.saludo.noche");
}

/**
 * Inicio — Nivel 1 (docs/02-jerarquia.md §2), como un tablero:
 *   saludo (con el menú ☰ de Ajustes) → oferta (la máxima prioridad) → próxima cita → lista de
 *   espera → avisos recientes. La navegación global vive solo en la barra
 *   inferior; cada sección ofrece únicamente sus propias acciones.
 * Cada bloque tiene un peso visual distinto (sin tarjeta, tinte, blanco,
 * lista liviana) para que no se lea como una pila de tarjetas iguales.
 */
export function HomeScreen() {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const { idioma, fechaCorta, haceCuanto } = useFormato();
  const navigation = useNavigation<Nav>();
  const paciente = usePaciente();
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [oferta, setOferta] = useState<OfertaCupo | null>(null);
  const [proximaCita, setProximaCita] = useState<Cita | null>(null);
  const [avisos, setAvisos] = useState<Notificacion[]>([]);
  /** Alta de cada solicitud de la lista de espera, para los días por especialidad. */
  const [desde, setDesde] = useState<Record<string, string>>({});

  useCargarDatos(
    useCallback(() => {
      getOfertaPendiente().then(setOferta);
      getCitasProximas().then((citas) => setProximaCita(citas[0] ?? null));
      getNotificaciones(paciente.nombre, idioma).then(setAvisos);
      getSolicitudesActivas(paciente.id)
        .then((s) => setDesde(Object.fromEntries(s.map((x) => [x.especialidad, x.creadaEnISO]))))
        .catch(() => {});
    }, [paciente.nombre, paciente.id, idioma, paciente.especialidadesInteres.length])
  );

  const noLeidos = avisos.filter((a) => !a.leida);

  // Frase breve según el estado: lo más urgente primero.
  const bajada = oferta
    ? t("inicio.bajada.oferta")
    : proximaCita
      ? t("inicio.bajada.cita", { fecha: fechaCorta(proximaCita.fechaHoraISO) })
      : t("inicio.bajada.nada");

  const irA = {
    buscar: () => navigation.navigate("BuscarEspecialista"),
    citas: () => navigation.navigate("Tabs", { screen: "MisCitas" }),
    // La lista de espera (ver, sumar y sacar especialidades) vive en Buscar especialista.
    espera: () => navigation.navigate("BuscarEspecialista"),
    avisos: () => navigation.navigate("Tabs", { screen: "Notificaciones" }),
    ofertas: () => navigation.navigate("Tabs", { screen: "Ofertas" }),
  };

  return (
    <Pantalla edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 1. Saludo */}
        <View style={styles.saludo}>
          <View style={styles.flex}>
            <Text style={label(10, colors.textoTenueSobreFondo)}>{saludo(t)}</Text>
            <Text style={heading(28, colors.textoSobreFondo)} numberOfLines={1}>
              {paciente.nombre} {paciente.apellido}
            </Text>
            <Text style={[body(14, colors.textoSuaveSobreFondo), styles.bajada]}>{bajada}</Text>
          </View>
          <Presionable
            onPress={() => setAjustesAbiertos(true)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t("ajustes.titulo")}
            style={({ pressed }) => [styles.menu, pressed && styles.presionado]}
          >
            <Ionicons name="menu-outline" size={24} color={colors.icono} />
          </Presionable>
        </View>

        {/* 2. Ofertas */}
        <Seccion titulo={t("inicio.ofertas")} accion={t("inicio.verTodas")} onAccion={irA.ofertas}>
          {oferta ? (
            <OfferCard
              variant="home"
              oferta={oferta}
              onPress={() => navigation.navigate("OfferDetail", { ofertaId: oferta.id })}
            />
          ) : (
            // Sin oferta: el asistente IA queda atento (describe el sistema, no una priorización).
            <Card tono="acento" style={styles.sinOferta}>
              <View style={styles.radar}>
                <View style={styles.radarAnillo} />
                <Ionicons name="sparkles" size={20} color={colors.sobreAcentoIA} />
              </View>
              <View style={styles.flex} accessible accessibilityLabel={`${t("asistenteIA.atentoTitulo")}. ${t("asistenteIA.atentoTexto")}`}>
                <Text style={label(9, colors.accent700)}>{t("inicio.sinOfertas")}</Text>
                <Text style={heading(18, colors.accent900)}>{t("asistenteIA.atentoTitulo")}</Text>
                <Text style={body(13, colors.accent800)}>{t("asistenteIA.atentoTexto")}</Text>
                <View style={styles.estadoAlertas}>
                  <View style={[styles.puntoEstado, !paciente.notificacionesActivas && styles.puntoApagado]} />
                  <Text style={styles.estadoTexto}>
                    {t(paciente.notificacionesActivas ? "inicio.alertasActivas" : "inicio.alertasDesactivadas")} ·{" "}
                    {t("inicio.nEspecialidades", { count: paciente.especialidadesInteres.length })}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </Seccion>

        {/* 3. Próxima cita */}
        <Seccion titulo={t("inicio.proximaCita")} accion={proximaCita ? t("inicio.verCitas") : undefined} onAccion={irA.citas}>
          {proximaCita ? (
            <AppointmentCard
              cita={proximaCita}
              conFecha
              onPress={() =>
                navigation.navigate("Tabs", {
                  screen: "MisCitas",
                  params: { screen: "AppointmentDetail", params: { citaId: proximaCita.id }, initial: false },
                })
              }
            />
          ) : (
            <Card style={styles.filaSimple}>
              <IconoCirculo nombre="calendar-clear-outline" tamano={38} tamanoIcono={18} />
              <Text style={body(14, colors.neutral700)}>{t("inicio.sinCitas")}</Text>
            </Card>
          )}
        </Seccion>

        {/* 4. Lista de espera */}
        <Seccion titulo={t("inicio.listaEspera")} accion={t("inicio.sumarEspecialidad")} onAccion={irA.buscar}>
          <TarjetaListaEspera
            especialidades={paciente.especialidadesInteres}
            desde={desde}
            desdeGeneral={paciente.registradoEnISO}
            puesto={paciente.puestoEspera}
            onVer={irA.espera}
          />
        </Seccion>

        {/* 5. Notificaciones recientes */}
        <Seccion
          titulo={t("inicio.notificacionesRecientes")}
          accion={noLeidos.length ? t("inicio.verTodos") : undefined}
          onAccion={irA.avisos}
        >
          <Card style={styles.avisos}>
            {noLeidos.length ? (
              noLeidos.slice(0, 2).map((a, i) => (
                <Presionable
                  key={a.id}
                  onPress={() =>
                    a.tipo === "cupo-ultimo-minuto" && a.referenciaId
                      ? navigation.navigate("OfferDetail", { ofertaId: a.referenciaId })
                      : irA.avisos()
                  }
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.aviso, i > 0 && styles.avisoDivisor, pressed && styles.presionado]}
                >
                  <View style={styles.avisoPunto} />
                  <View style={styles.flex}>
                    <Text style={heading(16, colors.accent900)} numberOfLines={1}>
                      {a.titulo}
                    </Text>
                    {a.cuerpo ? (
                      <Text style={body(12, colors.neutral700)} numberOfLines={1}>
                        {a.cuerpo}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={label(9, colors.neutral600)}>{haceCuanto(a.fechaISO)}</Text>
                </Presionable>
              ))
            ) : (
              <View style={styles.alDia}>
                <View style={styles.alDiaIcono}>
                  <Ionicons name="checkmark" size={18} color={colors.exitoTexto} />
                </View>
                <View>
                  <Text style={heading(17, colors.accent900)}>{t("inicio.todoAlDia")}</Text>
                  <Text style={body(13, colors.neutral700)}>{t("inicio.sinNotificaciones")}</Text>
                </View>
              </View>
            )}
          </Card>
        </Seccion>
      </ScrollView>
      <MenuAjustes visible={ajustesAbiertos} onCerrar={() => setAjustesAbiertos(false)} />
    </Pantalla>
  );
}

function Seccion({
  titulo,
  accion,
  onAccion,
  children,
}: {
  titulo: string;
  accion?: string;
  onAccion?: () => void;
  children: React.ReactNode;
}) {
  const styles = useEstilos(crearStyles);
  return (
    <View style={styles.seccion}>
      <TituloSeccion
        titulo={titulo}
        variante="grande"
        accion={
          accion ? (
            <Presionable onPress={onAccion} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>{accion}</Text>
            </Presionable>
          ) : null
        }
      />
      {/* Carga → contenido: cada sección se acomoda y aparece con un fundido suave. */}
      <Animated.View entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)} layout={LinearTransition.reduceMotion(ReduceMotion.System)}>
        {children}
      </Animated.View>
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: MARGEN,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 26,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  presionado: {
    opacity: 0.7,
  },
  // Saludo
  saludo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  bajada: {
    marginTop: 2,
  },
  menu: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.superficie,
    borderWidth: 1,
    borderColor: colors.borde,
    alignItems: "center",
    justifyContent: "center",
  },
  // Secciones
  seccion: {
    gap: 12,
  },
  link: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.acentoSobreFondo,
  },
  // Sin oferta
  sinOferta: {
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  // Brillo suave de IA.
  radar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.acentoIA,
    shadowColor: colors.brilloIA,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    alignItems: "center",
    justifyContent: "center",
  },
  radarAnillo: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: colors.accent300,
  },
  estadoAlertas: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.superficie,
  },
  puntoEstado: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  puntoApagado: {
    backgroundColor: colors.neutral300,
  },
  estadoTexto: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.accent800,
  },
  filaSimple: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  // Avisos
  avisos: {
    paddingHorizontal: 16,
  },
  aviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  avisoDivisor: {
    borderTopWidth: 1,
    borderTopColor: colors.borde,
  },
  avisoPunto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  alDia: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  alDiaIcono: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.exitoBorde,
    backgroundColor: colors.exitoTinte,
    alignItems: "center",
    justifyContent: "center",
  },
});
