import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCargarDatos } from "@/hooks/useCargarDatos";
import { colors } from "@/theme/colors";
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
import { diasEnEspera, fechaCorta, haceCuanto } from "@/utils/format";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MARGEN = 20;

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
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
  const navigation = useNavigation<Nav>();
  const paciente = usePaciente();
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [oferta, setOferta] = useState<OfertaCupo | null>(null);
  const [proximaCita, setProximaCita] = useState<Cita | null>(null);
  const [avisos, setAvisos] = useState<Notificacion[]>([]);

  useCargarDatos(
    useCallback(() => {
      getOfertaPendiente().then(setOferta);
      getCitasProximas().then((citas) => setProximaCita(citas[0] ?? null));
      getNotificaciones(paciente.nombre).then(setAvisos);
    }, [paciente.nombre])
  );

  const noLeidos = avisos.filter((a) => !a.leida);

  // Frase breve según el estado: lo más urgente primero.
  const bajada = oferta
    ? "Tenés una oferta de cupo esperando respuesta."
    : proximaCita
      ? `Tu próxima cita es el ${fechaCorta(proximaCita.fechaHoraISO)}.`
      : "Te avisamos apenas se libere un cupo para vos.";

  const irA = {
    buscar: () => navigation.navigate("BuscarEspecialista"),
    citas: () => navigation.navigate("Tabs", { screen: "MisCitas" }),
    espera: () => navigation.navigate("Tabs", { screen: "Perfil", params: { screen: "Preferences", initial: false } }),
    avisos: () => navigation.navigate("Tabs", { screen: "Notificaciones" }),
    ofertas: () => navigation.navigate("Tabs", { screen: "Ofertas" }),
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 1. Saludo */}
        <View style={styles.saludo}>
          <View style={styles.flex}>
            <Text style={label(10)}>{saludo()}</Text>
            <Text style={heading(28, colors.accent900)} numberOfLines={1}>
              {paciente.nombre} {paciente.apellido}
            </Text>
            <Text style={[body(14, colors.neutral700), styles.bajada]}>{bajada}</Text>
          </View>
          <Pressable
            onPress={() => setAjustesAbiertos(true)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Ajustes"
            style={({ pressed }) => [styles.menu, pressed && styles.presionado]}
          >
            <Ionicons name="menu-outline" size={24} color={colors.accent900} />
          </Pressable>
        </View>

        {/* 2. Ofertas */}
        <Seccion titulo="Ofertas de cupo" accion="Ver todas" onAccion={irA.ofertas}>
          {oferta ? (
            <OfferCard
              variant="home"
              oferta={oferta}
              onPress={() => navigation.navigate("OfferDetail", { ofertaId: oferta.id })}
            />
          ) : (
            <Card tono="acento" style={styles.sinOferta}>
              <View style={styles.radar}>
                <View style={styles.radarAnillo} />
                <Ionicons name="notifications-outline" size={20} color="#ffffff" />
              </View>
              <View style={styles.flex}>
                <Text style={heading(18, colors.accent900)}>Sin ofertas por ahora</Text>
                <Text style={body(13, colors.accent800)}>
                  Te avisaremos apenas se libere un cupo que te pueda interesar.
                </Text>
                <View style={styles.estadoAlertas}>
                  <View style={[styles.puntoEstado, !paciente.notificacionesActivas && styles.puntoApagado]} />
                  <Text style={styles.estadoTexto}>
                    {paciente.notificacionesActivas ? "Alertas activas" : "Alertas desactivadas"} ·{" "}
                    {paciente.especialidadesInteres.length}{" "}
                    {paciente.especialidadesInteres.length === 1 ? "especialidad" : "especialidades"}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </Seccion>

        {/* 3. Próxima cita */}
        <Seccion titulo="Próxima cita" accion={proximaCita ? "Ver citas" : undefined} onAccion={irA.citas}>
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
              <Ionicons name="calendar-clear-outline" size={20} color={colors.neutral600} />
              <Text style={body(14, colors.neutral700)}>No tenés citas confirmadas.</Text>
            </Card>
          )}
        </Seccion>

        {/* 4. Lista de espera */}
        <Seccion titulo="Tu lista de espera" accion="Sumar especialidad" onAccion={irA.buscar}>
          <ListaEspera
            puesto={paciente.puestoEspera}
            dias={diasEnEspera(paciente.registradoEnISO)}
            onPress={irA.espera}
          />
        </Seccion>

        {/* 5. Notificaciones recientes */}
        <Seccion titulo="Notificaciones recientes" accion={noLeidos.length ? "Ver todos" : undefined} onAccion={irA.avisos}>
          <Card style={styles.avisos}>
            {noLeidos.length ? (
              noLeidos.slice(0, 2).map((a, i) => (
                <Pressable
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
                  <Text style={label(9)}>{haceCuanto(a.fechaISO)}</Text>
                </Pressable>
              ))
            ) : (
              <View style={styles.alDia}>
                <View style={styles.alDiaIcono}>
                  <Ionicons name="checkmark" size={18} color="#ffffff" />
                </View>
                <View>
                  <Text style={heading(17, colors.accent900)}>Todo al día</Text>
                  <Text style={body(13, colors.neutral700)}>No tenés notificaciones nuevas.</Text>
                </View>
              </View>
            )}
          </Card>
        </Seccion>
      </ScrollView>
      <MenuAjustes visible={ajustesAbiertos} onCerrar={() => setAjustesAbiertos(false)} />
    </SafeAreaView>
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
  return (
    <View style={styles.seccion}>
      <View style={styles.seccionCabecera}>
        <Text style={heading(18, colors.accent900)}>{titulo}</Text>
        {accion ? (
          <Pressable onPress={onAccion} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>{accion}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/**
 * Lista de espera: el puesto en grande y la cola dibujada como puntos
 * (los que están antes, tenues; vos, la píldora de acero).
 */
function ListaEspera({ puesto, dias, onPress }: { puesto: number; dias: number; onPress: () => void }) {
  const antes = Math.max(0, puesto - 1);
  const visibles = Math.min(antes, 9);

  return (
    <Card onPress={onPress} accessibilityRole="button" accessibilityLabel="Ver lista de espera" style={styles.espera}>
      <View style={styles.esperaDatos}>
        <View style={styles.flex}>
          <Text style={label(9)}>Puesto</Text>
          <Text style={styles.esperaNumero}>{puesto}</Text>
        </View>
        <View style={styles.esperaSeparador} />
        <View style={styles.flex}>
          <Text style={label(9)}>En espera</Text>
          <Text style={styles.esperaNumero}>
            {dias}
            <Text style={heading(17, colors.neutral600)}> {dias === 1 ? "día" : "días"}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.cola} accessibilityLabel={`${antes} personas antes que vos`}>
        {antes > visibles ? <Text style={styles.colaMas}>+{antes - visibles}</Text> : null}
        {Array.from({ length: visibles }, (_, i) => (
          <View key={i} style={[styles.colaPunto, { opacity: 0.35 + (0.5 * (i + 1)) / Math.max(visibles, 1) }]} />
        ))}
        <View style={styles.colaVos}>
          <Text style={styles.colaVosTexto}>Vos</Text>
        </View>
      </View>
      <Text style={body(13, colors.neutral700)}>
        {antes === 0
          ? "Sos el primero: el próximo cupo que te sirva es tuyo."
          : `${antes} ${antes === 1 ? "persona" : "personas"} antes que vos. Te avisamos cuando se libere un cupo.`}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
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
  seccionCabecera: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  link: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.accent700,
  },
  // Sin oferta
  sinOferta: {
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  radar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
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
  // Lista de espera
  espera: {
    padding: 18,
    gap: 14,
  },
  esperaDatos: {
    flexDirection: "row",
    alignItems: "center",
  },
  esperaSeparador: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: colors.borde,
    marginHorizontal: 18,
  },
  esperaNumero: {
    fontFamily: fonts.heading,
    fontSize: 36,
    lineHeight: 40,
    color: colors.accent900,
  },
  cola: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  colaMas: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.neutral600,
    marginRight: 2,
  },
  colaPunto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent300,
  },
  colaVos: {
    marginLeft: 2,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  colaVosTexto: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "#ffffff",
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
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
