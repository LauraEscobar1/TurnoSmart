import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Paleta } from "@/theme/colors";
import { useEstilos } from "@/theme/Tema";
import { radius } from "@/theme/spacing";
import { fonts } from "@/theme/typography";

/**
 * Etiqueta de estado de vidrio: el color del estado al ~20 % de fondo,
 * borde del mismo color al 50 % y texto en su tono intenso (AA contra el
 * color efectivo, en los dos modos). Nunca blanca.
 *
 * - exito:       confirmada, aceptada, tomado.
 * - advertencia: expirada, inasistencia.
 * - error:       rechazada, cancelada.
 * - info:        pendiente, ofrecido, reasignada.
 * - neutral:     dato neutro (asistida, recuperado, sin calcular).
 * - outline:     disponible, todavía no compromete a nadie.
 * - accent:      chip sólido ("Oferta para vos").
 * - risk:        hipótesis de la IA (riesgo de inasistencia): advertencia con contorno punteado.
 */
export type BadgeVariant = "exito" | "advertencia" | "error" | "info" | "neutral" | "outline" | "accent" | "risk";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  /** Tacha el texto (estado terminal negativo). */
  tachado?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, variant = "neutral", tachado, style }: BadgeProps) {
  const styles = useEstilos(crearStyles);
  const contenedor = useEstilos(crearContenedor);
  const texto = useEstilos(crearTexto);
  return (
    <View style={[styles.container, contenedor[variant], style]}>
      <Text style={[styles.text, texto[variant], tachado && styles.tachado]}>{label}</Text>
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    container: {
      alignSelf: "flex-start",
      paddingHorizontal: 11,
      paddingVertical: 4,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: "transparent",
    },
    text: {
      fontFamily: fonts.bodyBold,
      fontSize: 11,
      letterSpacing: 0.2,
    },
    tachado: {
      textDecorationLine: "line-through",
    },
  });

const crearContenedor = (colors: Paleta) =>
  StyleSheet.create({
    exito: { backgroundColor: colors.exitoTinte, borderColor: colors.exitoBorde },
    advertencia: { backgroundColor: colors.advertenciaTinte, borderColor: colors.advertenciaBorde },
    error: { backgroundColor: colors.errorTinte, borderColor: colors.errorBorde },
    info: { backgroundColor: colors.infoTinte, borderColor: colors.infoBorde },
    neutral: { backgroundColor: colors.neutralTinte, borderColor: colors.neutralBorde },
    outline: { borderColor: colors.infoBorde },
    accent: { backgroundColor: colors.campo, borderColor: colors.campo },
    risk: { backgroundColor: colors.advertenciaTinte, borderColor: colors.advertenciaBorde, borderStyle: "dashed" },
  });

const crearTexto = (colors: Paleta) =>
  StyleSheet.create({
    exito: { color: colors.exitoTexto },
    advertencia: { color: colors.advertenciaTexto },
    error: { color: colors.errorTexto },
    info: { color: colors.infoTexto },
    neutral: { color: colors.neutralTexto },
    outline: { color: colors.infoTexto },
    accent: { color: colors.sobreCampo },
    risk: { color: colors.advertenciaTexto },
  });
