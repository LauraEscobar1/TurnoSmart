import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { heading, label } from "@/theme/typography";

/**
 * Ícono dentro de un círculo de vidrio: tinte suave, borde y un brillo en la
 * mitad superior. El ícono usa el único token de ícono del modo.
 */
export function IconoCirculo({
  nombre,
  tamano = 38,
  tamanoIcono = Math.round(tamano * 0.47),
  style,
}: {
  nombre: keyof typeof Ionicons.glyphMap;
  tamano?: number;
  tamanoIcono?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const forma = { width: tamano, height: tamano, borderRadius: tamano / 2 };
  return (
    <View style={[styles.circulo, forma, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={[colors.brilloCirculoIcono, "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={[StyleSheet.absoluteFill, { borderRadius: tamano / 2 }]}
      />
      <Ionicons name={nombre} size={tamanoIcono} color={colors.icono} />
    </View>
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
      backgroundColor: colors.circuloIcono,
      borderWidth: 1,
      borderColor: colors.bordeCirculoIcono,
      borderTopColor: colors.bordeSuperiorCard,
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
