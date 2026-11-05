import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { IconoMetal } from "@/components/Adornos";
import { useT } from "@/i18n";

/**
 * Estado vacío de Ofertas: el asistente de IA (Jarvis, un robot
 * metalizado) en el centro de ondas concéntricas, como un radar que sigue
 * buscando cupos. Minimalista y en la paleta de la app.
 */
export function IlustracionSinOfertas({ size = 150 }: { size?: number }) {
  const { colors } = useTema();
  const tr = useT();
  const alto = (size * 160) / 200;
  const robot = Math.round(size * 0.3);
  return (
    <View style={{ width: size, height: alto }}>
      <Svg width={size} height={alto} viewBox="0 0 200 160" accessibilityLabel={tr("ofertas.buscandoCupos")}>
        <Circle cx={100} cy={80} r={76} fill={colors.accent100} />
        <Circle cx={100} cy={80} r={58} fill={colors.accent200} opacity={0.6} />
        <Circle cx={100} cy={80} r={76} fill="none" stroke={colors.accent300} strokeWidth={1.2} strokeDasharray="3 6" />
        <Circle cx={100} cy={80} r={38} fill={colors.superficie} />
        {/* Puntos en órbita: cupos que el radar todavía no encontró */}
        <Circle cx={160} cy={42} r={5} fill={colors.accent} />
        <Circle cx={42} cy={112} r={3.5} fill={colors.accent300} />
        <Circle cx={150} cy={130} r={3} fill={colors.accent300} />
      </Svg>
      {/* El asistente de IA (Jarvis) en el centro del radar, metalizado. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, estilos.centro]}>
        <IconoMetal ia tamano={robot} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  // Centro del radar: (100, 80) de un lienzo de 200 × 160.
  centro: {
    alignItems: "center",
    justifyContent: "center",
  },
});
