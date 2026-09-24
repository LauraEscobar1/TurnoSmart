import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Barlow_400Regular, Barlow_500Medium, Barlow_700Bold } from "@expo-google-fonts/barlow";
import { BarlowCondensed_600SemiBold } from "@expo-google-fonts/barlow-condensed";
import { RootNavigator } from "@/navigation/RootNavigator";

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
      <RootNavigator />
    </SafeAreaProvider>
  );
}
