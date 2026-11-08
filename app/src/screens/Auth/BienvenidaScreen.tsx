import React, { useEffect, useState } from "react";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { body, fonts } from "@/theme/typography";
import { useT } from "@/i18n";
import { AuthStackParamList } from "@/navigation/types";
import { Logo } from "@/components/Logo";
import { OndasPulso } from "@/components/OndasPulso";
import { FondoDegradado } from "@/components/Vidrio";
import { MenuAjustes } from "@/components/MenuAjustes";
import { Presionable } from "@/components/Presionable";

type Props = NativeStackScreenProps<AuthStackParamList, "Bienvenida">;

const MARGEN = 28;

/** Entrada escalonada desde abajo (titular, bajada, acciones), después del logo. */
const entraDesdeAbajo = (retraso: number) =>
  FadeInDown.delay(retraso)
    .duration(480)
    .withInitialValues({ transform: [{ translateY: 22 }] })
    .reduceMotion(ReduceMotion.System);

/**
 * Animaciones de la Bienvenida (ninguna corre con «Reducir movimiento»):
 * el logo aparece con fade y una leve escala, y la respiración del botón
 * «Empezar» (1 → 1,03 cada pocos segundos).
 */
function useAnimacionesBienvenida(reducir: boolean) {
  const llegada = useSharedValue(reducir ? 1 : 0);
  const respiro = useSharedValue(1);
  useEffect(() => {
    if (reducir) {
      llegada.value = 1;
      respiro.value = 1;
      return;
    }
    const suave = Easing.out(Easing.cubic);
    llegada.value = withTiming(1, { duration: 520, easing: suave });
    respiro.value = withDelay(
      1800,
      withRepeat(
        withSequence(
          withTiming(1.03, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 2400 }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(llegada);
      cancelAnimation(respiro);
    };
  }, [reducir, llegada, respiro]);
  const logo = useAnimatedStyle(() => ({
    opacity: llegada.value,
    transform: [{ scale: 0.88 + 0.12 * llegada.value }],
  }));
  const boton = useAnimatedStyle(() => ({
    transform: [{ scale: respiro.value }],
  }));
  return { logo, boton };
}

/**
 * Bienvenida, igual en los dos modos: arriba el degradado del fondo con
 * líneas de electrocardiograma en movimiento, el logo luminoso y el botón
 * de ajustes, que cierra en una loma suave; abajo, sobre la zona inferior,
 * titular, bajada y acciones, que entran escalonados después del logo. El
 * botón «Empezar» lleva el azul claro de la parte superior (Tractor Beam en
 * claro, Rock Blue en oscuro) con texto Subnautical, y respira apenas.
 */
export function BienvenidaScreen({ navigation }: Props) {
  const { colors, oscuro } = useTema();
  const insets = useSafeAreaInsets();
  // Tamaño de la zona del degradado, para dibujar las ondas a su medida.
  const [cabecera, setCabecera] = useState({ width: 0, height: 0 });
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const styles = useEstilos(crearStyles);
  const t = useT();
  const reducir = useReducedMotion();
  const animado = useAnimacionesBienvenida(reducir);

  return (
    // La zona del degradado llega hasta arriba (bajo la barra de estado).
    <SafeAreaView edges={["bottom"]} style={[styles.safe, styles.zonaInferior]}>
      <FondoDegradado
        style={[styles.cabecera, { paddingTop: insets.top }]}
        onLayout={(e) =>
          setCabecera({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })
        }
      >
        <OndasPulso
          width={cabecera.width}
          height={cabecera.height}
          color={colors.trazoSobreFondo}
          colorCurva={colors.fondoBienvenida}
        />
        <View style={styles.marca}>
          <Animated.View style={animado.logo}>
            <Logo
              size={38}
              tamanoNombre={28}
              wordmark
              disposicion="horizontal"
              color={colors.logoMarca}
              acento={colors.logoMarcaAcento}
              acentoNombre={colors.logoMarcaAcento}
              resplandor={colors.sombraLogoMarca}
              latidoAlEntrar={reducir ? undefined : 520}
            />
          </Animated.View>
          <Animated.View entering={FadeIn.delay(300).duration(400).reduceMotion(ReduceMotion.System)}>
            <Pressable
              onPress={() => setAjustesAbiertos(true)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t("ajustes.titulo")}
              style={({ pressed }) => [styles.ajustes, pressed && styles.presionado]}
            >
              <Ionicons name="settings-outline" size={22} color={colors.textoSobreFondo} />
            </Pressable>
          </Animated.View>
        </View>
      </FondoDegradado>

      <View style={styles.texto}>
        <Animated.View entering={entraDesdeAbajo(650)}>
          <Text style={[styles.titular, oscuro && styles.sobreFondo]} accessibilityRole="header">
            {t("bienvenida.titular")}
            <Text style={styles.punto}>.</Text>
          </Text>
        </Animated.View>
        <Animated.View entering={entraDesdeAbajo(780)}>
          <Text style={[body(15, oscuro ? colors.textoSuaveSobreFondo : colors.neutral700), styles.bajada]}>
            {t("bienvenida.bajada")}
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={entraDesdeAbajo(910)} style={styles.acciones}>
        {/* Respira apenas cada pocos segundos; al presionarlo se achica (Presionable). */}
        <Animated.View style={[styles.respiro, animado.boton]}>
          <Presionable
            onPress={() => navigation.navigate("RegistroDatos")}
            escala={0.95}
            accessibilityRole="button"
            accessibilityLabel={t("intro.empezar")}
            style={styles.boton}
          >
            <Text style={styles.botonTexto}>{t("intro.empezar")}</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.textoBotonBienvenida} />
          </Presionable>
        </Animated.View>
        <View style={styles.ingresar}>
          <Text style={body(14, oscuro ? colors.textoSuaveSobreFondo : colors.neutral700)}>
            {t("bienvenida.yaTenesCuenta")}{" "}
          </Text>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("login.iniciarSesion")}
          >
            <Text style={[styles.link, oscuro && styles.linkSobreFondo]}>{t("bienvenida.iniciaSesion")}</Text>
          </Pressable>
        </View>
      </Animated.View>
      <MenuAjustes visible={ajustesAbiertos} onCerrar={() => setAjustesAbiertos(false)} />
    </SafeAreaView>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  safe: {
    flex: 1,
  },
  zonaInferior: {
    backgroundColor: colors.fondoBienvenida,
  },
  // Degradado del fondo con las líneas de pulso.
  cabecera: {
    flex: 1,
    overflow: "hidden",
  },
  // Logo arriba a la izquierda y ajustes a la derecha, en la misma fila: no tapa las líneas ni la loma.
  marca: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: MARGEN - 4,
    paddingRight: MARGEN - 8,
    paddingTop: 14,
  },
  ajustes: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.botonSobreFondo,
  },
  texto: {
    paddingHorizontal: MARGEN,
  },
  titular: {
    fontFamily: fonts.heading,
    fontSize: 46,
    lineHeight: 46,
    letterSpacing: -0.5,
    color: colors.text,
  },
  punto: {
    color: colors.puntoBienvenida,
  },
  // En oscuro el texto va sobre la zona inferior azul profundo (en claro, sobre la zona blanca).
  sobreFondo: {
    color: colors.textoSobreFondo,
  },
  linkSobreFondo: {
    color: colors.acentoSobreFondo,
  },
  bajada: {
    marginTop: 12,
    maxWidth: 320,
  },
  acciones: {
    paddingHorizontal: MARGEN,
    paddingTop: 28,
    paddingBottom: 16,
    gap: 22,
  },
  // Como en el diseño: botón compacto con flecha, alineado a la derecha.
  respiro: {
    alignSelf: "flex-end",
  },
  boton: {
    flexDirection: "row",
    gap: 10,
    minWidth: 156,
    height: 54,
    paddingHorizontal: 26,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.bordeBotonBienvenida,
    backgroundColor: colors.botonBienvenida,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.colorSombra,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  // Mismo color también al presionar: solo baja apenas la opacidad.
  presionado: {
    opacity: 0.85,
  },
  botonTexto: {
    fontFamily: fonts.heading,
    fontSize: 19,
    letterSpacing: 0.3,
    color: colors.textoBotonBienvenida,
  },
  ingresar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  link: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.accent700,
  },
});
