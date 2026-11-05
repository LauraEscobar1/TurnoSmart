import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { EstrategiaOferta } from "@/types/domain";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { radius } from "@/theme/spacing";
import { body, fonts, heading } from "@/theme/typography";
import { useT } from "@/i18n";
import { Card } from "@/components/Card";

/**
 * Cómo se le cuenta al paciente quién le recomendó un cupo.
 *
 * Regla de honestidad: se menciona la IA SOLO si la estrategia de esa
 * priorización fue "ai" (`ofertas.estrategia`). Con el respaldo
 * determinista se dice «Recomendado por TurnoSmart», sin hablar de IA.
 * Nunca se muestra el score, el riesgo ni datos de otros pacientes.
 */

/**
 * Píldora «Recomendado por IA» (destello) o «Recomendado por TurnoSmart» (check).
 * La de IA lleva un aro en degradado Venice → Light Blue y el texto sobre un
 * relleno propio, así se lee igual sobre cards, sobre el degradado y en los
 * dos modos (ningún color de texto contrasta con las dos puntas del degradado).
 */
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
  if (ia) {
    return (
      <LinearGradient
        colors={colors.degradadoIA}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.aroIA, style]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={t("oferta.recomendacion.iaAccesible")}
      >
        <View style={[styles.insignia, styles.insigniaIA]}>
          <Ionicons name="sparkles" size={12} color={colors.textoInsigniaIA} />
          <Text style={[styles.insigniaTexto, styles.insigniaTextoIA]}>{texto}</Text>
        </View>
      </LinearGradient>
    );
  }
  return (
    <View
      style={[styles.insignia, sobreAcento ? styles.insigniaAcento : styles.insigniaTinte, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={texto}
    >
      <Ionicons name="checkmark-circle-outline" size={12} color={color} />
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
    <Card tono="acento" style={style}>
      <View style={styles.atento} accessible accessibilityLabel={`${titulo}. ${texto}`}>
        <View style={styles.atentoIcono}>
          <Ionicons name="sparkles" size={16} color={colors.sobreAcentoIA} />
        </View>
        <View style={styles.flex}>
          <Text style={heading(16, colors.accent900)}>{titulo}</Text>
          <Text style={body(13, colors.accent800)}>{texto}</Text>
        </View>
      </View>
    </Card>
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
    aroIA: {
      alignSelf: "flex-start",
      padding: 1.5,
      borderRadius: radius.pill,
    },
    insigniaIA: {
      alignSelf: "auto",
      paddingHorizontal: 9,
      paddingVertical: 3,
      backgroundColor: colors.fondoInsigniaIA,
    },
    insigniaTextoIA: {
      fontFamily: fonts.bodyBold,
      color: colors.textoInsigniaIA,
    },
    atento: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: 14,
    },
    atentoIcono: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.acentoIA,
      alignItems: "center",
      justifyContent: "center",
    },
    flex: {
      flex: 1,
      minWidth: 0,
    },
  });
