import React, { forwardRef, useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
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
  /** Contraseña con el ojo para mostrarla u ocultarla. */
  revelable?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, style, onFocus, onBlur, revelable, secureTextEntry, ...input },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <View>
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
          secureTextEntry={revelable ? !visible : secureTextEntry}
          style={[
            styles.input,
            revelable && styles.inputConOjo,
            focused && styles.inputFocused,
            !!error && styles.inputError,
          ]}
        />
        {revelable ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            style={styles.ojo}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={18} color={colors.accent700} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
  /**
   * relleno: la opción elegida es un relleno de acero (formularios).
   * pildora: pista celeste y la opción elegida en blanco (pestañas de sección).
   */
  variante?: "relleno" | "pildora";
  style?: StyleProp<ViewStyle>;
}

/** Control segmentado (.seg). */
export function Segmented<T>({
  label,
  options,
  value,
  onChange,
  fill = true,
  variante = "relleno",
  style,
}: SegmentedProps<T>) {
  const pildora = variante === "pildora";
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[styles.seg, pildora && styles.pista, !fill && styles.segInline]}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
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
                pildora && styles.pildora,
                checked && (pildora ? styles.pildoraElegida : styles.segOptChecked),
                pressed && !checked && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.segText,
                  pildora && styles.pildoraTexto,
                  checked && (pildora ? styles.pildoraTextoElegido : styles.segTextChecked),
                ]}
              >
                {o.label}
              </Text>
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
      <View style={[styles.dot, checked && styles.dotChecked]}>
        {checked ? <View style={styles.dotInner} /> : null}
      </View>
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
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.superficie,
    borderWidth: 1,
    borderColor: "rgba(29,45,61,0.16)",
    borderRadius: radius.md,
    // Web: el anillo de foco del navegador va en acero, como pide el sistema
    // (:focus-visible con contorno en acento), no en el azul por defecto.
    outlineColor: colors.accent,
  },
  inputConOjo: {
    paddingRight: 46,
  },
  ojo: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 46,
    alignItems: "center",
    justifyContent: "center",
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
    padding: 3,
    gap: 3,
    borderRadius: radius.md,
    backgroundColor: colors.superficie,
    borderWidth: 1,
    borderColor: "rgba(29,45,61,0.16)",
  },
  segInline: {
    alignSelf: "flex-start",
  },
  segOpt: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.sm + 1,
    alignItems: "center",
    justifyContent: "center",
  },
  segOptFill: {
    flex: 1,
  },
  segOptDivider: {},
  pista: {
    padding: 4,
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.accent100,
    borderColor: colors.accent200,
  },
  pildora: {
    borderRadius: radius.pill,
    paddingVertical: 9,
  },
  pildoraElegida: {
    backgroundColor: colors.superficie,
    shadowColor: colors.accent900,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pildoraTexto: {
    fontFamily: fonts.bodyMedium,
    color: colors.neutral700,
  },
  pildoraTextoElegido: {
    color: colors.accent900,
    fontFamily: fonts.bodyBold,
  },
  segOptChecked: {
    backgroundColor: colors.accent,
  },
  pressed: {
    backgroundColor: colors.accent100,
  },
  segText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  segTextChecked: {
    color: "#ffffff",
    fontFamily: fonts.bodyMedium,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  chipOn: {
    backgroundColor: colors.accent900,
    borderColor: colors.accent900,
  },
  chipOff: {
    backgroundColor: colors.superficie,
    borderColor: colors.accent300,
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
    borderColor: colors.accent300,
    backgroundColor: colors.superficie,
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
