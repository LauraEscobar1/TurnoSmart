import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OffersStackParamList } from "@/navigation/types";
import { OffersListScreen } from "@/screens/Offers/OffersListScreen";

const Stack = createNativeStackNavigator<OffersStackParamList>();

export function OffersNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="OffersList" component={OffersListScreen} options={{ title: "Ofertas" }} />
    </Stack.Navigator>
  );
}
