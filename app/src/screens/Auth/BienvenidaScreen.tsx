import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { body, fonts } from "@/theme/typography";
import { useT } from "@/i18n";
import { AuthStackParamList } from "@/navigation/types";
import { Logo } from "@/components/Logo";
import { OndasPulso } from "@/components/OndasPulso";
import { FondoDegradado } from "@/components/Vidrio";

type Props = NativeStackScreenProps<AuthStackParamList, "Bienvenida">;

const MARGEN = 28;

/**
 * Bienvenida, igual en los dos modos: arriba el degradado del fondo con
 * líneas de electrocardiograma y el logo, que cierra en una curva; abajo,
 * sobre la zona inferior, titular, bajada y acciones. El electrocardiograma,
 * el logo y el botón usan exactamente el mismo color: el primario de la
 * Bienvenida en cada modo (Blue Lobster en claro, Rock Blue en oscuro).
 */
export function BienvenidaScreen({ navigation }: Props) {
  const { colors, oscuro } = useTema();
  const insets = useSafeAreaInsets();
  // Tamaño de la zona del degradado, para dibujar las ondas a su medida.
  const [cabecera, setCabecera] = useState({ width: 0, height: 0 });
  const styles = useEstilos(crearStyles);
  const t = useT();

  return (
    // La zona del degradado llega hasta arriba (bajo la barra de estado).
    <SafeAreaView edges={["bottom"]} style={[styles.safe, styles.zonaInferior]}>
      <FondoDegradado
        style={[styles.cabecera, { paddingTop: insets.top }]}
        onLayout={(e) => setCabecera({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        <OndasPulso
          width={cabecera.width}
          height={cabecera.height}
          color={colors.botonBienvenida}
          colorCurva={colors.fondoBienvenida}
        />
        <View style={styles.marca}>
          <Logo size={20} wordmark disposicion="horizontal" color={colors.botonBienvenida} acento={colors.botonBienvenida} />
        </View>
      </FondoDegradado>

      <View style={styles.texto}>
        <Text style={[styles.titular, oscuro && styles.sobreFondo]} accessibilityRole="header">
          {t("bienvenida.titular")}
          <Text style={styles.punto}>.</Text>
        </Text>
        <Text style={[body(15, oscuro ? colors.textoSuaveSobreFondo : colors.neutral700), styles.bajada]}>
          {t("bienvenida.bajada")}
        </Text>
      </View>

      <View style={styles.acciones}>
        <Pressable
          onPress={() => navigation.navigate("RegistroDatos")}
          accessibilityRole="button"
          accessibilityLabel={t("intro.empezar")}
          style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
        >
          <Text style={styles.botonTexto}>{t("intro.empezar")}</Text>
        </Pressable>
        <View style={styles.ingresar}>
          <Text style={body(14, oscuro ? colors.textoSuaveSobreFondo : colors.neutral700)}>{t("bienvenida.yaTenesCuenta")} </Text>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("login.iniciarSesion")}
          >
            <Text style={[styles.link, oscuro && styles.linkSobreFondo]}>{t("bienvenida.iniciaSesion")}</Text>
          </Pressable>
        </View>
      </View>
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
  marca: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: MARGEN,
    paddingTop: 12,
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
    color: colors.botonBienvenida,
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
    gap: 18,
  },
  boton: {
    height: 54,
    borderRadius: 16,
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
