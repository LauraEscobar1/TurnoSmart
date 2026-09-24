import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { label } from "@/theme/typography";

interface SubTabsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Sub-pestañas internas de una sección (Próximas/Pasadas, Pendiente/Historial). */
export function SubTabs<T extends string>({ options, value, onChange }: SubTabsProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.item, active && styles.itemActive]}>
            <Text style={label(11, active ? colors.accent700 : colors.neutral600)}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 22,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  item: {
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  itemActive: {
    borderBottomColor: colors.accent700,
  },
});
