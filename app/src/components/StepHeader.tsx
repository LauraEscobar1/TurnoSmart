import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { sombra } from "@/theme/spacing";
import { label } from "@/theme/typography";
import { useT } from "@/i18n";

interface StepHeaderProps {
  title: string;
  step: number;
  total: number;
  onBack: () => void;
}

/** Barra de «Crear cuenta»: flecha, título en versalitas y «1 / 3» a la derecha. */
export function StepHeader({ title, step, total, onBack }: StepHeaderProps) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  return (
    <View style={styles.bar}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityLabel={t("comun.volver")} style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={colors.text} />
      </Pressable>
      <Text style={label(11, colors.text)}>{title}</Text>
      <Text style={[label(10, colors.neutral600), styles.count]}>
        {step} / {total}
      </Text>
    </View>
  );
}

/** Solo la flecha de volver, sin título ni regla (acceso: login, restablecer). */
export function BackBar({ onBack }: { onBack: () => void }) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  return (
    <View style={styles.backBar}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityLabel={t("comun.volver")} style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

/** Barras de progreso de 3 px: completas en acero, pendientes en neutro 300. */
export function StepProgress({ step, total }: { step: number; total: number }) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  return (
    <View style={styles.progress} accessibilityLabel={t("registro.pasoDe", { paso: step, total })}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: i < step ? colors.accent : colors.accent200 }]} />
      ))}
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  backBar: {
    paddingTop: 10,
    paddingHorizontal: 18,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.superficie,
    borderWidth: 1,
    borderColor: colors.borde,
    alignItems: "center",
    justifyContent: "center",
    ...sombra.sm,
  },
  count: {
    marginLeft: "auto",
    letterSpacing: 1,
  },
  progress: {
    flexDirection: "row",
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
});
