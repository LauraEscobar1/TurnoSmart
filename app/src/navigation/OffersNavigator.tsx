import React from "react";
import { useTema } from "@/theme/Tema";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useT } from "@/i18n";
import { OffersStackParamList } from "@/navigation/types";
import { OffersListScreen } from "@/screens/Offers/OffersListScreen";

const Stack = createNativeStackNavigator<OffersStackParamList>();

export function OffersNavigator() {
  const { colors } = useTema();
  const t = useT();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fondo } }}>
      <Stack.Screen name="OffersList" component={OffersListScreen} options={{ title: t("nav.ofertas") }} />
    </Stack.Navigator>
  );
}
