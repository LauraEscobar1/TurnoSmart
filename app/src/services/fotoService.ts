import * as ImagePicker from "expo-image-picker";

/**
 * Abre la galería para elegir la foto de perfil, recortada en cuadrado.
 * Devuelve la URI local, o null si el paciente cancela o no da permiso.
 * Con backend, la foto se subiría y se guardaría su URL; la firma no cambia.
 */
export async function elegirFotoPerfil(): Promise<string | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) return null;
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (resultado.canceled) return null;
  return resultado.assets[0]?.uri ?? null;
}
