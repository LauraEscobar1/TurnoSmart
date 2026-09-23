import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";
import { TabNavigator } from "@/navigation/TabNavigator";
import { OfferDetailScreen } from "@/screens/Offers/OfferDetailScreen";
import { OfferConfirmationScreen } from "@/screens/Offers/OfferConfirmationScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Navegador raíz.
 * "OfferDetail" y "OfferConfirmation" se presentan como modal
 * porque interrumpen el flujo normal — llegan desde una notificación
 * push, desde Home o desde Ofertas (docs/03-navegacion.md §1, regla 1).
 */
export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Group screenOptions={{ presentation: "modal" }}>
          <Stack.Screen
            name="OfferDetail"
            component={OfferDetailScreen}
            options={{ title: "Cupo disponible" }}
          />
          <Stack.Screen
            name="OfferConfirmation"
            component={OfferConfirmationScreen}
            options={{ headerShown: false }}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
