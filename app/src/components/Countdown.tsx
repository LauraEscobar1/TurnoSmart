import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";
import { heading, label } from "@/theme/typography";
import { mmss } from "@/utils/format";

/** Umbral bajo el cual el contador pasa a acento 800 y dice «expira pronto». */
export const UMBRAL_EXPIRA_PRONTO = 120;

/** Segundos que faltan para `expiraEnISO`, actualizado cada segundo. */
export function useCountdown(expiraEnISO: string) {
  const calc = () => Math.max(0, Math.round((new Date(expiraEnISO).getTime() - Date.now()) / 1000));
  const [segundos, setSegundos] = useState(calc);

  useEffect(() => {
    setSegundos(calc());
    const id = setInterval(() => setSegundos(calc()), 1000);
    return () => clearInterval(id);
  }, [expiraEnISO]);

  return segundos;
}

interface CountdownProps {
  segundos: number;
  size: number;
  /** Texto de la etiqueta en estado normal ("para responder", "restantes"...). */
  caption: string;
  align?: "right" | "center";
  /** Solo el número (filas compactas). */
  hideCaption?: boolean;
  color?: string;
  captionStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

/**
 * Contador de expiración de la oferta. Es el ÚNICO elemento animado del
 * sistema: pulsa la opacidad 1 → 0,35 en un ciclo de 2 s.
 */
export function Countdown({ segundos, size, caption, align = "right", hideCaption, color = colors.accent700, captionStyle, style }: CountdownProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const urgente = segundos < UMBRAL_EXPIRA_PRONTO;
  const numberColor = urgente ? colors.accent800 : color;

  return (
    <View style={[{ alignItems: align === "right" ? "flex-end" : "center" }, style]}>
      <Animated.Text style={[heading(size, numberColor), styles.number, { lineHeight: size, opacity }]}>
        {mmss(segundos)}
      </Animated.Text>
      {!hideCaption && (
        <Text style={[label(size > 40 ? 10 : 9), captionStyle, urgente && { color: colors.accent800 }]}>
          {urgente ? "expira pronto" : caption}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  number: {
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  },
});
