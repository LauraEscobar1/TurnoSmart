import React, { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { body, fonts } from "@/theme/typography";
import { useT } from "@/i18n";
import { AuthStackParamList } from "@/navigation/types";
import { DoctoraIlustracion, PROPORCION_ILUSTRACION } from "@/components/DoctoraIlustracion";
import { Logo } from "@/components/Logo";
import { OndasPulso } from "@/components/OndasPulso";

type Props = NativeStackScreenProps<AuthStackParamList, "Bienvenida">;

const MARGEN = 28;

/**
 * Bienvenida. Modo claro: arriba la zona azul con líneas de pulso y el logo
 * en blanco, que cierra en una curva; abajo, sobre la zona clara, titular,
 * bajada y acciones. Modo oscuro: el retrato de la doctora en su arco,
 * alineado al margen derecho del texto. Textos y botón, iguales en ambos.
 */
export function BienvenidaScreen({ navigation }: Props) {
  const { colors, oscuro } = useTema();
  const insets = useSafeAreaInsets();
  // Tamaño de la zona azul (modo claro), para dibujar las ondas a su medida.
  const [cabecera, setCabecera] = useState({ width: 0, height: 0 });
  const styles = useEstilos(crearStyles);
  const t = useT();
  const { width, height } = useWindowDimensions();
  // El retrato ocupa el ancho del contenido (así el arco cierra en el margen
  // derecho del texto) sin pasar del 47% del alto, para que la pantalla respire.
  const anchoContenido = Math.min(width, 480) - MARGEN * 2;
  const anchoIlustracion = Math.min(anchoContenido, height * 0.47 * PROPORCION_ILUSTRACION);

  return (
    // En claro la zona azul llega hasta arriba (bajo la barra de estado); en oscuro, igual que siempre.
    <SafeAreaView edges={oscuro ? ["top", "bottom"] : ["bottom"]} style={styles.safe}>
      {oscuro ? (
        <>
          <View style={styles.marca}>
            <Logo size={20} wordmark disposicion="horizontal" />
          </View>

          <View style={styles.ilustracion}>
            <DoctoraIlustracion width={anchoIlustracion} />
          </View>
        </>
      ) : (
        <View
          style={[styles.cabecera, { paddingTop: insets.top }]}
          onLayout={(e) => setCabecera({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
          <StatusBar style="light" />
          <OndasPulso
            width={cabecera.width}
            height={cabecera.height}
            color={colors.trazoSobreFondo}
            colorCurva={colors.fondoBienvenida}
          />
          <View style={styles.marca}>
            <Logo size={20} wordmark disposicion="horizontal" color={colors.trazoSobreFondo} acento={colors.trazoSobreFondo} />
          </View>
        </View>
      )}

      <View style={styles.texto}>
        <Text style={styles.titular} accessibilityRole="header">
          {t("bienvenida.titular")}
          <Text style={styles.punto}>.</Text>
        </Text>
        <Text style={[body(15, colors.neutral700), styles.bajada]}>
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
          <Text style={body(14, colors.neutral700)}>{t("bienvenida.yaTenesCuenta")} </Text>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("login.iniciarSesion")}
          >
            <Text style={styles.link}>{t("bienvenida.iniciaSesion")}</Text>
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
    backgroundColor: colors.fondoBienvenida,
  },
  // Modo claro: zona azul con las líneas de pulso; ocupa el lugar de la ilustración.
  cabecera: {
    flex: 1,
    backgroundColor: colors.fondoPantalla,
    overflow: "hidden",
  },
  marca: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: MARGEN,
    paddingTop: 12,
  },
  ilustracion: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: MARGEN,
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
    color: colors.accent,
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
  presionado: {
    backgroundColor: colors.accent700,
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
