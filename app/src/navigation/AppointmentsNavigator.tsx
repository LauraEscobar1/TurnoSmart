import React from "react";
import { useTema } from "@/theme/Tema";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useT } from "@/i18n";
import { AppointmentsStackParamList } from "@/navigation/types";
import { AppointmentsListScreen } from "@/screens/Appointments/AppointmentsListScreen";
import { AppointmentDetailScreen } from "@/screens/Appointments/AppointmentDetailScreen";

const Stack = createNativeStackNavigator<AppointmentsStackParamList>();

export function AppointmentsNavigator() {
  const { colors } = useTema();
  const t = useT();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fondo } }}>
      <Stack.Screen
        name="AppointmentsList"
        component={AppointmentsListScreen}
        options={{ title: t("nav.citas") }}
      />
      <Stack.Screen
        name="AppointmentDetail"
        component={AppointmentDetailScreen}
        options={{ title: t("citas.detalle") }}
      />
    </Stack.Navigator>
  );
}
