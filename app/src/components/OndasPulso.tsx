import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

interface OndasPulsoProps {
  width: number;
  height: number;
  /** Color de las líneas de pulso (claro: blanco o el tono claro del tema). */
  color: string;
  /** Color de la zona que queda debajo de la loma (el resto de la pantalla). */
  colorCurva: string;
}

/**
 * Cada línea: posición vertical relativa, fase y longitud de la onda,
 * dónde late (1 o 2 latidos, en fracción del ancho), opacidad y grosor.
 * Las `resaltada` van más brillantes y gruesas, y son las que pulsan.
 */
interface Linea {
  fase: number;
  ondas: number;
  latidos: number[];
  opacidad: number;
  grosor: number;
  resaltada?: boolean;
}

const LINEAS: Linea[] = [
  { fase: 0.2, ondas: 1.6, latidos: [0.62], opacidad: 0.3, grosor: 1 },
  { fase: 1.4, ondas: 2.1, latidos: [0.18, 0.78], opacidad: 0.5, grosor: 1.2 },
  { fase: 2.6, ondas: 1.8, latidos: [0.44], opacidad: 0.9, grosor: 2, resaltada: true },
  { fase: 0.9, ondas: 2.4, latidos: [0.84], opacidad: 0.35, grosor: 1 },
  { fase: 3.3, ondas: 1.5, latidos: [0.27, 0.68], opacidad: 0.6, grosor: 1.4 },
  { fase: 1.9, ondas: 2.0, latidos: [0.52], opacidad: 0.25, grosor: 1 },
  { fase: 0.5, ondas: 1.7, latidos: [0.12, 0.72], opacidad: 0.85, grosor: 1.8, resaltada: true },
  { fase: 2.2, ondas: 2.3, latidos: [0.38], opacidad: 0.45, grosor: 1.2 },
  { fase: 4.0, ondas: 1.9, latidos: [0.9], opacidad: 0.3, grosor: 1 },
  { fase: 1.1, ondas: 1.6, latidos: [0.22, 0.58], opacidad: 0.9, grosor: 2, resaltada: true },
  { fase: 2.9, ondas: 2.2, latidos: [0.76], opacidad: 0.4, grosor: 1.2 },
  { fase: 0.7, ondas: 1.8, latidos: [0.33], opacidad: 0.55, grosor: 1.4 },
];

const PASO = 4;
const AMPLITUD = 5;
/** Ancho de un latido (onda P, complejo QRS y onda T). */
const ANCHO_LATIDO = 34;
/** Alto de la loma que da paso a la zona inferior. */
const ALTO_LOMA = 42;
/**
 * La zona inferior se dibuja unos píxeles más allá del borde: el
 * contenedor la recorta, y así ninguna fila a medio pintar deja ver el
 * degradado entre la loma y el resto de la pantalla.
 */
const SOLAPE = 4;

/** Desvío del latido a `d` px de su inicio: P suave, Q, pico R, S y T suave (negativo = hacia arriba). */
function latido(d: number): number {
  if (d < 0 || d >= ANCHO_LATIDO) return 0;
  if (d < 6) return -3 * Math.sin((d / 6) * Math.PI); // onda P
  if (d < 9) return 3 * ((d - 6) / 3); // Q
  if (d < 13) return 3 - 25 * ((d - 9) / 4); // subida R
  if (d < 18) return -22 + 32 * ((d - 13) / 5); // bajada hasta S
  if (d < 21) return 10 - 10 * ((d - 18) / 3); // vuelta
  if (d < 32) return -4 * Math.sin(((d - 21) / 11) * Math.PI); // onda T
  return 0;
}

function trazo(width: number, y0: number, l: Linea): string {
  const inicios = l.latidos.map((f) => f * (width - ANCHO_LATIDO));
  const puntos: string[] = [];
  for (let x = 0; x <= width + PASO; x += PASO) {
    let y = y0 + AMPLITUD * Math.sin((x / width) * Math.PI * 2 * l.ondas + l.fase);
    for (const x0 of inicios) y += latido(x - x0);
    puntos.push(`${x === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return puntos.join(" ");
}

/**
 * Bienvenida: líneas de electrocardiograma a lo ancho del degradado, cada
 * una con uno o dos latidos en posiciones distintas, y abajo una loma
 * suave y redondeada que da paso a la zona del texto. Las líneas
 * resaltadas pulsan apenas (no, si el sistema pide reducir movimiento).
 */
export function OndasPulso({ width, height, color, colorCurva }: OndasPulsoProps) {
  const reducir = useReducedMotion();
  const pulso = useSharedValue(1);

  useEffect(() => {
    if (reducir) {
      pulso.value = 1;
      return;
    }
    pulso.value = withRepeat(withTiming(0.55, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(pulso);
  }, [reducir, pulso]);

  const estiloPulso = useAnimatedStyle(() => ({ opacity: pulso.value }));

  if (width <= 0 || height <= 0) return null;

  // Las líneas ocupan desde bajo el logo hasta la loma (la loma tapa las últimas).
  const arriba = Math.min(96, height * 0.2);
  const separacion = (height - arriba) / LINEAS.length;
  const trazos = LINEAS.map((l, i) => ({ ...l, d: trazo(width, arriba + separacion * (i + 0.5), l) }));

  // Loma convexa amplia: baja en los bordes, cima redondeada algo a la izquierda del centro.
  const abajo = height + SOLAPE;
  const borde = height - 10;
  const control = borde - ALTO_LOMA / 0.75;
  const loma =
    `M0,${abajo} L0,${borde.toFixed(1)} ` +
    `C${(width * 0.3).toFixed(1)},${control.toFixed(1)} ${(width * 0.66).toFixed(1)},${control.toFixed(1)} ` +
    `${width},${borde.toFixed(1)} L${width},${abajo} Z`;

  const capa = (filtro: (l: Linea) => boolean) => (
    <Svg width={width} height={abajo}>
      {trazos.filter(filtro).map((l) => (
        <Path
          key={l.d}
          d={l.d}
          stroke={color}
          strokeOpacity={l.opacidad}
          strokeWidth={l.grosor}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );

  return (
    <View style={{ position: "absolute", top: 0, left: 0, width, height: abajo }} pointerEvents="none">
      <View style={StyleSheet.absoluteFill}>{capa((l) => !l.resaltada)}</View>
      <Animated.View style={[StyleSheet.absoluteFill, estiloPulso]}>{capa((l) => !!l.resaltada)}</Animated.View>
      <Svg width={width} height={abajo} style={StyleSheet.absoluteFill}>
        <Path d={loma} fill={colorCurva} />
      </Svg>
    </View>
  );
}
