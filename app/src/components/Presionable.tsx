import React from "react";
import { GestureResponderEvent, Pressable, PressableProps, PressableStateCallbackType, StyleProp, StyleSheet, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";

/** Propiedades de estilo que ubican al elemento en su contenedor: van en la capa que escala. */
const DE_UBICACION = new Set([
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignSelf",
  "width",
  "minWidth",
  "maxWidth",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginHorizontal",
  "marginVertical",
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "zIndex",
]);

const RESORTE = { damping: 18, stiffness: 320, mass: 0.6 };

type Estilo = StyleProp<ViewStyle> | ((estado: PressableStateCallbackType) => StyleProp<ViewStyle>);

interface PresionableProps extends Omit<PressableProps, "style"> {
  style?: Estilo;
  /** Escala al presionar (1 = sin escala). */
  escala?: number;
  /** Vibración leve al tocar. */
  haptico?: boolean;
}

/**
 * Pressable con microinteracción: se achica apenas al presionar (resorte
 * suave, sin escala con «Reducir movimiento») y da un toque háptico leve.
 * Las props de ubicación del estilo (flex, márgenes, ancho) pasan a la capa
 * que escala; el resto (relleno, borde, padding) queda en el Pressable.
 */
export function Presionable({
  style,
  escala = 0.97,
  haptico = true,
  onPressIn,
  onPressOut,
  onPress,
  ...props
}: PresionableProps) {
  const reducir = useReducedMotion();
  const s = useSharedValue(1);
  const estiloEscala = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  const base = StyleSheet.flatten(typeof style === "function" ? style({ pressed: false }) : style) ?? {};
  const ubicacion: ViewStyle = {};
  for (const [k, v] of Object.entries(base)) if (DE_UBICACION.has(k)) (ubicacion as Record<string, unknown>)[k] = v;
  const interior = (estado: PressableStateCallbackType) => {
    const plano = StyleSheet.flatten(typeof style === "function" ? style(estado) : style) ?? {};
    const resto: ViewStyle = {};
    for (const [k, v] of Object.entries(plano)) if (!DE_UBICACION.has(k)) (resto as Record<string, unknown>)[k] = v;
    // Con ancho o flex en la capa exterior, el Pressable la llena.
    return [resto, (ubicacion.flex !== undefined || ubicacion.width !== undefined || ubicacion.flexGrow !== undefined) && styles.llenar];
  };

  return (
    <Animated.View style={[ubicacion, estiloEscala]}>
      <Pressable
        {...props}
        onPressIn={(e: GestureResponderEvent) => {
          if (!reducir && escala !== 1) s.value = withSpring(escala, RESORTE);
          onPressIn?.(e);
        }}
        onPressOut={(e: GestureResponderEvent) => {
          s.value = withSpring(1, RESORTE);
          onPressOut?.(e);
        }}
        onPress={(e: GestureResponderEvent) => {
          if (haptico) Haptics.selectionAsync().catch(() => {});
          onPress?.(e);
        }}
        style={interior}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  llenar: {
    flexGrow: 1,
  },
});
