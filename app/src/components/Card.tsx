import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Paleta } from "@/theme/colors";
import { useEstilos } from "@/theme/Tema";
import { radius } from "@/theme/spacing";
import { CapaVidrio } from "@/components/Vidrio";
import { Presionable } from "@/components/Presionable";

interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * superficie: vidrio crema (claro) o Venice translúcido (oscuro), por defecto.
   * acento: vidrio con tinte Rock Blue, para lo que tiene un reloj corriendo (oferta).
   * plana: el mismo vidrio sin sombra (ayuda, filas secundarias). Nunca
   *        transparente: el texto de las cards es oscuro y no se lee sobre
   *        el degradado.
   */
  tono?: "superficie" | "acento" | "plana";
  /** Card principal de la pantalla: sombra algo más amplia. */
  destacada?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityRole?: "button";
  accessibilityLabel?: string;
}

/**
 * Card de TurnoSmart: una sola capa de vidrio translúcido con radio 20 y
 * una sombra suave y difusa, sin borde ni marco. Al tocarla se achica
 * apenas y da un toque háptico.
 */
export function Card({
  children,
  style,
  tono = "superficie",
  destacada = false,
  onPress,
  disabled,
  accessibilityRole,
  accessibilityLabel,
}: CardProps) {
  const styles = useEstilos(crearStyles);
  const cardStyle = [styles.base, styles[tono], destacada && styles.destacada, style];
  const vidrio = <CapaVidrio variante={tono === "acento" ? "acento" : "card"} radio={radius.card} />;

  if (onPress) {
    return (
      <Presionable
        onPress={onPress}
        disabled={disabled}
        escala={0.98}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={disabled ? { disabled } : undefined}
        style={cardStyle}
      >
        {vidrio}
        {children}
      </Presionable>
    );
  }

  return (
    <View style={cardStyle} accessible={accessibilityLabel ? true : undefined} accessibilityLabel={accessibilityLabel}>
      {vidrio}
      {children}
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    // Una sola capa: el vidrio y, como mucho, una sombra suave y difusa. Sin borde visible.
    base: {
      borderRadius: radius.card,
      shadowColor: colors.sombraCard,
      shadowOpacity: colors.opacidadSombraCard,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    superficie: {},
    acento: {},
    destacada: {
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    plana: {
      shadowOpacity: 0,
    },
  });
