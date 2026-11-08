import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
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
 * Cada línea: fase y cantidad de ondas por ancho (entera, para que el
 * dibujo empalme consigo mismo al desplazarse), dónde late (1 o 2 latidos,
 * en fracción del ancho), opacidad y grosor. Las `resaltada` van más
 * brillantes y gruesas, y un destello recorre sus latidos.
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
  { fase: 0.2, ondas: 2, latidos: [0.62], opacidad: 0.3, grosor: 1 },
  { fase: 1.4, ondas: 2, latidos: [0.18, 0.78], opacidad: 0.5, grosor: 1.2 },
  { fase: 2.6, ondas: 2, latidos: [0.44], opacidad: 0.9, grosor: 2, resaltada: true },
  { fase: 0.9, ondas: 3, latidos: [0.84], opacidad: 0.35, grosor: 1 },
  { fase: 3.3, ondas: 1, latidos: [0.27, 0.68], opacidad: 0.6, grosor: 1.4 },
  { fase: 1.9, ondas: 2, latidos: [0.52], opacidad: 0.25, grosor: 1 },
  { fase: 0.5, ondas: 2, latidos: [0.12, 0.72], opacidad: 0.85, grosor: 1.8, resaltada: true },
  { fase: 2.2, ondas: 3, latidos: [0.38], opacidad: 0.45, grosor: 1.2 },
  { fase: 4.0, ondas: 2, latidos: [0.9], opacidad: 0.3, grosor: 1 },
  { fase: 1.1, ondas: 1, latidos: [0.22, 0.58], opacidad: 0.9, grosor: 2, resaltada: true },
  { fase: 2.9, ondas: 2, latidos: [0.76], opacidad: 0.4, grosor: 1.2 },
  { fase: 0.7, ondas: 2, latidos: [0.33], opacidad: 0.55, grosor: 1.4 },
];

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
/** Un ancho de pantalla recorrido, en ms: lento, como un monitor. Las resaltadas, algo más rápido (profundidad). */
const CICLO_FONDO = 18000;
const CICLO_RESALTADAS = 12000;
/** Destello: largo del trazo brillante, cuánto tarda en recorrer el latido y la pausa hasta el siguiente. */
const LARGO_DESTELLO = 22;
const RECORRIDO_MS = 1300;
const PAUSA_MS = 1900;

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

interface Trazo extends Linea {
  /** Recorrido de dos anchos seguidos (el segundo repite el primero). */
  d: string;
  /** Destello: patrón de guiones (uno por latido, se repite cada ancho) y tramo del recorrido a barrer. */
  guiones: number[];
  /** Distancia sobre el trazo donde empieza el primer latido. */
  inicio: number;
  /** Cuánto avanza el destello: desde antes del latido hasta pasado el más largo. */
  barrido: number;
}

/**
 * Línea periódica de período `width`, dibujada a lo largo de dos anchos.
 * Calcula también la distancia recorrida sobre el trazo, para ubicar el
 * destello justo sobre cada latido.
 */
function trazar(width: number, y0: number, l: Linea): Trazo {
  // Paso que divide exacto al ancho: el segundo tramo cae en los mismos puntos que el primero.
  const tramos = Math.max(1, Math.round(width / 4));
  const paso = width / tramos;
  const inicios = l.latidos.map((f) => f * (width - ANCHO_LATIDO));
  const yEn = (x: number) => {
    const xm = x % width;
    let y = y0 + AMPLITUD * Math.sin((xm / width) * Math.PI * 2 * l.ondas + l.fase);
    for (const x0 of inicios) y += latido(xm - x0);
    return y;
  };

  const comandos: string[] = [];
  const recorrido: number[] = []; // distancia acumulada en cada punto
  let anterior: [number, number] | null = null;
  let s = 0;
  for (let i = 0; i <= tramos * 2; i++) {
    const x = i * paso;
    const y = yEn(x);
    if (anterior) s += Math.hypot(x - anterior[0], y - anterior[1]);
    recorrido.push(s);
    comandos.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
    anterior = [x, y];
  }
  const distanciaEn = (x: number) => recorrido[Math.max(0, Math.min(recorrido.length - 1, Math.round(x / paso)))];
  const periodo = recorrido[tramos];
  const margen = 6;
  const tramosLatido = inicios
    .map((x0) => ({ desde: distanciaEn(x0 - margen), hasta: distanciaEn(x0 + ANCHO_LATIDO + margen) }))
    .sort((a, b) => a.desde - b.desde);
  const inicio = tramosLatido[0].desde;
  const largoMax = Math.max(...tramosLatido.map((t) => t.hasta - t.desde));
  // Un guion por latido; los huecos completan el período, así el patrón se repite en el segundo ancho.
  const guiones: number[] = [];
  tramosLatido.forEach((t, i) => {
    const siguiente = i + 1 < tramosLatido.length ? tramosLatido[i + 1].desde : inicio + periodo;
    guiones.push(LARGO_DESTELLO, siguiente - t.desde - LARGO_DESTELLO);
  });
  return { ...l, d: comandos.join(" "), guiones, inicio, barrido: largoMax };
}

