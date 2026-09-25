import React from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, fonts } from "@/theme/typography";
import { AuthStackParamList } from "@/navigation/types";
import { DoctoraIlustracion, PROPORCION_ILUSTRACION } from "@/components/DoctoraIlustracion";
import { Logo } from "@/components/Logo";

type Props = NativeStackScreenProps<AuthStackParamList, "Bienvenida">;

const MARGEN = 28;

/**
 * Bienvenida: composición editorial. Arriba el retrato de la doctora en su
 * arco, alineado al margen derecho del texto; abajo, titular, bajada y
 * acciones sobre el mismo margen izquierdo.
 */
export function BienvenidaScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  // El retrato ocupa el ancho del contenido (así el arco cierra en el margen
  // derecho del texto) sin pasar del 47% del alto, para que la pantalla respire.
  const anchoContenido = Math.min(width, 480) - MARGEN * 2;
  const anchoIlustracion = Math.min(anchoContenido, height * 0.47 * PROPORCION_ILUSTRACION);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <View style={styles.marca}>
        <Logo size={20} wordmark disposicion="horizontal" />
      </View>

      <View style={styles.ilustracion}>
        <DoctoraIlustracion width={anchoIlustracion} />
      </View>

      <View style={styles.texto}>
        <Text style={styles.titular} accessibilityRole="header">
          Tu salud{"\n"}no espera<Text style={styles.punto}>.</Text>
        </Text>
        <Text style={[body(15, colors.neutral700), styles.bajada]}>
          Te avisamos cuando se libera un cupo con tu especialista, y lo tomás en dos toques.
        </Text>
      </View>

      <View style={styles.acciones}>
        <Pressable
          onPress={() => navigation.navigate("RegistroDatos")}
          accessibilityRole="button"
          accessibilityLabel="Empezar"
          style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
        >
          <Text style={styles.botonTexto}>Empezar</Text>
        </Pressable>
        <View style={styles.ingresar}>
          <Text style={body(14, colors.neutral700)}>¿Ya tenés cuenta? </Text>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión"
          >
            <Text style={styles.link}>Iniciá sesión</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.accent100,
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
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent900,
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
    color: "#ffffff",
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
