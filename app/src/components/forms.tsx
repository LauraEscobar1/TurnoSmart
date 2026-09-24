import React, { forwardRef, useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/typography";

/**
 * Controles de formulario del sistema Industry (.field, .input, .seg, .radio):
 * esquinas rectas, borde de un pelo, foco en acero. Sin color de error:
 * la paleta es mono, un error se marca con borde en tinta y el mensaje debajo.
 */

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, style, onFocus, onBlur, ...input },
  ref
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.neutral600}
        selectionColor={colors.accent}
        {...input}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, focused && styles.inputFocused, !!error && styles.inputError]}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

interface SegmentedProps<T> {
  label?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Opciones de igual ancho que llenan la fila (registro, preferencias). */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Control segmentado (.seg): la opción elegida es un relleno de acero. */
export function Segmented<T>({ label, options, value, onChange, fill = true, style }: SegmentedProps<T>) {
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.seg, !fill && styles.segInline]} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o, i) => {
          const checked = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={o.label}
              style={({ pressed }) => [
                styles.segOpt,
                fill && styles.segOptFill,
                i > 0 && styles.segOptDivider,
                checked && styles.segOptChecked,
                pressed && !checked && styles.pressed,
              ]}
            >
              <Text style={[styles.segText, checked && styles.segTextChecked]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface ChipSelectProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

/**
 * Selección múltiple con tags: elegida = campo sólido (acero 900),
 * sin elegir = contorno.
 */
export function ChipSelect({ label, options, value, onChange, error }: ChipSelectProps) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <Pressable
              key={o}
              onPress={() => toggle(o)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o}
              style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
            >
              <Text style={[styles.chipText, { color: on ? colors.bg : colors.accent700 }]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

interface CheckRowProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}

/** Casilla con el punto del sistema (.radio + .dot). */
export function CheckRow({ checked, onChange, children }: CheckRowProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.checkRow}
    >
      <View style={[styles.dot, checked && styles.dotChecked]}>{checked ? <View style={styles.dotInner} /> : null}</View>
      <Text style={styles.checkText}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginBottom: 5,
    color: "rgba(29,31,32,0.7)",
  },
  input: {
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 0,
    // Web: sin el anillo de foco del navegador; el foco es el borde de acero.
    outlineWidth: 0,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  inputError: {
    borderColor: colors.text,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.neutral600,
    marginTop: 4,
  },
  seg: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: "hidden",
  },
  segInline: {
    alignSelf: "flex-start",
  },
  segOpt: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  segOptFill: {
    flex: 1,
  },
  segOptDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
  },
  segOptChecked: {
    backgroundColor: colors.accent,
  },
  pressed: {
    backgroundColor: "rgba(29,31,32,0.07)",
  },
  segText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  segTextChecked: {
    color: colors.bg,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderWidth: 1,
  },
  chipOn: {
    backgroundColor: colors.accent900,
    borderColor: colors.accent900,
  },
  chipOff: {
    borderColor: colors.accent,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  dotChecked: {
    borderColor: colors.accent,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  checkText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
});
