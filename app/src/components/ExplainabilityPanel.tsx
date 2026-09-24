import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { FactorPrioridad } from "@/types/domain";
import { colors } from "@/theme/colors";
import { body, label } from "@/theme/typography";

interface ExplainabilityPanelProps {
  factores: FactorPrioridad[];
  title?: string;
}

/**
 * Panel de explicabilidad IA. Máximo cuatro factores, ordenados por peso,
 * con el dato concreto a la derecha. Nunca muestra el score numérico:
 * muestra la razón.
 */
export function ExplainabilityPanel({ factores, title = "Por qué te lo ofrecemos" }: ExplainabilityPanelProps) {
  const top = [...factores].sort((a, b) => b.peso - a.peso).slice(0, 4);

  return (
    <View>
      <Text style={[label(10, colors.accent700), styles.title]}>{title}</Text>
      <View style={styles.list}>
        {top.map((f) => (
          <View key={f.etiqueta}>
            <View style={styles.row}>
              <Text style={body(13)}>{f.etiqueta}</Text>
              <Text style={body(13, colors.neutral600)}>{f.valor}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(f.peso * 100)}%` }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 10,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  },
  track: {
    height: 4,
    marginTop: 5,
    backgroundColor: colors.neutral200,
  },
  fill: {
    height: 4,
    backgroundColor: colors.accent,
  },
});
