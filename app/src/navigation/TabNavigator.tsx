import React, { useCallback, useEffect, useRef, useState } from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { getFocusedRouteNameFromRoute, RouteProp } from "@react-navigation/native";
import { colors } from "@/theme/colors";
import { RootTabParamList } from "@/navigation/types";
import { HomeScreen } from "@/screens/Home/HomeScreen";
import { OffersNavigator } from "@/navigation/OffersNavigator";
import { AppointmentsNavigator } from "@/navigation/AppointmentsNavigator";
import { NotificationsScreen } from "@/screens/Notifications/NotificationsScreen";
import { ProfileNavigator } from "@/navigation/ProfileNavigator";
import { TabBadges, TabBar } from "@/components/TabBar";
import { useT } from "@/i18n";
import { getConteoNoLeidas } from "@/services/notificationsService";
import { getConteoOfertasPendientes } from "@/services/offersService";

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
 * un ícono o arrastrando el contenido a los lados. Solo Ofertas y Notificaciones
 * llevan badge; el de Ofertas cuenta ofertas pendientes de respuesta.
 */
export function TabNavigator() {
  const t = useT();
  // Los contadores se piden a los servicios (Supabase) en cada cambio de
  // sección, así el badge baja apenas se lee un aviso o se responde una oferta.
  const [badges, setBadges] = useState<TabBadges>({});
  const montado = useRef(true);
  const refrescar = useCallback(() => {
    Promise.all([getConteoOfertasPendientes(), getConteoNoLeidas()])
      .then(([ofertas, notificaciones]) => {
        if (montado.current) setBadges({ Ofertas: ofertas, Notificaciones: notificaciones });
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    montado.current = true;
    refrescar();
    return () => {
      montado.current = false;
    };
  }, [refrescar]);

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <TabBar {...props} badges={badges} />}
      screenOptions={{ lazy: false, swipeEnabled: true }}
      screenListeners={{ focus: refrescar, state: refrescar }}
      style={{ backgroundColor: colors.fondo }}
      sceneContainerStyle={{ backgroundColor: colors.fondo }}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: t("nav.inicio") }} />
      <Tab.Screen name="Ofertas" component={OffersNavigator} options={{ title: t("nav.ofertas") }} />
      <Tab.Screen
        name="MisCitas"
        component={AppointmentsNavigator}
        options={({ route }) => ({ title: t("nav.citas"), ...soloEnRaiz(route, "AppointmentsList") })}
      />
      <Tab.Screen name="Notificaciones" component={NotificationsScreen} options={{ title: t("nav.notificaciones") }} />
      <Tab.Screen
        name="Perfil"
        component={ProfileNavigator}
        options={({ route }) => ({ title: t("nav.perfil"), ...soloEnRaiz(route, "ProfileHome") })}
      />
    </Tab.Navigator>
  );
}
