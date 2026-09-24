import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { heading, label } from "@/theme/typography";

interface ScreenHeaderProps {
  title: string;
  /**
   * Con `onBack`, el encabezado es la barra de sub-pantalla del sistema
   * (flecha + título en versalitas, como «Oferta de cupo»).
   * Sin `onBack`, es el título grande de una sección de Nivel 1.
   */
  onBack?: () => void;
  /** Posición en la navegación deslizable: 1–5 (se muestra «2 / 5 · deslizá»). */
  seccion?: number;
}

export function ScreenHeader({ title, onBack, seccion }: ScreenHeaderProps) {
  if (onBack) {
    return (
      <View style={[styles.bar, styles.backBar]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backButton} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={label(11, colors.text)}>{title}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bar, styles.titleBar]}>
      <Text style={heading(24)}>{title}</Text>
      {seccion ? <Text style={label(9)}>{seccion} / 5 · deslizá</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  backBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  backButton: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
