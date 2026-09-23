import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { RootTabParamList } from "@/navigation/types";
import { HomeScreen } from "@/screens/Home/HomeScreen";
import { OffersNavigator } from "@/navigation/OffersNavigator";
import { AppointmentsNavigator } from "@/navigation/AppointmentsNavigator";
import { NotificationsScreen } from "@/screens/Notifications/NotificationsScreen";
import { ProfileNavigator } from "@/navigation/ProfileNavigator";
import { contarNoLeidas } from "@/services/notificationsService";
import { notificacionesMock } from "@/data/mockData";

const Tab = createBottomTabNavigator<RootTabParamList>();

const iconByRoute: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Inicio: "home-outline",
  Ofertas: "flash-outline",
  MisCitas: "calendar-outline",
  Notificaciones: "notifications-outline",
  Perfil: "person-outline",
};

/**
 * Navegación primaria (tab bar) — docs/03-navegacion.md §2.1.
 * Máximo 5 destinos, uno por sección de Nivel 1.
 */
export function TabNavigator() {
  const noLeidas = contarNoLeidas(notificacionesMock);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={iconByRoute[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: "Inicio" }} />
      <Tab.Screen name="Ofertas" component={OffersNavigator} options={{ title: "Ofertas" }} />
      <Tab.Screen
        name="MisCitas"
        component={AppointmentsNavigator}
        options={{ title: "Mis citas" }}
      />
      <Tab.Screen
        name="Notificaciones"
        component={NotificationsScreen}
        options={{ title: "Notificaciones", tabBarBadge: noLeidas > 0 ? noLeidas : undefined }}
      />
      <Tab.Screen name="Perfil" component={ProfileNavigator} options={{ title: "Perfil" }} />
    </Tab.Navigator>
  );
}
