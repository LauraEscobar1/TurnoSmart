import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { heading } from "@/theme/typography";

interface LogoProps {
  /** Lado de la cruz en px. */
  size?: number;
  /** Color de la cruz y del nombre. */
  color?: string;
  /** Muestra «TurnoSmart» debajo. */
  wordmark?: boolean;
  /** Bajada bajo el nombre (p. ej. «Tu lista de espera, sin esperas»). */
  tagline?: string;
}

/**
 * Marca de TurnoSmart: la cruz médica dibujada con el «+» de registro,
 * la firma del sistema. Esquinas rectas, dos brazos del mismo grosor y
 * un vacío central en el color de fondo, como una marca de plano.
 */
export function Logo({ size = 56, color = colors.accent, wordmark = false, tagline }: LogoProps) {
  const brazo = Math.round(size * 0.34);
  const hueco = Math.max(2, Math.round(size * 0.1));

  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="TurnoSmart">
      <View style={{ width: size, height: size }}>
        <View style={[styles.bar, { backgroundColor: color, width: brazo, height: size, left: (size - brazo) / 2 }]} />
        <View style={[styles.bar, { backgroundColor: color, height: brazo, width: size, top: (size - brazo) / 2 }]} />
        <View
          style={[
            styles.bar,
            {
              width: hueco,
              height: hueco,
              left: (size - hueco) / 2,
              top: (size - hueco) / 2,
              backgroundColor: color === colors.bg ? colors.accent900 : colors.bg,
            },
          ]}
        />
      </View>
      {wordmark ? (
        <Text style={[heading(Math.max(18, Math.round(size * 0.36)), color), styles.name]}>TurnoSmart</Text>
      ) : null}
      {tagline ? <Text style={[styles.tagline, { color }]}>{tagline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
  bar: {
    position: "absolute",
  },
  name: {
    marginTop: 12,
    lineHeight: undefined,
  },
  tagline: {
    marginTop: 4,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    opacity: 0.75,
  },
});
