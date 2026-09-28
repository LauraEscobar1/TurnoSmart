import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { AuthProvider } from "@/auth/AuthContext";
import { AjustesProvider } from "@/ajustes/AjustesContext";
import { setIdiomaActual } from "@/i18n";
import { RootNavigator } from "@/navigation/RootNavigator";
import { citasMock, CUENTA_DEMO, notificacionesMock, ofertasMock } from "@/data/mockData";
import { abrirSesionFalsa, reiniciarSupabaseFalso } from "@/test-utils/supabaseFalso";

/**
 * Utilidades de prueba: los datos mock son mutables (aceptar una oferta los
 * cambia) y la sesión vive en Supabase (falso, en memoria) y AsyncStorage,
 * así que cada prueba arranca de un estado limpio.
 */
const inicial = JSON.stringify({ ofertasMock, citasMock, notificacionesMock });

export async function reiniciarDatos() {
  const copia = JSON.parse(inicial);
  ofertasMock.splice(0, ofertasMock.length, ...copia.ofertasMock);
  citasMock.splice(0, citasMock.length, ...copia.citasMock);
  notificacionesMock.splice(0, notificacionesMock.length, ...copia.notificacionesMock);
  await AsyncStorage.clear();
  reiniciarSupabaseFalso();
  setIdiomaActual("es");
}

/**
 * Monta la app completa. Con `sesion`, entra directo con la cuenta demo.
 * Sin sesión arranca en Bienvenida; con `intro`, como la primera vez.
 */
export async function montarApp({ sesion = true, intro = false } = {}) {
  if (sesion) {
    abrirSesionFalsa(CUENTA_DEMO.email);
    await AsyncStorage.setItem("ts.ultimoUsuario", CUENTA_DEMO.email);
  }
  if (!intro) await AsyncStorage.setItem("ts.introVista", "1");
  return render(
    <AjustesProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </AjustesProvider>
  );
}

/** Desde Bienvenida, abre «Iniciar sesión». */
export async function irALogin() {
  await fireEvent.press(await screen.findByRole("button", { name: "Iniciar sesión" }));
  await screen.findByText("Ingresá a tu cuenta");
}
