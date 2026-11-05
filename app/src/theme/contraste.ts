/**
 * Contraste WCAG 2.x entre colores del tema. Acepta "#rgb", "#rrggbb" y
 * "rgba(r,g,b,a)". Los colores translúcidos se componen sobre el fondo
 * para obtener el color efectivo antes de medir.
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parsear(color: string): Rgba {
  const c = color.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (x) => x + x) : hex[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(c);
  if (rgba) {
    return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] === undefined ? 1 : +rgba[4] };
  }
  throw new Error(`Color no reconocido: ${color}`);
}

/** `arriba` (con su alfa, multiplicado por `opacidad`) pintado sobre `abajo`, que se toma opaco. */
export function componer(arriba: string, abajo: string, opacidad = 1): string {
  const t = parsear(arriba);
  const f = parsear(abajo);
  const a = t.a * opacidad;
  const mezcla = (x: number, y: number) => Math.round(x * a + y * (1 - a));
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(mezcla(t.r, f.r))}${hex(mezcla(t.g, f.g))}${hex(mezcla(t.b, f.b))}`;
}

export function luminancia(color: string): number {
  const { r, g, b } = parsear(color);
  const lineal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

/** Relación de contraste entre dos colores opacos (1 a 21). */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Mínimos WCAG AA. */
export const MINIMO_AA = {
  /** Texto normal. */
  texto: 4.5,
  /** Texto grande (≥ 24 px, o ≥ 18,66 px en negrita). */
  grande: 3,
  /** Íconos y componentes de interfaz (1.4.11). */
  icono: 3,
} as const;
