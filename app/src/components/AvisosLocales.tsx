import React, { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";
import { HojaInferior } from "@/components/HojaInferior";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth, usePaciente } from "@/auth/AuthContext";
import { useT } from "@/i18n";
import {
  configurarNotificaciones,
  DestinoAviso,
  escucharRespuestas,
  estadoPermisoNotificaciones,
} from "@/services/notificacionesLocales";
import { pedirPermisoNotificaciones } from "@/services/permisosService";

/** Si el paciente responde «Ahora no», no se vuelve a preguntar durante este tiempo. */
const KEY_POSPUESTO = "ts.permisoAvisosPospuesto";
const POSPONER_MS = 3 * 86_400_000;

/**
 * Avisos locales del paciente (montado junto con las pestañas, solo con
 * sesión de paciente):
 *   · si el paciente tiene las alertas activadas en la app pero el sistema
 *     todavía no dio el permiso (p. ej. otra instalación), lo pide con una
 *     explicación antes del diálogo del sistema; quien apagó las alertas no
 *     recibe insistencias;
 *   · al tocar una notificación (o uno de sus botones) abre la oferta o la cita.
 * Los avisos en sí los dispara TabNavigator con cada fila nueva de Realtime.
 */
export function AvisosLocales() {
  const t = useT();
  const paciente = usePaciente();
  const { actualizar } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [explicar, setExplicar] = useState(false);
  const quiereAlertas = paciente.notificacionesActivas;

  useEffect(() => {
    let vigente = true;
    (async () => {
      await configurarNotificaciones();
      if (!quiereAlertas || (await estadoPermisoNotificaciones()) !== "preguntar") return;
      let pospuesto = 0;
      try {
        pospuesto = Number((await AsyncStorage.getItem(KEY_POSPUESTO)) ?? 0);
      } catch {
        pospuesto = 0;
      }
      if (vigente && Date.now() - pospuesto > POSPONER_MS) setExplicar(true);
    })();
    return () => {
      vigente = false;
    };
  }, [quiereAlertas]);

  const abrir = useCallback(
    (destino: DestinoAviso) => {
      if (destino.destino === "oferta") {
        navigation.navigate("OfferDetail", { ofertaId: destino.ofertaId });
        return;
      }
      navigation.navigate("Tabs", {
        screen: "MisCitas",
        params: { screen: "AppointmentDetail", params: { citaId: destino.citaId, accion: destino.accion }, initial: false },
      });
    },
    [navigation]
  );

  useEffect(() => escucharRespuestas(abrir), [abrir]);

  async function activar() {
    setExplicar(false);
    const concedido = await pedirPermisoNotificaciones();
    // Sin permiso, la app deja de contar al paciente como «con alertas» (factor de disponibilidad).
    if (!concedido) await actualizar({ notificacionesActivas: false }).catch(() => {});
  }

  function posponer() {
    setExplicar(false);
    AsyncStorage.setItem(KEY_POSPUESTO, String(Date.now())).catch(() => {});
  }

  if (!explicar) return null;
  return (
    <HojaInferior
      visible
      onCerrar={posponer}
      titulo={t("avisosLocales.permisoTitulo")}
      descripcion={t("avisosLocales.permisoTexto")}
    >
      <PrimaryButton label={t("avisosLocales.permisoActivar")} onPress={activar} />
      <PrimaryButton label={t("avisosLocales.permisoAhoraNo")} variant="secondary" onPress={posponer} />
    </HojaInferior>
  );
}
