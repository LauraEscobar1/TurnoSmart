import React, { useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { fonts } from "@/theme/typography";
import { RootTabParamList } from "@/navigation/types";

const ICON_SIZE = 20;
const BAR_HEIGHT = 64;

const iconByRoute: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Inicio: "home-outline",
  Ofertas: "flash-outline",
  MisCitas: "calendar-outline",
  Notificaciones: "notifications-outline",
  Perfil: "person-outline",
};

export type TabBadges = Partial<Record<keyof RootTabParamList, number>>;

/**
 * Navegación primaria deslizable — "TabBar.dc.html" / "NavDeslizable.dc.html".
 * Un bloque sólido redondeado (acero 900) sigue al dedo
 * mientras se arrastra el contenido. La sección actual lleva el ícono
 * ampliado en papel y la etiqueta en negrita.
 *
 * Todo lo que se mueve con el arrastre (bloque, ícono, etiqueta) se anima
 * solo con transform y opacity, para correr en el hilo nativo.
 */
export function TabBar({
  state,
  descriptors,
  navigation,
  position,
  badges = {},
}: MaterialTopTabBarProps & { badges?: TabBadges }) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const tabWidth = width / count;

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <View style={styles.row} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              { width: tabWidth, transform: [{ translateX: Animated.multiply(position, tabWidth) }] },
            ]}
          >
            <View style={styles.block} />
          </Animated.View>
        )}

        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const focused = state.index === i;
          const title = typeof options.tabBarLabel === "string" ? options.tabBarLabel : (options.title ?? route.name);
          const badge = badges[route.name as keyof RootTabParamList];
          const icon = iconByRoute[route.name as keyof RootTabParamList];

          // La sección «actual» es la más cercana a la posición del arrastre.
          const range = [i - 0.5, i - 0.499, i + 0.499, i + 0.5];
          const on = position.interpolate({ inputRange: range, outputRange: [0, 1, 1, 0], extrapolate: "clamp" });
          const off = position.interpolate({ inputRange: range, outputRange: [1, 0, 0, 1], extrapolate: "clamp" });
          const scale = position.interpolate({
            inputRange: range,
            outputRange: [1, 1.12, 1.12, 1],
            extrapolate: "clamp",
          });
          const lift = position.interpolate({ inputRange: range, outputRange: [0, -1, -1, 0], extrapolate: "clamp" });

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
              accessibilityLabel={title}
            >
              <Animated.View style={[styles.iconBox, { transform: [{ translateY: lift }, { scale }] }]}>
                <Animated.View style={[styles.layer, { opacity: off }]}>
                  <Ionicons name={icon} size={ICON_SIZE} color={colors.neutral600} />
                </Animated.View>
                <Animated.View style={[styles.layer, { opacity: on }]}>
                  <Ionicons name={icon} size={ICON_SIZE} color={colors.bg} />
                </Animated.View>
              </Animated.View>
              <View style={styles.labelBox}>
                <Animated.Text style={[styles.label, styles.labelOff, { opacity: off }]} numberOfLines={1}>
                  {title}
                </Animated.Text>
                <Animated.Text style={[styles.label, styles.labelOn, { opacity: on }]} numberOfLines={1}>
                  {title}
                </Animated.Text>
              </View>
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: colors.borde,
    backgroundColor: colors.superficie,
  },
  row: {
    height: BAR_HEIGHT,
    flexDirection: "row",
  },
  indicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
  block: {
    position: "absolute",
    top: 7,
    bottom: 7,
    left: 6,
    right: 6,
    borderRadius: radius.md + 2,
    backgroundColor: colors.accent900,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  layer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  labelBox: {
    height: 12,
    alignSelf: "stretch",
  },
  label: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.72,
    textTransform: "uppercase",
  },
  labelOff: {
    fontFamily: fonts.bodyMedium,
    color: colors.neutral600,
  },
  labelOn: {
    fontFamily: fonts.bodyBold,
    color: colors.bg,
  },
  badge: {
    position: "absolute",
    top: 6,
    left: "50%",
    marginLeft: 4,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.superficie,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    lineHeight: 11,
    color: colors.bg,
    includeFontPadding: false,
  },
});
