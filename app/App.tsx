import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as NativeSplash from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Barlow_400Regular, Barlow_500Medium, Barlow_700Bold } from "@expo-google-fonts/barlow";
import { BarlowCondensed_600SemiBold } from "@expo-google-fonts/barlow-condensed";
import { RootNavigator } from "@/navigation/RootNavigator";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { SplashScreen } from "@/screens/Auth/SplashScreen";

// El splash nativo (mismo color de campo, app.json) queda hasta tener fuentes.
NativeSplash.preventAutoHideAsync().catch(() => {});

/** Tiempo mínimo del splash con la marca, para que no sea un parpadeo. */
const SPLASH_MINIMO_MS = 1200;

function Main() {
  const { cargando } = useAuth();
  const [minimoCumplido, setMinimoCumplido] = useState(false);

  useEffect(() => {
    NativeSplash.hideAsync().catch(() => {});
    const t = setTimeout(() => setMinimoCumplido(true), SPLASH_MINIMO_MS);
    return () => clearTimeout(t);
  }, []);

  // Hasta saber si hay sesión guardada no se decide entre acceso y app.
  if (cargando || !minimoCumplido) return <SplashScreen />;
  return <RootNavigator />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_700Bold,
    BarlowCondensed_600SemiBold,
  });

  // Sin las fuentes del sistema la retícula se descuadra: esperar a que carguen.
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <Main />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
