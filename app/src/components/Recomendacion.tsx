import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EstrategiaOferta } from "@/types/domain";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { radius } from "@/theme/spacing";
import { body, fonts, heading } from "@/theme/typography";
import { useT } from "@/i18n";

/**
 * Cómo se le cuenta al paciente quién le recomendó un cupo.
 *
 * Regla de honestidad: se menciona la IA SOLO si la estrategia de esa
 * priorización fue "ai" (`ofertas.estrategia`). Con el respaldo
 * determinista se dice «Recomendado por TurnoSmart», sin hablar de IA.
 * Nunca se muestra el score, el riesgo ni datos de otros pacientes.
 */

/** Píldora «Recomendado por IA» (destello) o «Recomendado por TurnoSmart» (check). */
export function InsigniaRecomendacion({
  estrategia,
  sobreAcento = false,
  style,
}: {
  estrategia: EstrategiaOferta;
  /** Sobre la tarjeta tintada de Inicio: relleno de acero y texto claro. */
  sobreAcento?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const ia = estrategia === "ai";
  const color = sobreAcento ? colors.sobreAcento : colors.accent800;
  const texto = t(ia ? "oferta.recomendacion.ia" : "oferta.recomendacion.turnoSmart");
  return (
    <View
      style={[styles.insignia, sobreAcento ? styles.insigniaAcento : styles.insigniaTinte, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={ia ? t("oferta.recomendacion.iaAccesible") : texto}
    >
      <Ionicons name={ia ? "sparkles" : "checkmark-circle-outline"} size={12} color={color} />
      <Text style={[styles.insigniaTexto, { color }]}>{texto}</Text>
    </View>
  );
}

/** «Tu asistente TurnoSmart analizó…» (IA) o «TurnoSmart revisó…» (respaldo). */
export function AnalisisRecomendacion({ estrategia, color }: { estrategia: EstrategiaOferta; color?: string }) {
  const { colors } = useTema();
  const t = useT();
  return (
    <Text style={body(13, color ?? colors.neutral700)}>
      {t(estrategia === "ai" ? "oferta.recomendacion.analisisIA" : "oferta.recomendacion.analisisTurnoSmart")}
    </Text>
  );
}

/**
 * «Tu asistente IA está atento»: tarjeta breve para cuando no hay ofertas.
 * Describe cómo funciona el sistema, no una priorización concreta.
 */
export function AsistenteAtento({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const titulo = t("asistenteIA.atentoTitulo");
  const texto = t("asistenteIA.atentoTexto");
  return (
    <View style={[styles.atento, style]} accessible accessibilityLabel={`${titulo}. ${texto}`}>
      <View style={styles.atentoIcono}>
        <Ionicons name="sparkles" size={16} color={colors.sobreAcento} />
      </View>
      <View style={styles.flex}>
        <Text style={heading(16, colors.accent900)}>{titulo}</Text>
        <Text style={body(13, colors.accent800)}>{texto}</Text>
      </View>
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    insignia: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    insigniaTinte: {
      backgroundColor: colors.accent100,
      borderWidth: 1,
      borderColor: colors.accent200,
    },
    insigniaAcento: {
      backgroundColor: colors.accent,
    },
    insigniaTexto: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      letterSpacing: 0.2,
    },
    atento: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: 14,
      borderRadius: radius.lg,
      backgroundColor: colors.fondoCardAcento,
      borderWidth: 1,
      borderColor: colors.bordeCardAcento,
    },
    atentoIcono: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    flex: {
      flex: 1,
      minWidth: 0,
    },
  });
