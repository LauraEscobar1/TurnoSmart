import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { radius } from "@/theme/spacing";
import { fonts } from "@/theme/typography";

type Tipo = "error" | "exito" | "advertencia" | "info";

const ICONO: Record<Tipo, keyof typeof Ionicons.glyphMap> = {
  error: "alert-circle",
  exito: "checkmark-circle",
  advertencia: "warning",
  info: "information-circle",
};

/**
 * Mensaje de estado sólido (error, éxito…) para usar directamente sobre el
 * degradado: relleno intenso con texto blanco, legible en los dos modos.
 * Sobre el celeste del modo claro ningún rojo o verde de texto llega a AA,
 * por eso el estado va en una píldora y no como texto suelto.
 */
export function AvisoEstado({
  tipo,
  children,
  style,
  accessibilityRole,
}: {
  tipo: Tipo;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: "alert";
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  return (
    <View style={[styles.aviso, styles[tipo], style]} accessibilityLiveRegion="polite">
      <Ionicons name={ICONO[tipo]} size={14} color={colors.sobreEstado} />
      <Text style={styles.texto} accessibilityRole={accessibilityRole}>
        {children}
      </Text>
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    aviso: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: radius.md,
    },
    error: { backgroundColor: colors.errorSolido },
    exito: { backgroundColor: colors.exitoSolido },
    advertencia: { backgroundColor: colors.advertenciaSolido },
    info: { backgroundColor: colors.infoSolido },
    texto: {
      flexShrink: 1,
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      lineHeight: 16,
      color: colors.sobreEstado,
    },
  });
