import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, heading } from "@/theme/typography";
import { ProfileStackParamList } from "@/navigation/types";
import { useAuth, usePaciente } from "@/auth/AuthContext";
import { abrirAjustes, pedirPermisoNotificaciones } from "@/services/permisosService";
import { ScreenHeader } from "@/components/ScreenHeader";

type Nav = NativeStackNavigationProp<ProfileStackParamList>;

/**
 * Perfil — Nivel 1 ("NavDeslizable.dc.html", sección 5 / 5).
 * Iniciales, nombre y correo; debajo, filas de un pelo con el dato a la derecha.
 */
export function ProfileHomeScreen() {
  const navigation = useNavigation<Nav>();
  const paciente = usePaciente();
  const { actualizar, cerrarSesion } = useAuth();
  const [pidiendo, setPidiendo] = useState(false);

  // «Martín Ávila» → «MA»: las iniciales van sin tilde, como en el mockup.
  const iniciales = `${paciente.nombre[0] ?? ""}${paciente.apellido[0] ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

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

  const filas = [
    {
      label: "Especialidades en espera",
      valor: String(paciente.especialidadesInteres.length),
      onPress: () => navigation.navigate("Preferences"),
    },
    { label: "Franja preferida", valor: paciente.franjaPreferida, onPress: () => navigation.navigate("Preferences") },
    {
      label: "Notificaciones",
      valor: pidiendo ? "…" : paciente.notificacionesActivas ? "Activadas" : "Desactivadas",
      onPress: alternarNotificaciones,
    },
    { label: "Cerrar sesión", valor: "", onPress: cerrarSesion },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader title="Perfil" seccion={5} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={styles.identity}
          onPress={() => navigation.navigate("PersonalData")}
          accessibilityRole="button"
          accessibilityLabel="Datos personales"
        >
          <View style={styles.avatar}>
            <Text style={heading(20, colors.accent700)}>{iniciales}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={heading(20)}>
              {paciente.nombre} {paciente.apellido}
            </Text>
            <Text style={body(12, colors.neutral700)}>{paciente.email}</Text>
          </View>
        </Pressable>

        <View style={styles.list}>
          {filas.map((f) => (
            <Pressable
              key={f.label}
              onPress={f.onPress}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={body(13)}>{f.label}</Text>
              <Text style={body(13, colors.neutral600)}>{f.valor}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 18,
    gap: 14,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pressed: {
    backgroundColor: "rgba(29,31,32,0.07)",
  },
});
