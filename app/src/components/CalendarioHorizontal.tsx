import React, { useEffect, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { radius, sombra } from "@/theme/spacing";
import { fonts, heading } from "@/theme/typography";
import { claveDia, diaSemanaCorto, fechaLarga, mesYAnio } from "@/utils/format";

interface CalendarioHorizontalProps {
  dias: Date[];
  seleccionado: Date;
  onSeleccionar: (dia: Date) => void;
  /** Cantidad de citas por día (clave "aaaa-mm-dd"); los días con citas llevan un punto. */
  citasPorDia?: Record<string, number>;
}

const ANCHO = 52;
const SEPARACION = 8;
const PASO = ANCHO + SEPARACION;

/**
 * Calendario horizontal de cápsulas: día de la semana arriba y número
 * abajo. El elegido va en el azul de TurnoSmart con texto blanco; los días
 * con citas llevan un punto. Arriba, el mes y dos flechas que avanzan una
 * semana, para que se entienda que el calendario se desplaza.
 */
export function CalendarioHorizontal({ dias, seleccionado, onSeleccionar, citasPorDia = {} }: CalendarioHorizontalProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [ancho, setAncho] = useState(0);
  const offset = useRef(0);
  const claveSel = claveDia(seleccionado);
  const indiceSel = Math.max(0, dias.findIndex((d) => claveDia(d) === claveSel));

  // El día elegido queda centrado cuando cambia (o cuando cambia el rango de días).
  useEffect(() => {
    if (!ancho) return;
    const x = Math.max(0, indiceSel * PASO - (ancho - ANCHO) / 2);
    scrollRef.current?.scrollTo({ x, animated: true });
  }, [indiceSel, ancho, dias]);

  const desplazar = (semanas: number) => {
    const max = Math.max(0, dias.length * PASO - ancho);
    const x = Math.min(max, Math.max(0, offset.current + semanas * 7 * PASO));
    scrollRef.current?.scrollTo({ x, animated: true });
  };

  return (
    <View>
      <View style={styles.cabecera}>
        <Text style={heading(18, colors.accent900)}>{mesYAnio(seleccionado)}</Text>
        <View style={styles.flechas}>
          <Pressable
            onPress={() => desplazar(-1)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Semana anterior"
            style={({ pressed }) => [styles.flecha, pressed && styles.flechaPresionada]}
          >
            <Ionicons name="chevron-back" size={16} color={colors.accent700} />
          </Pressable>
          <Pressable
            onPress={() => desplazar(1)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Semana siguiente"
            style={({ pressed }) => [styles.flecha, pressed && styles.flechaPresionada]}
          >
            <Ionicons name="chevron-forward" size={16} color={colors.accent700} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          offset.current = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.fila}
        // Espacio para que la sombra de las cápsulas no se recorte.
        style={styles.scroll}
      >
        {dias.map((d) => {
          const clave = claveDia(d);
          const activo = clave === claveSel;
          const cantidad = citasPorDia[clave] ?? 0;
          return (
            <Pressable
              key={clave}
              onPress={() => onSeleccionar(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`${fechaLarga(d)}${cantidad ? `, ${cantidad} ${cantidad === 1 ? "cita" : "citas"}` : ""}`}
              style={({ pressed }) => [
                styles.capsula,
                activo ? styles.capsulaActiva : styles.capsulaInactiva,
                pressed && !activo && styles.capsulaPresionada,
              ]}
            >
              <Text style={[styles.diaSemana, { color: activo ? "rgba(255,255,255,0.85)" : colors.neutral600 }]}>
                {diaSemanaCorto(d)}
              </Text>
              <Text style={[styles.numero, { color: activo ? "#ffffff" : colors.accent900 }]}>{d.getDate()}</Text>
              <View
                style={[
                  styles.punto,
                  { backgroundColor: cantidad ? (activo ? "#ffffff" : colors.accent) : "transparent" },
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  flechas: {
    flexDirection: "row",
    gap: 8,
  },
  flecha: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.superficie,
    borderWidth: 1,
    borderColor: colors.borde,
    alignItems: "center",
    justifyContent: "center",
  },
  flechaPresionada: {
    backgroundColor: colors.accent100,
  },
  scroll: {
    marginHorizontal: -18,
    marginVertical: -8,
  },
  fila: {
    gap: SEPARACION,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  capsula: {
    width: ANCHO,
    paddingTop: 9,
    paddingBottom: 7,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
  },
  capsulaActiva: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    ...sombra.md,
    shadowOpacity: 0.22,
  },
  capsulaInactiva: {
    backgroundColor: colors.superficie,
    borderColor: colors.borde,
  },
  capsulaPresionada: {
    backgroundColor: colors.accent100,
  },
  diaSemana: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  numero: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 24,
    marginTop: 2,
  },
  punto: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 3,
  },
});
