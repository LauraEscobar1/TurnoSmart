import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/theme/colors";
import { label } from "@/theme/typography";
import { useT } from "@/i18n";
import { Logo } from "@/components/Logo";

/**
 * Splash: azul profundo (el final del degradado) con la marca en Merino y
 * el latido en Rock Blue. Es estático a propósito: el único elemento animado
 * del sistema es el contador de expiración. Continúa sin corte el splash
 * nativo, que usa el mismo color de fondo (app.json).
 */
export function SplashScreen() {
  const t = useT();
  return (
    <View style={styles.field} accessibilityLabel={t("splash.cargando")}>
      <StatusBar style="light" />
      <Logo size={84} color={colors.splashLogo} acento={colors.splashAcento} wordmark />
      <Text style={[label(10, colors.splashTexto), styles.bajada]}>{t("splash.bajada")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    backgroundColor: colors.splashFondo,
    alignItems: "center",
    justifyContent: "center",
  },
  bajada: {
    position: "absolute",
    bottom: 56,
  },
});
