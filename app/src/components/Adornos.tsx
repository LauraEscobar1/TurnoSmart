import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { heading, label } from "@/theme/typography";

/** El asistente de IA: un robot (reemplaza a las estrellitas en toda la app). */
export const ICONO_IA = "robot-happy-outline" as const;

/**
 * Ícono metalizado: el color de ícono del modo con un brillo claro debajo,
 * que le da relieve de metal pulido. `ia` dibuja el robot del asistente.
 */
export function IconoMetal({
  nombre,
  ia = false,
  tamano,
  color,
}: {
  nombre?: keyof typeof Ionicons.glyphMap;
  ia?: boolean;
  tamano: number;
  /** Por defecto, el único color de ícono del modo. */
  color?: string;
}) {
  const { colors } = useTema();
  const relieve = {
    textShadowColor: colors.brilloIcono,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0.5,
  };
  const c = color ?? colors.icono;
  return ia ? (
    <MaterialCommunityIcons name={ICONO_IA} size={tamano} color={c} style={relieve} />
  ) : (
    <Ionicons name={nombre ?? "ellipse-outline"} size={tamano} color={c} style={relieve} />
  );
}

/**
 * Ícono dentro de un círculo metalizado (degradado plata con brillo arriba),
 * igual en los dos modos. Una sola capa: sin borde.
 */
export function IconoCirculo({
  nombre,
  ia = false,
  tamano = 38,
  tamanoIcono = Math.round(tamano * 0.47),
  style,
}: {
  nombre?: keyof typeof Ionicons.glyphMap;
  ia?: boolean;
  tamano?: number;
  tamanoIcono?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  return (
    <LinearGradient
      colors={colors.metalCirculo}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.circulo, { width: tamano, height: tamano, borderRadius: tamano / 2 }, style]}
    >
      <IconoMetal nombre={nombre} ia={ia} tamano={tamanoIcono} />
    </LinearGradient>
  );
}

/**
 * Título de sección con una barra de acento a la izquierda (decorativa).
 * grande: títulos de Inicio sobre el fondo; etiqueta: versalitas chicas.
 */
export function TituloSeccion({
  titulo,
  variante = "etiqueta",
  accion,
}: {
  titulo: string;
  variante?: "grande" | "etiqueta";
  /** Enlace o acción discreta a la derecha. */
  accion?: React.ReactNode;
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const grande = variante === "grande";
  return (
    <View style={styles.titulo}>
      <View style={[styles.barra, grande ? styles.barraGrande : styles.barraEtiqueta]} />
      <Text
        style={[grande ? heading(18, colors.textoSobreFondo) : label(10, colors.textoTenueSobreFondo), styles.flex]}
        accessibilityRole="header"
      >
        {titulo}
      </Text>
      {accion}
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    circulo: {
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    titulo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    barra: {
      width: 4,
      borderRadius: 2,
      backgroundColor: colors.acentoSeccion,
    },
    barraGrande: {
      height: 18,
    },
    barraEtiqueta: {
      height: 12,
    },
    flex: {
      flex: 1,
    },
  });
