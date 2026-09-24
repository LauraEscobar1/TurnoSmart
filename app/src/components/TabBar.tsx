import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/typography";
import { RootTabParamList } from "@/navigation/types";

const ICON_SIZE = 19;

const iconByRoute: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Inicio: "home-outline",
  Ofertas: "flash-outline",
  MisCitas: "calendar-outline",
  Notificaciones: "notifications-outline",
  Perfil: "person-outline",
};

/**
 * Navegación primaria — "Design System/TabBar.dc.html".
 * Cinco celdas iguales de 62 px, icono de 19 px sobre etiqueta en
 * versalitas, activo en acento 700. El badge es un cuadrado de acero
 * anclado al icono (no al texto), así no desalinea la celda.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: 62 + insets.bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? colors.accent700 : colors.neutral600;
        const badge = options.tabBarBadge;
        const title = typeof options.tabBarLabel === "string" ? options.tabBarLabel : options.title ?? route.name;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.cell}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? title}
          >
            <View style={styles.iconBox}>
              <Ionicons name={iconByRoute[route.name as keyof RootTabParamList]} size={ICON_SIZE} color={color} />
              {badge !== undefined && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "stretch",
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -5,
    left: ICON_SIZE / 2 + 7,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    lineHeight: 11,
    color: colors.bg,
    includeFontPadding: false,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    letterSpacing: 0.72,
    textTransform: "uppercase",
  },
});
