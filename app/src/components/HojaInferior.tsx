import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { body, heading } from "@/theme/typography";
import { useT } from "@/i18n";

interface HojaInferiorProps {
  visible: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}

/**
 * Hoja que sube desde abajo para decisiones propias de una pantalla
 * (confirmar una cancelación, elegir un horario). Tocar el fondo la cierra.
 */
export function HojaInferior({ visible, onCerrar, titulo, descripcion, children }: HojaInferiorProps) {
  const insets = useSafeAreaInsets();
  const t = useT();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={styles.contenedor}>
        <Pressable style={styles.fondo} onPress={onCerrar} accessibilityLabel={t("comun.cerrar")} />
        <View style={[styles.hoja, { paddingBottom: 20 + insets.bottom }]} accessibilityViewIsModal>
          <View style={styles.tirador} />
          <Text style={heading(22, colors.accent900)}>{titulo}</Text>
          {descripcion ? <Text style={[body(14, colors.neutral700), styles.descripcion]}>{descripcion}</Text> : null}
          <View style={styles.cuerpo}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: "flex-end",
  },
  fondo: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(29,45,61,0.45)",
  },
  hoja: {
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.superficie,
  },
  tirador: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.neutral300,
    marginBottom: 16,
  },
  descripcion: {
    marginTop: 6,
  },
  cuerpo: {
    marginTop: 18,
    gap: 10,
  },
});
