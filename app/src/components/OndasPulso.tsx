import React from "react";
import Svg, { Path } from "react-native-svg";

interface OndasPulsoProps {
  width: number;
  height: number;
  /** Color de las líneas de pulso. */
  color: string;
  /** Color de la zona que queda debajo de la curva (el resto de la pantalla). */
  colorCurva: string;
}

const LINEAS = 13;
const PASO = 6;
/**
 * La zona clara se dibuja unos píxeles más allá del borde inferior: el
 * contenedor la recorta, y así ninguna fila a medio pintar deja ver el azul
 * de fondo entre la curva y el resto de la pantalla.
 */
const SOLAPE = 4;

/** Línea ondulada con un pulso (trazo de electrocardiograma) en `xPulso`. */
function linea(width: number, y0: number, fase: number, xPulso: number): string {
  const amplitud = 5;
  const puntos: string[] = [];
  for (let x = 0; x <= width; x += PASO) {
    const d = x - xPulso;
    let y = y0 + amplitud * Math.sin((x / width) * Math.PI * 2.2 + fase);
    // Pulso: subida corta, pico, caída por debajo de la línea y vuelta.
    if (d >= 0 && d < 6) y -= 4 * (d / 6);
    else if (d >= 6 && d < 12) y += -4 - 18 * ((d - 6) / 6);
    else if (d >= 12 && d < 18) y += -22 + 34 * ((d - 12) / 6);
    else if (d >= 18 && d < 24) y += 12 - 12 * ((d - 18) / 6);
    puntos.push(`${x === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return puntos.join(" ");
}

/**
 * Bienvenida: líneas de pulso (en el color exacto que se pide, sin opacidad) y, abajo, la curva
 * que da paso a la zona clara del texto.
 */
export function OndasPulso({ width, height, color, colorCurva }: OndasPulsoProps) {
  if (width <= 0 || height <= 0) return null;
  const separacion = height / (LINEAS + 1);
  const lineas = Array.from({ length: LINEAS }, (_, i) => {
    // Pulsos repartidos sin alinearse en columna.
    const xPulso = width * (0.12 + ((i * 0.37) % 0.76));
    return linea(width, separacion * (i + 0.6), i * 0.9, xPulso);
  });
  // La zona clara sube desde abajo con una curva suave (más alta a la derecha).
  const abajo = height + SOLAPE;
  const curva =
    `M0,${abajo} L0,${(height * 0.86).toFixed(1)} ` +
    `C${(width * 0.35).toFixed(1)},${(height * 0.8).toFixed(1)} ${(width * 0.55).toFixed(1)},${(height * 0.98).toFixed(1)} ` +
    `${width},${(height * 0.72).toFixed(1)} L${width},${abajo} Z`;

  return (
    <Svg width={width} height={abajo} style={{ position: "absolute", top: 0, left: 0 }} pointerEvents="none">
      {lineas.map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={1.3} fill="none" strokeLinejoin="round" />
      ))}
      <Path d={curva} fill={colorCurva} />
    </Svg>
  );
}
