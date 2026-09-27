import React from "react";
import { useTema } from "@/theme/Tema";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useT } from "@/i18n";
import { ProfileStackParamList } from "@/navigation/types";
import { ProfileHomeScreen } from "@/screens/Profile/ProfileHomeScreen";
import { PersonalDataScreen } from "@/screens/Profile/PersonalDataScreen";
import { PreferencesScreen } from "@/screens/Profile/PreferencesScreen";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileNavigator() {
  const { colors } = useTema();
  const t = useT();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fondo } }}>
      <Stack.Screen name="ProfileHome" component={ProfileHomeScreen} options={{ title: t("nav.perfil") }} />
      <Stack.Screen
        name="PersonalData"
        component={PersonalDataScreen}
        options={{ title: t("datos.titulo") }}
      />
      <Stack.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{ title: t("preferencias.titulo") }}
      />
    </Stack.Navigator>
  );
}
