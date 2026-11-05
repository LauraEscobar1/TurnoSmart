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
   * plana: el mismo vidrio sin tinte de acento, con el borde más marcado
   *        (ayuda, filas secundarias). Nunca transparente: el texto de las
   *        cards es oscuro en claro y no se lee sobre el degradado.
   */
  tono?: "superficie" | "acento" | "plana";
  /** Card principal de la pantalla: sombra más amplia y borde de acento. */
  destacada?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityRole?: "button";
  accessibilityLabel?: string;
}

/**
 * Card de vidrio de TurnoSmart: radio 20, borde superior iluminado e
 * inferior más oscuro (profundidad), sombra suave azulada y, detrás del
 * contenido, el vidrio translúcido con una línea de luz arriba. Al tocarla
 * se achica apenas y da un toque háptico.
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
  const vidrio = <CapaVidrio variante={tono === "acento" ? "acento" : "card"} radio={radius.card} brillo={tono !== "plana"} />;

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
    base: {
      borderRadius: radius.card,
      borderWidth: 1,
      shadowColor: colors.sombraCard,
      shadowOpacity: colors.opacidadSombraCard,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    superficie: {
      borderColor: colors.bordeCard,
      borderTopColor: colors.bordeSuperiorCard,
      borderBottomColor: colors.bordeInferiorCard,
    },
    acento: {
      borderColor: colors.bordeCardAcento,
      borderTopColor: colors.bordeSuperiorCard,
      borderBottomColor: colors.bordeInferiorCard,
    },
    destacada: {
      borderColor: colors.bordeCardAcento,
      borderTopColor: colors.bordeSuperiorCard,
      shadowOpacity: colors.opacidadSombraCard * 1.5,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    plana: {
      borderColor: colors.borde,
      shadowOpacity: 0,
    },
  });
