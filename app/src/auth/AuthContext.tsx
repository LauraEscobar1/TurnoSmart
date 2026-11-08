import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { Paciente } from "@/types/domain";
import { PerfilStaff } from "@/types/staff";
import * as auth from "@/services/authService";
import * as bio from "@/services/biometriaService";
import { getSupabase, supabaseConfigurado } from "@/services/supabaseClient";

interface AuthValue {
  /** Paciente con sesión abierta; null si hay que mostrar el acceso. */
  paciente: Paciente | null;
  /** Staff de un consultorio con sesión abierta (ve el panel en vez de la app del paciente). */
  staff: PerfilStaff | null;
  /** true mientras se lee la sesión guardada al abrir la app. */
  cargando: boolean;
  /**
   * Ingreso con correo y contraseña. Con `preguntar`, la primera vez que se
   * puede ofrece el ingreso biométrico (una sola vez por dispositivo).
   */
  iniciarSesion: (email: string, password: string, preguntar?: PreguntaBiometria) => Promise<void>;
  /** Ingreso con biometría (lanza BiometriaCancelada / BiometriaError). */
  iniciarSesionBiometrica: () => Promise<void>;
  /** Método de este teléfono (null: sin biometría ni código) y si el ingreso biométrico está activado. */
  biometria: EstadoBiometria;
  /** Activa el ingreso biométrico para la sesión abierta; false si se canceló. */
  activarBiometria: () => Promise<boolean>;
  desactivarBiometria: () => Promise<void>;
  crearCuenta: typeof auth.crearCuenta;
  actualizar: (cambios: Partial<Paciente>) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

/** Pregunta al usuario si quiere ingresar con `metodo` la próxima vez. */
export type PreguntaBiometria = (metodo: bio.MetodoBiometria) => Promise<boolean>;

export interface EstadoBiometria {
  metodo: bio.MetodoBiometria | null;
  activada: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [staff, setStaff] = useState<PerfilStaff | null>(null);
  const [cargando, setCargando] = useState(true);
  const [biometria, setBiometria] = useState<EstadoBiometria>({ metodo: null, activada: false });

  const leerBiometria = useCallback(async () => {
    const estado = { metodo: await bio.metodoDisponible(), activada: await bio.estaActivada() };
    setBiometria(estado);
    return estado;
  }, []);

  /** Abre la sesión según el rol: paciente o staff (nunca los dos). */
  const abrir = useCallback((sesion: auth.SesionApp | null) => {
    setPaciente(sesion?.paciente ?? null);
    setStaff(sesion?.staff ?? null);
  }, []);

  // Al abrir la app: con el ingreso biométrico activado no entra sola, lo
  // pide en Iniciar sesión; si no, retoma la sesión guardada.
  useEffect(() => {
    leerBiometria()
      .then(async ({ activada }) => (activada ? null : abrir(await auth.getSesionApp())))
      .finally(() => setCargando(false));
  }, [abrir, leerBiometria]);

  // Sesión de Supabase: si se cierra o vence (en este u otro lugar), se
  // vuelve al acceso. Los ingresos los resuelve cada acción (login, registro)
  // con el perfil ya armado; la sesión temporal de «restablecer contraseña»
  // no debe abrir la app.
  useEffect(() => {
    if (!supabaseConfigurado) return;
    const supabase = getSupabase();
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === "SIGNED_OUT") abrir(null);
      // Supabase rota el refresh token al renovar: el del ingreso biométrico se actualiza.
      if (evento === "TOKEN_REFRESHED" || evento === "SIGNED_IN") void bio.sincronizar(sesion);
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
    async (email: string, password: string, preguntar?: PreguntaBiometria) => {
      const sesion = await auth.iniciarSesionApp(email, password);
      if (preguntar && (await bio.debePreguntar())) {
        await bio.marcarPreguntado();
        const metodo = await bio.metodoDisponible();
        if (metodo && (await preguntar(metodo))) await bio.activar();
      }
      await leerBiometria();
      abrir(sesion);
    },
    [abrir, leerBiometria]
  );

  const iniciarSesionBiometrica = useCallback(async () => {
    try {
      abrir(await auth.iniciarSesionBiometricaApp());
    } finally {
      // Si el token venció, se borró: el botón deja de mostrarse.
      await leerBiometria();
    }
  }, [abrir, leerBiometria]);

  const activarBiometria = useCallback(async () => {
    const ok = await bio.activar();
    await leerBiometria();
    return ok;
  }, [leerBiometria]);

  const desactivarBiometria = useCallback(async () => {
    await bio.desactivar();
    await leerBiometria();
  }, [leerBiometria]);

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
    await leerBiometria();
    abrir(null);
  }, [abrir, leerBiometria]);

  const value = useMemo(
    () => ({
      paciente,
      staff,
      cargando,
      iniciarSesion,
      iniciarSesionBiometrica,
      biometria,
      activarBiometria,
      desactivarBiometria,
      crearCuenta,
      actualizar,
      cerrarSesion,
    }),
    [
      paciente,
      staff,
      cargando,
      iniciarSesion,
      iniciarSesionBiometrica,
      biometria,
      activarBiometria,
      desactivarBiometria,
      crearCuenta,
      actualizar,
      cerrarSesion,
    ]
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
