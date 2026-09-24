import { NavigatorScreenParams } from "@react-navigation/native";

/**
 * Tipos de navegación. Reflejan el mapa jerárquico de
 * docs/02-jerarquia.md y los flujos de docs/03-navegacion.md.
 */

export type RootTabParamList = {
  Inicio: undefined;
  Ofertas: undefined;
  MisCitas: NavigatorScreenParams<AppointmentsStackParamList> | undefined;
  Notificaciones: undefined;
  Perfil: undefined;
};

export type OffersStackParamList = {
  OffersList: undefined;
};

export type AppointmentsStackParamList = {
  AppointmentsList: { tab?: "proximas" | "pasadas" } | undefined;
  AppointmentDetail: { citaId: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  PersonalData: undefined;
  Preferences: undefined;
};

/**
 * Stack raíz. OfferDetail vive aquí (no dentro de un tab) porque
 * se llega a ella desde tres orígenes distintos — Home, Ofertas y
 * el deep link de una notificación push — tal como se describe en
 * docs/03-navegacion.md §2.3 y §2.4.
 */
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList> | undefined;
  OfferDetail: { ofertaId: string };
  OfferConfirmation: { ofertaId: string; resultado: "aceptada" | "rechazada" };
};