const PathAnimado = Animated.createAnimatedComponent(Path);

/** Desplazamiento continuo de derecha a izquierda: recorre un ancho y vuelve a empezar sin corte. */
function useDesplazamiento(width: number, ciclo: number, activo: boolean) {
  const avance = useSharedValue(0);
  useEffect(() => {
    if (!activo || width <= 0) {
      avance.value = 0;
      return;
    }
    avance.value = 0;
    avance.value = withRepeat(withTiming(1, { duration: ciclo, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(avance);
  }, [activo, width, ciclo, avance]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: -avance.value * width }] }));
}

/** Línea resaltada: el trazo y un destello que recorre cada latido (halo difuso + núcleo brillante). */
function LineaResaltada({ trazo, color, retraso, animar }: { trazo: Trazo; color: string; retraso: number; animar: boolean }) {
  const progreso = useSharedValue(0);
  useEffect(() => {
    if (!animar) {
      progreso.value = 0;
      return;
    }
    progreso.value = withDelay(
      retraso,
      withRepeat(
        withSequence(
          withTiming(1, { duration: RECORRIDO_MS, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: PAUSA_MS }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(progreso);
  }, [animar, retraso, progreso]);

  const { inicio, barrido } = trazo;
  const desde = -LARGO_DESTELLO;
  const hasta = barrido;
  const destello = (opacidadMax: number) => () => {
    "worklet";
    const t = desde + progreso.value * (hasta - desde);
    return {
      // El patrón arranca en -offset: el guion queda sobre [inicio + t, inicio + t + largo].
      strokeDashoffset: -(inicio + t),
      strokeOpacity: interpolate(progreso.value, [0, 0.12, 0.85, 1], [0, opacidadMax, opacidadMax, 0]),
    };
  };
  const halo = useAnimatedProps(destello(0.35));
  const nucleo = useAnimatedProps(destello(1));

  const comun = { d: trazo.d, stroke: color, fill: "none", strokeLinejoin: "round", strokeLinecap: "round" } as const;
  return (
    <>
      <Path {...comun} strokeOpacity={trazo.opacidad} strokeWidth={trazo.grosor} />
      {animar ? (
        <>
          <PathAnimado {...comun} strokeWidth={trazo.grosor + 5} strokeDasharray={trazo.guiones} animatedProps={halo} />
          <PathAnimado {...comun} strokeWidth={trazo.grosor + 0.8} strokeDasharray={trazo.guiones} animatedProps={nucleo} />
        </>
      ) : null}
    </>
  );
}

/**
 * Bienvenida: líneas de electrocardiograma a lo ancho del degradado, cada
 * una con uno o dos latidos en posiciones distintas, que avanzan despacio
 * de derecha a izquierda como en un monitor; en las resaltadas, un destello
 * recorre cada latido. Abajo, una loma suave y redondeada da paso a la zona
 * del texto. Con «Reducir movimiento» las líneas quedan quietas.
 */
export function OndasPulso({ width, height, color, colorCurva }: OndasPulsoProps) {
  const reducir = useReducedMotion();
  const animar = !reducir;
  const fondo = useDesplazamiento(width, CICLO_FONDO, animar);
  const resaltadas = useDesplazamiento(width, CICLO_RESALTADAS, animar);

  const trazos = useMemo(() => {
    if (width <= 0 || height <= 0) return [];
    // Las líneas ocupan desde bajo el logo hasta la loma (la loma tapa las últimas).
    const arriba = Math.min(96, height * 0.2);
    const separacion = (height - arriba) / LINEAS.length;
    return LINEAS.map((l, i) => trazar(width, arriba + separacion * (i + 0.5), l));
  }, [width, height]);

  if (width <= 0 || height <= 0) return null;

  // Loma convexa amplia: baja en los bordes, cima redondeada algo a la izquierda del centro.
  const abajo = height + SOLAPE;
  const borde = height - 10;
  const control = borde - ALTO_LOMA / 0.75;
  const loma =
    `M0,${abajo} L0,${borde.toFixed(1)} ` +
    `C${(width * 0.3).toFixed(1)},${control.toFixed(1)} ${(width * 0.66).toFixed(1)},${control.toFixed(1)} ` +
    `${width},${borde.toFixed(1)} L${width},${abajo} Z`;

  const lienzo = { width: width * 2, height: abajo };
  return (
    <View style={{ position: "absolute", top: 0, left: 0, width, height: abajo }} pointerEvents="none">
      <Animated.View style={[styles.capa, lienzo, fondo]}>
        <Svg {...lienzo}>
          {trazos
            .filter((l) => !l.resaltada)
            .map((l) => (
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
      </Animated.View>
      <Animated.View style={[styles.capa, lienzo, resaltadas]}>
        <Svg {...lienzo}>
          {trazos
            .filter((l) => l.resaltada)
            .map((l, i) => (
              <LineaResaltada key={l.d} trazo={l} color={color} retraso={600 + i * 1100} animar={animar} />
            ))}
        </Svg>
      </Animated.View>
      <Svg width={width} height={abajo} style={StyleSheet.absoluteFill}>
        <Path d={loma} fill={colorCurva} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  capa: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
