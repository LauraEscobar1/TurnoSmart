import React from "react";
import { colors } from "@/theme/colors";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "@/navigation/types";
import { ProfileHomeScreen } from "@/screens/Profile/ProfileHomeScreen";
import { PersonalDataScreen } from "@/screens/Profile/PersonalDataScreen";
import { PreferencesScreen } from "@/screens/Profile/PreferencesScreen";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="ProfileHome" component={ProfileHomeScreen} options={{ title: "Perfil" }} />
      <Stack.Screen
        name="PersonalData"
        component={PersonalDataScreen}
        options={{ title: "Datos personales" }}
      />
      <Stack.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{ title: "Preferencias" }}
      />
    </Stack.Navigator>
  );
}
