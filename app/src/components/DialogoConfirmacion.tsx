import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, { FadeIn, ReduceMotion, ZoomIn } from "react-native-reanimated";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { radius } from "@/theme/spacing";
import { body, heading } from "@/theme/typography";
import { PrimaryButton } from "@/components/PrimaryButton";
import { CON_DESENFOQUE } from "@/components/Vidrio";
import { useT } from "@/i18n";

interface DialogoConfirmacionProps {
  visible: boolean;
  titulo: string;
  descripcion: string;
  /** Acción que se confirma (destructiva: relleno de error). */
  confirmar: string;
  /** Salida sin cambios. */
  cancelar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  icono?: keyof typeof Ionicons.glyphMap;
}

/**
 * Diálogo centrado para confirmar una acción destructiva: la pantalla queda
 * desenfocada bajo un velo y la tarjeta entra con un leve zoom (sin
 * movimiento con «Reducir movimiento»). Tocar fuera equivale a cancelar.
 */
export function DialogoConfirmacion({
  visible,
  titulo,
  descripcion,
  confirmar,
  cancelar,
  onConfirmar,
  onCancelar,
  icono = "trash-outline",
}: DialogoConfirmacionProps) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={styles.contenedor}>
        {CON_DESENFOQUE ? <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <Pressable style={styles.velo} onPress={onCancelar} accessibilityLabel={t("comun.cerrar")} />
        <Animated.View
          entering={ZoomIn.duration(220).springify().reduceMotion(ReduceMotion.System)}
          style={styles.dialogo}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <Animated.View entering={FadeIn.delay(80).reduceMotion(ReduceMotion.System)} style={styles.icono}>
            <Ionicons name={icono} size={24} color={colors.sobreEstado} />
          </Animated.View>
          <Text style={[heading(22, colors.accent900), styles.centrado]}>{titulo}</Text>
          <Text style={[body(14, colors.neutral700), styles.centrado]}>{descripcion}</Text>
          <View style={styles.acciones}>
            <PrimaryButton label={confirmar} variant="destructive" onPress={onConfirmar} />
            <PrimaryButton label={cancelar} variant="secondary" onPress={onCancelar} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    contenedor: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    velo: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.velo,
    },
    dialogo: {
      alignSelf: "stretch",
      maxWidth: 420,
      alignItems: "center",
      gap: 10,
      paddingTop: 24,
      paddingHorizontal: 22,
      paddingBottom: 20,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.bordeCard,
      backgroundColor: colors.superficie,
      shadowColor: colors.sombraCard,
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    icono: {
      width: 52,
      height: 52,
      borderRadius: 26,
      marginBottom: 4,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.errorSolido,
    },
    centrado: {
      textAlign: "center",
    },
    acciones: {
      alignSelf: "stretch",
      gap: 10,
      marginTop: 8,
    },
  });
