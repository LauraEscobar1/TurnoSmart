import React, { useReducer } from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { getFocusedRouteNameFromRoute, RouteProp } from "@react-navigation/native";
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

const Tab = createMaterialTopTabNavigator<RootTabParamList>();

/**
 * Deslizar entre secciones solo en la pantalla raíz de cada una: dentro de
 * un detalle, el gesto horizontal es el «volver» de la pila.
 */
const soloEnRaiz = (route: RouteProp<RootTabParamList>, raiz: string) => ({
  swipeEnabled: (getFocusedRouteNameFromRoute(route) ?? raiz) === raiz,
});

/**
 * Navegación primaria deslizable — docs/03-navegacion.md §2.1 y
 * "NavDeslizable.dc.html". Cinco destinos: se cambia de sección tocando
 * un ícono o arrastrando el contenido a los lados. Solo Ofertas y Avisos
 * llevan badge; el de Ofertas cuenta ofertas pendientes de respuesta.
 */
export function TabNavigator() {
  // Los contadores se leen de los datos en cada cambio de sección,
  // así el badge baja apenas se lee un aviso o se responde una oferta.
  const [, refrescar] = useReducer((n: number) => n + 1, 0);
  const badges = {
    Ofertas: contarOfertasPendientes(ofertasMock),
    Notificaciones: contarNoLeidas(notificacionesMock),
  };

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <TabBar {...props} badges={badges} />}
      screenOptions={{ lazy: false, swipeEnabled: true }}
      screenListeners={{ focus: refrescar, state: refrescar }}
      style={{ backgroundColor: colors.bg }}
      sceneContainerStyle={{ backgroundColor: colors.bg }}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: "Inicio" }} />
      <Tab.Screen name="Ofertas" component={OffersNavigator} options={{ title: "Ofertas" }} />
      <Tab.Screen
        name="MisCitas"
        component={AppointmentsNavigator}
        options={({ route }) => ({ title: "Mis citas", ...soloEnRaiz(route, "AppointmentsList") })}
      />
      <Tab.Screen name="Notificaciones" component={NotificationsScreen} options={{ title: "Avisos" }} />
      <Tab.Screen
        name="Perfil"
        component={ProfileNavigator}
        options={({ route }) => ({ title: "Perfil", ...soloEnRaiz(route, "ProfileHome") })}
      />
    </Tab.Navigator>
  );
}
