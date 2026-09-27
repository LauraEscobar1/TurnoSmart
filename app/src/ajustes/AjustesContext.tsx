import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Ajustes, getAjustes, guardarAjustes, Idioma } from "@/services/ajustesService";
import { setIdiomaActual } from "@/i18n";

interface AjustesValue extends Ajustes {
  cambiar: (cambios: Partial<Ajustes>) => void;
}

const POR_DEFECTO: Ajustes = { modoOscuro: false, idioma: "es" };

export const AjustesContext = createContext<AjustesValue>({ ...POR_DEFECTO, cambiar: () => {} });

/**
 * Ajustes globales de la app (menú ☰ de Inicio). El idioma elegido se
 * aplica a toda la app al instante y se guarda en el teléfono.
 */
export function AjustesProvider({ children }: { children: React.ReactNode }) {
  const [ajustes, setAjustes] = useState<Ajustes>(POR_DEFECTO);

  useEffect(() => {
    getAjustes()
      .then((guardados) => {
        setIdiomaActual(guardados.idioma);
        setAjustes(guardados);
      })
      .catch(() => {});
  }, []);

  const cambiar = useCallback((cambios: Partial<Ajustes>) => {
    setAjustes((actuales) => {
      const nuevos = { ...actuales, ...cambios };
      setIdiomaActual(nuevos.idioma);
      guardarAjustes(nuevos).catch(() => {});
      return nuevos;
    });
  }, []);

  const value = useMemo(() => ({ ...ajustes, cambiar }), [ajustes, cambiar]);
  return <AjustesContext.Provider value={value}>{children}</AjustesContext.Provider>;
}

export function useAjustes() {
  return useContext(AjustesContext);
}

export type { Idioma };
