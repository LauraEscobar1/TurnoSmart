import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "@/theme/colors";
import { body, heading } from "@/theme/typography";
import { mmss } from "@/utils/format";
import { radius } from "@/theme/spacing";

export const LARGO_CODIGO = 6;
const ESPERA_REENVIO = 60;

/**
 * Envía el código al montar y habilita el reenvío pasados 60 s.
 * En desarrollo guarda el código para mostrarlo, porque no hay SMS real.
 */
export function useEnvioCodigo(enviar: () => Promise<string>, { alMontar = true } = {}) {
  const [restante, setRestante] = useState(0);
  const [codigoPrueba, setCodigoPrueba] = useState<string | null>(null);

  const reenviar = useCallback(async () => {
    const c = await enviar();
    if (__DEV__) setCodigoPrueba(c);
    setRestante(ESPERA_REENVIO);
  }, [enviar]);

  useEffect(() => {
    // Al montar (y de nuevo si cambia el destino del código).
    if (alMontar) reenviar();
  }, [alMontar, reenviar]);

  useEffect(() => {
    if (restante <= 0) return;
    const id = setTimeout(() => setRestante((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [restante]);

  return { restante, codigoPrueba, reenviar };
}

/** «Reenviar código en 0:42» y, al llegar a cero, el enlace para reenviar. */
export function ReenviarCodigo({
  restante,
  codigoPrueba,
  onReenviar,
}: {
  restante: number;
  codigoPrueba: string | null;
  onReenviar: () => void;
}) {
  return (
    <View style={styles.reenvio}>
      {restante > 0 ? (
        <Text style={body(12, colors.neutral600)}>Reenviar código en {mmss(restante).replace(/^0/, "")}</Text>
      ) : (
        <Pressable onPress={onReenviar} hitSlop={8} style={{ alignSelf: "flex-start" }}>
          <Text style={body(12, colors.accent700)}>Reenviar código</Text>
        </Pressable>
      )}
      {codigoPrueba ? <Text style={body(12, colors.neutral600)}>Código de prueba: {codigoPrueba}</Text> : null}
    </View>
  );
}

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  testID?: string;
}

/**
 * Código de verificación en 6 casilleros de un pelo; el casillero activo
 * lleva el borde en acero. Por debajo hay un solo campo numérico, así el
 * sistema puede autocompletar el código que llega por SMS.
 */
export function CodeInput({ value, onChange, autoFocus, testID = "codigo-input" }: CodeInputProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={styles.cells}
      accessibilityLabel="Código de verificación"
    >
      {Array.from({ length: LARGO_CODIGO }, (_, i) => (
        <View key={i} style={[styles.cell, i === Math.min(value.length, LARGO_CODIGO - 1) && styles.cellActive]}>
          <Text style={heading(24)}>{value[i] ?? ""}</Text>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        testID={testID}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, LARGO_CODIGO))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={LARGO_CODIGO}
        autoFocus={autoFocus}
        caretHidden
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  reenvio: {
    gap: 6,
  },
  cells: {
    flexDirection: "row",
    gap: 6,
  },
  cell: {
    flex: 1,
    height: 54,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.superficie,
    borderColor: "rgba(29,45,61,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  cellActive: {
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});
