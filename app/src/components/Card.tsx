import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Paleta } from "@/theme/colors";
import { useEstilos } from "@/theme/Tema";
import { radius } from "@/theme/spacing";
import { CapaVidrio } from "@/components/Vidrio";

interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * superficie: vidrio crema (claro) o Venice translúcido (oscuro), por defecto.
   * acento: vidrio con tinte Rock Blue, para lo que tiene un reloj corriendo (oferta).
   * plana: el mismo vidrio sin tinte de acento, con el borde más marcado
   *        (ayuda, filas secundarias). Nunca transparente: el texto de las
   *        cards es oscuro en claro y no se lee sobre el degradado.
   */
  tono?: "superficie" | "acento" | "plana";
  onPress?: () => void;
  disabled?: boolean;
  accessibilityRole?: "button";
  accessibilityLabel?: string;
}

/**
 * Card de vidrio de TurnoSmart: radio 20, borde sutil y, detrás del
 * contenido, el desenfoque del degradado con el color translúcido encima.
 */
export function Card({
  children,
  style,
  tono = "superficie",
  onPress,
  disabled,
  accessibilityRole,
  accessibilityLabel,
}: CardProps) {
  const styles = useEstilos(crearStyles);
  const cardStyle = [styles.base, styles[tono], style];
  const vidrio = <CapaVidrio variante={tono === "acento" ? "acento" : "card"} />;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={disabled ? { disabled } : undefined}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {vidrio}
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle}>
      {vidrio}
      {children}
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    base: {
      borderRadius: radius.card,
      borderWidth: 1,
      overflow: "hidden",
    },
    superficie: {
      borderColor: colors.bordeCard,
    },
    acento: {
      borderColor: colors.bordeCardAcento,
    },
    plana: {
      borderColor: colors.borde,
    },
    pressed: {
      opacity: 0.9,
    },
  });
