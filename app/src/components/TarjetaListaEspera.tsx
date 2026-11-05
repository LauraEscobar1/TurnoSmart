import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { radius } from "@/theme/spacing";
import { body, fonts, heading, label } from "@/theme/typography";
import { Card } from "@/components/Card";
import { IconoCirculo } from "@/components/Adornos";
import { PrimaryButton } from "@/components/PrimaryButton";
import { diasEnEspera } from "@/utils/format";
import { useDato, useT } from "@/i18n";

interface Props {
  especialidades: string[];
  /** Alta de cada solicitud por especialidad (si se pudo leer). */
  desde: Record<string, string>;
  /** Alta más antigua, para las especialidades sin dato propio. */
  desdeGeneral: string;
  puesto: number;
  onVer: () => void;
}

/**
 * «Tu lista de espera» en Inicio: cuántas especialidades espera y en qué
 * puesto está, un chip por especialidad con los días que lleva, la barra
 * de «buscando cupo» (animada, quieta con «Reducir movimiento») y el
 * acceso a la lista completa.
 */
export function TarjetaListaEspera({ especialidades, desde, desdeGeneral, puesto, onVer }: Props) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const dato = useDato();
  const antes = Math.max(0, puesto - 1);

  return (
    <Card destacada style={styles.card}>
      <View style={styles.cabecera}>
        <View style={styles.brillo}>
          <IconoCirculo nombre="hourglass-outline" tamano={48} tamanoIcono={22} />
        </View>
        <View style={styles.flex}>
          <Text style={label(9, colors.neutral600)}>{t("inicio.enEspera")}</Text>
          <Text style={heading(22, colors.accent900)}>{t("inicio.nEspecialidades", { count: especialidades.length })}</Text>
        </View>
        <View style={styles.puesto}>
          <Text style={label(9, colors.neutral600)}>{t("inicio.puesto")}</Text>
          <Text style={styles.puestoNumero}>{puesto}</Text>
        </View>
      </View>

      {especialidades.length ? (
        <View style={styles.chips}>
          {especialidades.map((e) => {
            const dias = diasEnEspera(desde[e] ?? desdeGeneral);
            return (
              <View key={e} style={styles.chip}>
                <Text style={styles.chipNombre}>
                  {dato("especialidades", e)}
                  <Text style={styles.chipDias}> · {t("comun.nDias", { count: dias })}</Text>
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={body(13, colors.neutral700)}>{t("buscar.listaVacia")}</Text>
      )}

      {especialidades.length ? <BuscandoCupo /> : null}

      <Text style={body(13, colors.neutral700)}>
        {antes === 0 ? t("inicio.sosPrimero") : t("inicio.personasAntesAviso", { count: antes })}
      </Text>
      <PrimaryButton label={t("inicio.verListaEspera")} variant="secondary" onPress={onVer} />
    </Card>
  );
}

/** Barra fina con un tramo que recorre la pista: la IA sigue buscando un cupo. */
function BuscandoCupo() {
  const styles = useEstilos(crearStyles);
  const t = useT();
  const reducir = useReducedMotion();
  const [ancho, setAncho] = useState(0);
  const avance = useSharedValue(0);

  useEffect(() => {
    if (reducir || ancho === 0) return;
    avance.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(avance);
  }, [reducir, ancho, avance]);

  const tramo = ancho * 0.35;
  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: reducir ? 0 : -tramo + avance.value * (ancho + tramo) }],
  }));

  return (
    <View style={styles.buscando} accessible accessibilityLabel={t("inicio.buscandoCupo")}>
      <Text style={styles.buscandoTexto}>{t("inicio.buscandoCupo")}</Text>
      <View style={styles.pista} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.tramo, { width: tramo || "35%" }, estilo]} />
      </View>
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    card: {
      padding: 18,
      gap: 14,
    },
    cabecera: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    brillo: {
      borderRadius: 24,
    },
    flex: {
      flex: 1,
      minWidth: 0,
    },
    puesto: {
      alignItems: "flex-end",
    },
    puestoNumero: {
      fontFamily: fonts.heading,
      fontSize: 32,
      lineHeight: 34,
      color: colors.accent900,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
      backgroundColor: colors.fondoChip,
    },
    chipNombre: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: colors.accent900,
    },
    chipDias: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.neutral600,
    },
    buscando: {
      gap: 6,
    },
    buscandoTexto: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.accent700,
    },
    pista: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.fondoChip,
      overflow: "hidden",
    },
    tramo: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
  });
