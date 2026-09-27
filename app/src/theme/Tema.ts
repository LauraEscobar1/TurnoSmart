import { useAjustes } from "@/ajustes/AjustesContext";
import { Paleta, paletaClara, paletaOscura } from "@/theme/colors";

/** Paleta activa según Ajustes › Modo oscuro. */
export function useTema(): { oscuro: boolean; colors: Paleta } {
  const { modoOscuro } = useAjustes();
  return { oscuro: modoOscuro, colors: modoOscuro ? paletaOscura : paletaClara };
}

const cache = new WeakMap<(c: Paleta) => unknown, Map<Paleta, unknown>>();

/**
 * Estilos que dependen de la paleta. `crear` se llama una sola vez por
 * paleta (clara u oscura) y el resultado se reutiliza en cada render.
 */
export function useEstilos<T>(crear: (c: Paleta) => T): T {
  const { colors } = useTema();
  let porPaleta = cache.get(crear);
  if (!porPaleta) {
    porPaleta = new Map();
    cache.set(crear, porPaleta);
  }
  if (!porPaleta.has(colors)) porPaleta.set(colors, crear(colors));
  return porPaleta.get(colors) as T;
}
