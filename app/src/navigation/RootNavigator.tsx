import React from "react";
import { DefaultTheme, NavigationContainer, Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { RootStackParamList } from "@/navigation/types";
import { TabNavigator } from "@/navigation/TabNavigator";
import { OfferDetailScreen } from "@/screens/Offers/OfferDetailScreen";
import { OfferConfirmationScreen } from "@/screens/Offers/OfferConfirmationScreen";
import { AuthNavigator } from "@/navigation/AuthNavigator";
import { useAuth } from "@/auth/AuthContext";

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.fondo,
    card: colors.superficie,
    text: colors.text,
    border: colors.divider,
    notification: colors.accent,
  },
};

/**
 * Navegador raíz.
 * "OfferDetail" y "OfferConfirmation" se presentan a pantalla completa
 * porque interrumpen el flujo normal — llegan desde una notificación
 * push, desde Home o desde Ofertas (docs/03-navegacion.md §1, regla 1).
 *
 * Sin sesión abierta solo existe el acceso (iniciar sesión / registro);
 * al ingresar o crear la cuenta, React Navigation pasa solo a la app.
 */
export function RootNavigator() {
  const { paciente } = useAuth();

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fondo } }}>
        {paciente ? (
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Group screenOptions={{ presentation: "fullScreenModal" }}>
              <Stack.Screen name="OfferDetail" component={OfferDetailScreen} />
              <Stack.Screen
                name="OfferConfirmation"
                component={OfferConfirmationScreen}
                options={{ animation: "fade", gestureEnabled: false }}
              />
            </Stack.Group>
          </>
        ) : (
          <Stack.Screen name="Acceso" component={AuthNavigator} options={{ animationTypeForReplace: "pop" }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
