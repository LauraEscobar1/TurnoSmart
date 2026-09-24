import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { AuthProvider } from "@/auth/AuthContext";
import { RootNavigator } from "@/navigation/RootNavigator";
import { citasMock, CUENTA_DEMO, notificacionesMock, ofertasMock } from "@/data/mockData";

/**
 * Utilidades de prueba: los datos mock son mutables (aceptar una oferta los
 * cambia) y la sesión vive en AsyncStorage, así que cada prueba arranca de
 * un estado limpio.
 */
const inicial = JSON.stringify({ ofertasMock, citasMock, notificacionesMock });

export async function reiniciarDatos() {
  const copia = JSON.parse(inicial);
  ofertasMock.splice(0, ofertasMock.length, ...copia.ofertasMock);
  citasMock.splice(0, citasMock.length, ...copia.citasMock);
  notificacionesMock.splice(0, notificacionesMock.length, ...copia.notificacionesMock);
  await AsyncStorage.clear();
}

/**
 * Monta la app completa. Con `sesion`, entra directo con la cuenta demo.
 * Sin sesión arranca en Bienvenida; con `intro`, como la primera vez.
 */
export async function montarApp({ sesion = true, intro = false } = {}) {
  if (sesion) await AsyncStorage.multiSet([["ts.sesion", CUENTA_DEMO.email], ["ts.ultimoUsuario", CUENTA_DEMO.email]]);
  if (!intro) await AsyncStorage.setItem("ts.introVista", "1");
  return render(
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

/** Desde Bienvenida, abre «Iniciar sesión». */
export async function irALogin() {
  await fireEvent.press(await screen.findByRole("button", { name: "Iniciar sesión" }));
  await screen.findByText("Ingresá a tu cuenta");
}
