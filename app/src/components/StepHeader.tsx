import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { label } from "@/theme/typography";

interface StepHeaderProps {
  title: string;
  step: number;
  total: number;
  onBack: () => void;
}

/** Barra de «Crear cuenta»: flecha, título en versalitas y «1 / 3» a la derecha. */
export function StepHeader({ title, step, total, onBack }: StepHeaderProps) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityLabel="Volver" style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={colors.text} />
      </Pressable>
      <Text style={label(11, colors.text)}>{title}</Text>
      <Text style={[label(10), styles.count]}>
        {step} / {total}
      </Text>
    </View>
  );
}

/** Barras de progreso de 3 px: completas en acero, pendientes en neutro 300. */
export function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.progress} accessibilityLabel={`Paso ${step} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: i < step ? colors.accent : colors.neutral300 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  back: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    marginLeft: "auto",
    letterSpacing: 1,
  },
  progress: {
    flexDirection: "row",
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 3,
  },
});
