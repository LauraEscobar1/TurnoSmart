import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppointmentsStackParamList } from "@/navigation/types";
import { AppointmentsListScreen } from "@/screens/Appointments/AppointmentsListScreen";
import { AppointmentDetailScreen } from "@/screens/Appointments/AppointmentDetailScreen";

const Stack = createNativeStackNavigator<AppointmentsStackParamList>();

export function AppointmentsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="AppointmentsList"
        component={AppointmentsListScreen}
        options={{ title: "Mis citas" }}
      />
      <Stack.Screen
        name="AppointmentDetail"
        component={AppointmentDetailScreen}
        options={{ title: "Detalle de cita" }}
      />
    </Stack.Navigator>
  );
}
