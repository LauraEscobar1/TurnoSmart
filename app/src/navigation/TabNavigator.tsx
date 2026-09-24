import React, { useReducer } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "@/theme/colors";
import { RootTabParamList } from "@/navigation/types";
import { HomeScreen } from "@/screens/Home/HomeScreen";
import { OffersNavigator } from "@/navigation/OffersNavigator";
import { AppointmentsNavigator } from "@/navigation/AppointmentsNavigator";
import { NotificationsScreen } from "@/screens/Notifications/NotificationsScreen";
import { ProfileNavigator } from "@/navigation/ProfileNavigator";
import { TabBar } from "@/components/TabBar";
import { contarNoLeidas } from "@/services/notificationsService";
import { contarOfertasPendientes } from "@/services/offersService";
import { notificacionesMock, ofertasMock } from "@/data/mockData";

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * Navegación primaria (tab bar) — docs/03-navegacion.md §2.1.
 * Máximo 5 destinos, uno por sección de Nivel 1. Solo Ofertas y Avisos
 * llevan badge; el de Ofertas cuenta ofertas pendientes de respuesta.
 */
export function TabNavigator() {
  // Los contadores se leen de los datos en cada foco de pestaña,
  // así el badge baja apenas se lee un aviso o se responde una oferta.
  const [, refrescar] = useReducer((n: number) => n + 1, 0);
  const noLeidas = contarNoLeidas(notificacionesMock);
  const pendientes = contarOfertasPendientes(ofertasMock);

  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      sceneContainerStyle={{ backgroundColor: colors.bg }}
      screenOptions={{ headerShown: false }}
      screenListeners={{ focus: refrescar, state: refrescar }}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: "Inicio" }} />
      <Tab.Screen
        name="Ofertas"
        component={OffersNavigator}
        options={{ title: "Ofertas", tabBarBadge: pendientes > 0 ? pendientes : undefined }}
      />
      <Tab.Screen name="MisCitas" component={AppointmentsNavigator} options={{ title: "Mis citas" }} />
      <Tab.Screen
        name="Notificaciones"
        component={NotificationsScreen}
        options={{ title: "Avisos", tabBarBadge: noLeidas > 0 ? noLeidas : undefined }}
      />
      <Tab.Screen name="Perfil" component={ProfileNavigator} options={{ title: "Perfil" }} />
    </Tab.Navigator>
  );
}
