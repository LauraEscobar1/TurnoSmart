import React from "react";
import { DefaultTheme, NavigationContainer, Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useTema } from "@/theme/Tema";
import { Paleta } from "@/theme/colors";
import { RootStackParamList } from "@/navigation/types";
import { TabNavigator } from "@/navigation/TabNavigator";
import { OfferDetailScreen } from "@/screens/Offers/OfferDetailScreen";
import { OfferConfirmationScreen } from "@/screens/Offers/OfferConfirmationScreen";
import { AuthNavigator } from "@/navigation/AuthNavigator";
import { BuscarEspecialistaScreen } from "@/screens/Home/BuscarEspecialistaScreen";
import { useAuth } from "@/auth/AuthContext";
import { PanelStaffScreen } from "@/screens/Staff/PanelStaffScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

const temaNavegacion = (colors: Paleta, oscuro: boolean): Theme => ({
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.fondoPantalla,
    card: colors.superficie,
    text: colors.text,
    border: colors.divider,
    notification: colors.accent,
  },
  dark: oscuro,
});

/**
 * Navegador raíz.
 * "OfferDetail" y "OfferConfirmation" se presentan a pantalla completa
 * porque interrumpen el flujo normal — llegan desde una notificación
 * push, desde Home o desde Ofertas (docs/03-navegacion.md §1, regla 1).
 *
 * Sin sesión abierta solo existe el acceso (iniciar sesión / registro);
 * al ingresar o crear la cuenta, React Navigation pasa solo a la app.
 * Navegación por rol: un usuario de staff (app_metadata.rol, lo asigna el
 * servidor) ve solo el panel del consultorio, nunca la app del paciente.
 */
export function RootNavigator() {
  const { paciente, staff } = useAuth();
  const { colors, oscuro } = useTema();

  return (
    <NavigationContainer theme={temaNavegacion(colors, oscuro)}>
      {/* El lienzo es azul (claro) o casi negro (oscuro): la barra de estado va clara en los dos. */}
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fondoPantalla } }}>
        {paciente ? (
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen name="BuscarEspecialista" component={BuscarEspecialistaScreen} />
            <Stack.Group screenOptions={{ presentation: "fullScreenModal" }}>
              <Stack.Screen name="OfferDetail" component={OfferDetailScreen} />
              <Stack.Screen
                name="OfferConfirmation"
                component={OfferConfirmationScreen}
                options={{ animation: "fade", gestureEnabled: false }}
              />
            </Stack.Group>
          </>
        ) : staff ? (
          <Stack.Screen name="PanelStaff" component={PanelStaffScreen} />
        ) : (
          <Stack.Screen name="Acceso" component={AuthNavigator} options={{ animationTypeForReplace: "pop" }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
