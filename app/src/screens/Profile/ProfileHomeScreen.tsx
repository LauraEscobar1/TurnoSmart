import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { radius, sombra } from "@/theme/spacing";
import { body, fonts, heading } from "@/theme/typography";
import { ProfileStackParamList } from "@/navigation/types";
import { useAuth, usePaciente } from "@/auth/AuthContext";
import { abrirAjustes, pedirPermisoNotificaciones } from "@/services/permisosService";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AvatarPaciente } from "@/components/AvatarPaciente";
import { elegirFotoPerfil } from "@/services/fotoService";
import { diasEnEspera } from "@/utils/format";
import { perfilCompleto } from "@/utils/perfil";

type Nav = NativeStackNavigationProp<ProfileStackParamList>;

/** «Cardiología», «Cardiología o Dermatología», «Cardiología, Nutrición o Dermatología». */
function listaO(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} o ${items[items.length - 1]}`;
}

/**
 * Perfil — Nivel 1 ("NavDeslizable.dc.html", sección 5 / 5).
 * Una ficha amable del paciente: el nombre centrado con accesos redondos a
 * Preferencias y Datos personales, su círculo (foto o iniciales, con la
 * cámara para subirla) sobre el arco celeste, el aviso de perfil incompleto
 * (solo mientras falten datos opcionales), el estado de la lista de espera
 * y tres indicadores. Todo sale de los datos del paciente.
 */
export function ProfileHomeScreen() {
  const navigation = useNavigation<Nav>();
  const paciente = usePaciente();
  const { actualizar, cerrarSesion } = useAuth();
  const [pidiendo, setPidiendo] = useState(false);
  const { width } = useWindowDimensions();

  const completo = perfilCompleto(paciente);
  const dias = diasEnEspera(paciente.registradoEnISO);
  const especialidades = paciente.especialidadesInteres;
  const personasAntes = Math.max(0, paciente.puestoEspera - 1);
  const irAPreferencias = () => navigation.navigate("Preferences");

  async function cambiarFoto() {
    const uri = await elegirFotoPerfil();
    if (uri) await actualizar({ fotoUri: uri });
  }

  async function alternarNotificaciones() {
    if (paciente.notificacionesActivas) {
      await actualizar({ notificacionesActivas: false });
      return;
    }
    setPidiendo(true);
    const ok = await pedirPermisoNotificaciones();
    setPidiendo(false);
    if (ok) await actualizar({ notificacionesActivas: true });
    else await abrirAjustes();
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Encabezado sobre el arco celeste */}
        <View style={styles.hero}>
          <View
            pointerEvents="none"
            style={[styles.arco, { width: width * 3, height: width * 3, borderRadius: width * 1.5, left: -width }]}
          />

          <View style={styles.barra}>
            <BotonRedondo icono="settings-outline" etiqueta="Preferencias" onPress={irAPreferencias} />
            <View style={styles.identidad}>
              <Text style={[heading(30, colors.accent900), styles.centrado]} numberOfLines={1}>
                {paciente.nombre} {paciente.apellido}
              </Text>
              <Text style={[body(14, colors.neutral600), styles.centrado]} numberOfLines={1}>
                {paciente.email}
              </Text>
            </View>
            <BotonRedondo
              icono="create-outline"
              etiqueta="Datos personales"
              onPress={() => navigation.navigate("PersonalData")}
            />
          </View>

          <View style={styles.personaje}>
            <AvatarPaciente paciente={paciente} size={132} onPress={cambiarFoto} />
          </View>
        </View>

        <View style={styles.cuerpo}>
          {/* Perfil por completar: desaparece cuando ya no falta nada */}
          {completo < 100 ? (
            <Pressable
              onPress={() => navigation.navigate("PersonalData")}
              accessibilityRole="button"
              accessibilityLabel={`Completa tu perfil para una mejor experiencia. Llevas ${completo} %`}
              style={({ pressed }) => [styles.tarjeta, pressed && styles.presionado]}
            >
              <Text style={body(14, colors.neutral700)}>Completa tu perfil para una mejor experiencia.</Text>
              <View style={styles.separador} />
              <View style={styles.progresoFila}>
                <Ionicons name="person-circle-outline" size={22} color={colors.accent600} />
                <Text style={styles.progresoEtiqueta}>Perfil</Text>
                <View style={styles.pista}>
                  <View style={[styles.relleno, { width: `${completo}%` }]} />
                </View>
                <Text style={heading(18, colors.accent700)}>{completo}%</Text>
              </View>
            </Pressable>
          ) : null}

          {/* Lista de espera */}
          <View style={styles.espera}>
            <View style={styles.esperaFila}>
              <View style={styles.reloj}>
                <Ionicons name="hourglass-outline" size={30} color={colors.accent600} />
              </View>
              <View style={styles.flex}>
                <Text style={heading(21, colors.accent900)}>Esperando tu cupo…</Text>
                <Text style={body(13, colors.neutral700)}>
                  {especialidades.length
                    ? `${personasAntes === 1 ? "Hay 1 persona" : `Hay ${personasAntes} personas`} antes que vos. Te avisamos cuando se libere un cupo de ${listaO(especialidades)}.`
                    : "Sumá una especialidad para entrar en la lista de espera."}
                </Text>
              </View>
            </View>
            <PrimaryButton label="Editar preferencias" onPress={irAPreferencias} />
          </View>

          {/* Indicadores */}
          <Indicador
            icono="calendar-outline"
            valor={`${dias} ${dias === 1 ? "día" : "días"}`}
            etiqueta="En lista de espera"
          />
          <View style={styles.par}>
            <Indicador
              icono="medkit-outline"
              valor={String(especialidades.length)}
              etiqueta="Especialidades en espera"
              onPress={irAPreferencias}
            />
            <Indicador
              icono="time-outline"
              valor={paciente.franjaPreferida}
              etiqueta="Franja preferida"
              onPress={irAPreferencias}
            />
          </View>

          {/* Cuenta */}
          <View style={styles.cuenta}>
            <Pressable
              onPress={alternarNotificaciones}
              accessibilityRole="button"
              accessibilityLabel={`Notificaciones: ${paciente.notificacionesActivas ? "Activadas" : "Desactivadas"}`}
              style={({ pressed }) => [styles.fila, pressed && styles.presionado]}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.accent700} />
              <Text style={[body(15), styles.flex]}>Notificaciones</Text>
              <Text style={body(14, colors.neutral600)}>
                {pidiendo ? "…" : paciente.notificacionesActivas ? "Activadas" : "Desactivadas"}
              </Text>
            </Pressable>
            <Pressable
              onPress={cerrarSesion}
              accessibilityRole="button"
              style={({ pressed }) => [styles.fila, styles.divisor, pressed && styles.presionado]}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.accent700} />
              <Text style={[body(15, colors.accent700), styles.flex]}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BotonRedondo({
  icono,
  etiqueta,
  onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  etiqueta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [styles.redondo, pressed && styles.presionado]}
    >
      <Ionicons name={icono} size={22} color={colors.neutral700} />
    </Pressable>
  );
}

function Indicador({
  icono,
  valor,
  etiqueta,
  onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  valor: string;
  etiqueta: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${etiqueta}: ${valor}`}
      style={({ pressed }) => [styles.indicador, pressed && styles.presionado]}
    >
      <Ionicons name={icono} size={20} color={colors.accent600} style={styles.indicadorIcono} />
      <View style={styles.flex}>
        <Text style={heading(22, colors.accent900)}>{valor}</Text>
        <Text style={body(13, colors.neutral600)} numberOfLines={2}>
          {etiqueta}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
  },
  // Blanco debajo del arco; arriba, el arco (que se extiende hacia arriba)
  // cubre también el rebote del scroll.
  scroll: {
    backgroundColor: colors.superficie,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  centrado: {
    textAlign: "center",
  },
  presionado: {
    opacity: 0.7,
  },
  // Encabezado
  hero: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  // El borde del arco cruza el tercio inferior del círculo, como el personaje
  // de la referencia sobre la curva.
  arco: {
    position: "absolute",
    bottom: 44,
    backgroundColor: colors.fondo,
  },
  barra: {
    flexDirection: "row",
    alignItems: "flex-start",
    alignSelf: "stretch",
    gap: 10,
  },
  identidad: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingTop: 12,
    gap: 2,
  },
  redondo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.superficie,
    alignItems: "center",
    justifyContent: "center",
    ...sombra.sm,
  },
  personaje: {
    marginTop: 26,
  },
  // Cuerpo
  cuerpo: {
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 14,
  },
  tarjeta: {
    padding: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.superficie,
    borderWidth: 1,
    borderColor: colors.borde,
    ...sombra.md,
    shadowOpacity: 0.08,
  },
  separador: {
    height: 1,
    backgroundColor: colors.borde,
    marginVertical: 14,
  },
  progresoFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progresoEtiqueta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.accent700,
  },
  pista: {
    flex: 1,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral200,
    overflow: "hidden",
  },
  relleno: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  espera: {
    marginTop: 6,
    padding: 18,
    gap: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.fondo,
  },
  esperaFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  reloj: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.accent200,
    backgroundColor: colors.superficie,
    alignItems: "center",
    justifyContent: "center",
  },
  par: {
    flexDirection: "row",
    gap: 12,
  },
  indicador: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borde,
    backgroundColor: colors.superficie,
  },
  indicadorIcono: {
    marginTop: 3,
  },
  cuenta: {
    marginTop: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borde,
    overflow: "hidden",
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  divisor: {
    borderTopWidth: 1,
    borderTopColor: colors.borde,
  },
});
