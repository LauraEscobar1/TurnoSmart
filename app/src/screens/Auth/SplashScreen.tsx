import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/theme/colors";
import { label } from "@/theme/typography";
import { Logo } from "@/components/Logo";

/**
 * Splash: campo sólido (Campo, acero 900) con la marca en papel. Es
 * estático a propósito: el único elemento animado del sistema es el
 * contador de expiración. Continúa sin corte el splash nativo, que usa
 * el mismo color de fondo (app.json).
 */
export function SplashScreen() {
  return (
    <View style={styles.field} accessibilityLabel="TurnoSmart, cargando">
      <StatusBar style="light" />
      <Logo size={88} color={colors.bg} wordmark />
      <Text style={[label(10, colors.bg), styles.bajada]}>Cupos médicos de último minuto</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    backgroundColor: colors.accent900,
    alignItems: "center",
    justifyContent: "center",
  },
  bajada: {
    position: "absolute",
    bottom: 56,
    opacity: 0.65,
  },
});
