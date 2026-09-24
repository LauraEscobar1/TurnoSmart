import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Paciente } from "@/types/domain";
import * as auth from "@/services/authService";

interface AuthValue {
  /** Paciente con sesión abierta; null si hay que mostrar el acceso. */
  paciente: Paciente | null;
  /** true mientras se lee la sesión guardada al abrir la app. */
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  iniciarSesionBiometrica: () => Promise<void>;
  crearCuenta: typeof auth.crearCuenta;
  actualizar: (cambios: Partial<Paciente>) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    auth
      .getSesion()
      .then(setPaciente)
      .finally(() => setCargando(false));
  }, []);

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    setPaciente(await auth.iniciarSesion(email, password));
  }, []);

  const iniciarSesionBiometrica = useCallback(async () => {
    setPaciente(await auth.iniciarSesionBiometrica());
  }, []);

  const crearCuenta = useCallback<typeof auth.crearCuenta>(async (...args) => {
    const nuevo = await auth.crearCuenta(...args);
    setPaciente(nuevo);
    return nuevo;
  }, []);

  const actualizar = useCallback(
    async (cambios: Partial<Paciente>) => {
      if (!paciente) return;
      setPaciente(await auth.actualizarPaciente(paciente.email, cambios));
    },
    [paciente]
  );

  const cerrarSesion = useCallback(async () => {
    await auth.cerrarSesion();
    setPaciente(null);
  }, []);

  const value = useMemo(
    () => ({ paciente, cargando, iniciarSesion, iniciarSesionBiometrica, crearCuenta, actualizar, cerrarSesion }),
    [paciente, cargando, iniciarSesion, iniciarSesionBiometrica, crearCuenta, actualizar, cerrarSesion]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

/** Paciente con sesión abierta. Solo para pantallas detrás del acceso. */
export function usePaciente(): Paciente {
  const { paciente } = useAuth();
  if (!paciente) throw new Error("usePaciente requiere una sesión abierta");
  return paciente;
}
