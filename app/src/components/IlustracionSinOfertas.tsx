import React from "react";
import Svg, { Circle, G, Path } from "react-native-svg";
import { colors } from "@/theme/colors";
import { LOGO_TRAZOS, LOGO_VIEWBOX } from "@/components/Logo";

/**
 * Estado vacío de Ofertas: el isotipo de TurnoSmart (estetoscopio con
 * latido) en el centro de ondas concéntricas, como un radar que sigue
 * buscando cupos. Minimalista y en la paleta de la app.
 */
export function IlustracionSinOfertas({ size = 150 }: { size?: number }) {
  const t = LOGO_TRAZOS;
  const { x, y, w, h } = LOGO_VIEWBOX;
  // Isotipo de 44 de alto centrado en (100, 80).
  const escala = 44 / h;
  const dx = 100 - (x + w / 2) * escala;
  const dy = 80 - (y + h / 2) * escala;

  return (
    <Svg width={size} height={(size * 160) / 200} viewBox="0 0 200 160" accessibilityLabel="Buscando cupos">
      <Circle cx={100} cy={80} r={76} fill={colors.accent100} />
      <Circle cx={100} cy={80} r={58} fill={colors.accent200} opacity={0.6} />
      <Circle cx={100} cy={80} r={76} fill="none" stroke={colors.accent300} strokeWidth={1.2} strokeDasharray="3 6" />
      <Circle cx={100} cy={80} r={38} fill="#ffffff" />
      {/* Puntos en órbita: cupos que el radar todavía no encontró */}
      <Circle cx={160} cy={42} r={5} fill={colors.accent} />
      <Circle cx={42} cy={112} r={3.5} fill={colors.accent300} />
      <Circle cx={150} cy={130} r={3} fill={colors.accent300} />
      <G transform={`translate(${dx} ${dy}) scale(${escala})`}>
        <Path d={t.olivas} stroke={colors.accent900} strokeWidth={t.grosor} strokeLinecap="round" fill="none" />
        <Path d={t.tubo} stroke={colors.accent900} strokeWidth={t.grosor} strokeLinecap="round" fill="none" />
        <Path
          d={t.latido}
          stroke={colors.accent}
          strokeWidth={t.grosor}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle
          cx={t.campana.cx}
          cy={t.campana.cy}
          r={t.campana.r}
          stroke={colors.accent900}
          strokeWidth={t.grosor}
          fill="none"
        />
      </G>
    </Svg>
  );
}
