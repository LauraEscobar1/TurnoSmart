import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { Paciente } from "@/types/domain";
import { PerfilStaff } from "@/types/staff";
import * as auth from "@/services/authService";
import { getSupabase, supabaseConfigurado } from "@/services/supabaseClient";

interface AuthValue {
  /** Paciente con sesión abierta; null si hay que mostrar el acceso. */
  paciente: Paciente | null;
  /** Staff de un consultorio con sesión abierta (ve el panel en vez de la app del paciente). */
  staff: PerfilStaff | null;
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
  const [staff, setStaff] = useState<PerfilStaff | null>(null);
  const [cargando, setCargando] = useState(true);

  /** Abre la sesión según el rol: paciente o staff (nunca los dos). */
  const abrir = useCallback((sesion: auth.SesionApp | null) => {
    setPaciente(sesion?.paciente ?? null);
    setStaff(sesion?.staff ?? null);
  }, []);

  useEffect(() => {
    auth
      .getSesionApp()
      .then(abrir)
      .finally(() => setCargando(false));
  }, [abrir]);

  // Sesión de Supabase: si se cierra o vence (en este u otro lugar), se
  // vuelve al acceso. Los ingresos los resuelve cada acción (login, registro)
  // con el perfil ya armado; la sesión temporal de «restablecer contraseña»
  // no debe abrir la app.
  useEffect(() => {
    if (!supabaseConfigurado) return;
    const supabase = getSupabase();
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") abrir(null);
    });
    // Renovación del token solo con la app en primer plano (recomendado en React Native).
    const refresco = AppState.addEventListener("change", (estado) => {
      if (estado === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      data.subscription.unsubscribe();
      refresco.remove();
    };
  }, [abrir]);

  const iniciarSesion = useCallback(
    async (email: string, password: string) => abrir(await auth.iniciarSesionApp(email, password)),
    [abrir]
  );

  const iniciarSesionBiometrica = useCallback(async () => abrir(await auth.iniciarSesionBiometricaApp()), [abrir]);

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
    abrir(null);
  }, [abrir]);

  const value = useMemo(
    () => ({ paciente, staff, cargando, iniciarSesion, iniciarSesionBiometrica, crearCuenta, actualizar, cerrarSesion }),
    [paciente, staff, cargando, iniciarSesion, iniciarSesionBiometrica, crearCuenta, actualizar, cerrarSesion]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

/** Staff con sesión abierta. Solo para el panel del staff. */
export function useStaff(): PerfilStaff {
  const { staff } = useAuth();
  if (!staff) throw new Error("useStaff requiere una sesión de staff");
  return staff;
}

/** Paciente con sesión abierta. Solo para pantallas detrás del acceso. */
export function usePaciente(): Paciente {
  const { paciente } = useAuth();
  if (!paciente) throw new Error("usePaciente requiere una sesión abierta");
  return paciente;
}
