import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, heading, label } from "@/theme/typography";
import { AuthStackParamList } from "@/navigation/types";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";

type Props = NativeStackScreenProps<AuthStackParamList, "Bienvenida">;

/**
 * Bienvenida: la marca arriba y las dos entradas abajo. Crear cuenta es
 * la acción sólida (el registro verifica el teléfono); iniciar sesión es
 * secundaria, en contorno.
 */
export function BienvenidaScreen({ navigation }: Props) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <View style={styles.marca}>
        <Logo size={96} wordmark />
        <Text style={[body(14, colors.neutral700), styles.bajada]}>
          Recuperá cupos médicos que se liberan por cancelación, sin esperar meses.
        </Text>
      </View>

      <View style={styles.acciones}>
        <PrimaryButton label="Crear cuenta con tu teléfono" onPress={() => navigation.navigate("RegistroDatos")} />
        <View style={styles.separador}>
          <View style={styles.regla} />
          <Text style={label(10)}>o</Text>
          <View style={styles.regla} />
        </View>
        <Text style={[body(13, colors.neutral700), styles.center]}>¿Ya tenés cuenta?</Text>
        <PrimaryButton label="Iniciar sesión" variant="secondary" onPress={() => navigation.navigate("Login")} />
        <Text style={[label(9), styles.center, styles.pie]}>
          <Text style={heading(11, colors.neutral600)}>TurnoSmart</Text> · Tus datos de salud están protegidos
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 22,
  },
  marca: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bajada: {
    marginTop: 12,
    textAlign: "center",
    maxWidth: 280,
  },
  acciones: {
    gap: 12,
    paddingBottom: 18,
  },
  separador: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  regla: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  center: {
    textAlign: "center",
  },
  pie: {
    marginTop: 6,
  },
});
