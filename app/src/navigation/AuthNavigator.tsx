import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { AuthStackParamList } from "@/navigation/types";
import { introVista } from "@/services/authService";
import { IntroScreen } from "@/screens/Auth/IntroScreen";
import { BienvenidaScreen } from "@/screens/Auth/BienvenidaScreen";
import { LoginScreen } from "@/screens/Auth/LoginScreen";
import { RestablecerPasswordScreen } from "@/screens/Auth/RestablecerPasswordScreen";
import { RegistroDatosScreen } from "@/screens/Auth/RegistroDatosScreen";
import { RegistroPreferenciasScreen } from "@/screens/Auth/RegistroPreferenciasScreen";
import { RegistroVerificacionScreen } from "@/screens/Auth/RegistroVerificacionScreen";
import { RegistroProvider } from "@/screens/Auth/RegistroContext";

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Acceso: Intro (solo la primera vez) → Bienvenida → Iniciar sesión /
 * Registro (datos → preferencias → verificación) / Restablecer contraseña.
 */
export function AuthNavigator() {
  const [inicial, setInicial] = useState<"Intro" | "Bienvenida" | null>(null);

  useEffect(() => {
    introVista().then((vista) => setInicial(vista ? "Bienvenida" : "Intro"));
  }, []);

  if (!inicial) return null;

  return (
    <RegistroProvider>
      <Stack.Navigator
        initialRouteName={inicial}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fondo } }}
      >
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="Bienvenida" component={BienvenidaScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RestablecerPassword" component={RestablecerPasswordScreen} />
        <Stack.Screen name="RegistroDatos" component={RegistroDatosScreen} />
        <Stack.Screen name="RegistroPreferencias" component={RegistroPreferenciasScreen} />
        <Stack.Screen name="RegistroVerificacion" component={RegistroVerificacionScreen} />
      </Stack.Navigator>
    </RegistroProvider>
  );
}
