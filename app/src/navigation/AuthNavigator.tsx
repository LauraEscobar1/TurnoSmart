import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { AuthStackParamList } from "@/navigation/types";
import { LoginScreen } from "@/screens/Auth/LoginScreen";
import { RegistroDatosScreen } from "@/screens/Auth/RegistroDatosScreen";
import { RegistroPreferenciasScreen } from "@/screens/Auth/RegistroPreferenciasScreen";
import { RegistroVerificacionScreen } from "@/screens/Auth/RegistroVerificacionScreen";
import { RegistroProvider } from "@/screens/Auth/RegistroContext";

const Stack = createNativeStackNavigator<AuthStackParamList>();

/** Acceso: Iniciar sesión → Registro (datos → preferencias → verificación). */
export function AuthNavigator() {
  return (
    <RegistroProvider>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RegistroDatos" component={RegistroDatosScreen} />
        <Stack.Screen name="RegistroPreferencias" component={RegistroPreferenciasScreen} />
        <Stack.Screen name="RegistroVerificacion" component={RegistroVerificacionScreen} />
      </Stack.Navigator>
    </RegistroProvider>
  );
}
