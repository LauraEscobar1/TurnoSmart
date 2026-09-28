import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { sombra } from "@/theme/spacing";
import { heading } from "@/theme/typography";
import { Paciente } from "@/types/domain";
import { iniciales } from "@/utils/perfil";
import { useT } from "@/i18n";

interface Props {
  paciente: Paciente;
  size: number;
  /** Con `onPress`, lleva la insignia de cámara para subir o cambiar la foto. */
  onPress?: () => void;
}

/** Círculo del paciente: su foto si la subió; si no, sus iniciales. */
export function AvatarPaciente({ paciente, size, onPress }: Props) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const circulo = { width: size, height: size, borderRadius: size / 2 };
  const insignia = Math.round(size * 0.28);

  const contenido = (
    <View style={[styles.circulo, circulo]}>
      {paciente.fotoUri ? (
        <Image source={{ uri: paciente.fotoUri }} style={circulo} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={heading(Math.round(size * 0.36), colors.accent700)}>{iniciales(paciente)}</Text>
      )}
    </View>
  );

  if (!onPress) return contenido;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t(paciente.fotoUri ? "perfil.cambiarFotoPerfil" : "perfil.subirFotoPerfil")}
      style={({ pressed }) => pressed && styles.presionado}
    >
      {contenido}
      <View style={[styles.insignia, { width: insignia, height: insignia, borderRadius: insignia / 2 }]}>
        <Ionicons name="camera" size={Math.round(insignia * 0.5)} color={colors.sobreAcento} />
      </View>
    </Pressable>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  circulo: {
    backgroundColor: colors.accent200,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  insignia: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.superficie,
    alignItems: "center",
    justifyContent: "center",
    ...sombra.sm,
  },
  presionado: {
    opacity: 0.8,
  },
});
