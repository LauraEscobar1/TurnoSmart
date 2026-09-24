import React, { createContext, useContext, useMemo, useState } from "react";
import { DatosCuenta, PreferenciasCupo } from "@/services/authService";

/** Borrador del registro, compartido entre los 3 pasos hasta crear la cuenta. */
interface RegistroValue {
  datos: DatosCuenta;
  setDatos: (d: DatosCuenta) => void;
  preferencias: PreferenciasCupo;
  setPreferencias: (p: PreferenciasCupo) => void;
}

const RegistroContext = createContext<RegistroValue | null>(null);

const DATOS_VACIOS: DatosCuenta = { nombre: "", apellido: "", dni: "", email: "", telefono: "", password: "" };
const PREFERENCIAS_INICIALES: PreferenciasCupo = {
  especialidadesInteres: [],
  franjaPreferida: "Indistinto",
  distanciaMaxKm: 10,
  obraSocial: "",
};

export function RegistroProvider({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState(DATOS_VACIOS);
  const [preferencias, setPreferencias] = useState(PREFERENCIAS_INICIALES);
  const value = useMemo(() => ({ datos, setDatos, preferencias, setPreferencias }), [datos, preferencias]);
  return <RegistroContext.Provider value={value}>{children}</RegistroContext.Provider>;
}

export function useRegistro() {
  const ctx = useContext(RegistroContext);
  if (!ctx) throw new Error("useRegistro debe usarse dentro de <RegistroProvider>");
  return ctx;
}
