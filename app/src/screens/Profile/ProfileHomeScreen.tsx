import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, heading } from "@/theme/typography";
import { ProfileStackParamList } from "@/navigation/types";
import { useAuth, usePaciente } from "@/auth/AuthContext";
import { abrirAjustes, pedirPermisoNotificaciones } from "@/services/permisosService";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Card } from "@/components/Card";

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
        <Card
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
          <Ionicons name="chevron-forward" size={18} color={colors.neutral600} />
        </Card>

        <Card style={styles.list}>
          {filas.map((f, i) => (
            <Pressable
              key={f.label}
              onPress={f.onPress}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.pressed]}
            >
              <Text style={body(14, f.label === "Cerrar sesión" ? colors.accent700 : colors.text)}>{f.label}</Text>
              <Text style={body(14, colors.neutral600)}>{f.valor}</Text>
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
  },
  content: {
    padding: 18,
    gap: 14,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent100,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borde,
  },
  pressed: {
    backgroundColor: colors.accent100,
  },
});
