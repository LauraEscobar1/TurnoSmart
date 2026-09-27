import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { body, fonts, heading } from "@/theme/typography";
import { useDato, useT } from "@/i18n";
import { RootStackParamList } from "@/navigation/types";
import { useAuth, usePaciente } from "@/auth/AuthContext";
import { CATALOGO_ESPECIALIDADES } from "@/data/mockData";
import { Card } from "@/components/Card";
import { TextField } from "@/components/forms";
import { ScreenHeader } from "@/components/ScreenHeader";

type Props = NativeStackScreenProps<RootStackParamList, "BuscarEspecialista">;

/** Compara sin tildes ni mayúsculas: «cardio» encuentra «Cardiología». */
const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Buscar especialista: el paciente se suma (o se quita) de la lista de
 * espera de una especialidad. Es la misma preferencia que se elige en el
 * registro y en Perfil › Preferencias, y la que usa la IA para ofrecer cupos.
 */
export function BuscarEspecialistaScreen({ navigation }: Props) {
  const t = useT();
  const dato = useDato();
  const paciente = usePaciente();
  const { actualizar } = useAuth();
  const [busqueda, setBusqueda] = useState("");

  const resultados = useMemo(() => {
    const q = normalizar(busqueda);
    // Busca por el nombre que ve el paciente (en su idioma) y por el original.
    return CATALOGO_ESPECIALIDADES.filter(
      (e) => normalizar(dato("especialidades", e)).includes(q) || normalizar(e).includes(q)
    );
  }, [busqueda, dato]);

  const enEspera = (e: string) => paciente.especialidadesInteres.includes(e);

  const alternar = (e: string) =>
    actualizar({
      especialidadesInteres: enEspera(e)
        ? paciente.especialidadesInteres.filter((x) => x !== e)
        : [...paciente.especialidadesInteres, e],
    });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <ScreenHeader title={t("buscar.titulo")} onBack={navigation.goBack} />
      <FlatList
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.cabecera}>
            <TextField
              label={t("buscar.especialidad")}
              placeholder={t("buscar.placeholder")}
              value={busqueda}
              onChangeText={setBusqueda}
              autoCorrect={false}
              returnKeyType="search"
            />
            <Text style={body(13, colors.neutral700)}>
              {t("buscar.bajada")}
            </Text>
          </View>
        }
        data={resultados}
        keyExtractor={(e) => e}
        renderItem={({ item }) => {
          const activa = enEspera(item);
          return (
            <Card style={styles.fila}>
              <View style={styles.icono}>
                <Ionicons name="medkit-outline" size={18} color={colors.accent700} />
              </View>
              <View style={styles.texto}>
                <Text style={heading(17, colors.accent900)}>{dato("especialidades", item)}</Text>
                <Text style={body(12, activa ? colors.accent700 : colors.neutral600)}>
                  {t(activa ? "buscar.enTuLista" : "buscar.sinLista")}
                </Text>
              </View>
              <Pressable
                onPress={() => alternar(item)}
                accessibilityRole="button"
                accessibilityLabel={t(activa ? "buscar.quitar" : "buscar.sumarmeA", { especialidad: dato("especialidades", item) })}
                style={({ pressed }) => [
                  styles.boton,
                  activa ? styles.botonActivo : styles.botonInactivo,
                  pressed && styles.presionado,
                ]}
              >
                {activa ? <Ionicons name="checkmark" size={14} color={colors.accent700} /> : null}
                <Text style={[styles.botonTexto, { color: activa ? colors.accent700 : "#ffffff" }]}>
                  {t(activa ? "buscar.enEspera" : "buscar.sumarme")}
                </Text>
              </Pressable>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Text style={[body(14, colors.neutral700), styles.vacio]}>{t("buscar.sinResultados", { busqueda: busqueda.trim() })}</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
  },
  content: {
    padding: 20,
    gap: 10,
  },
  cabecera: {
    gap: 10,
    marginBottom: 6,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  icono: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent100,
    alignItems: "center",
    justifyContent: "center",
  },
  texto: {
    flex: 1,
    minWidth: 0,
  },
  boton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  botonActivo: {
    backgroundColor: colors.accent100,
  },
  botonInactivo: {
    backgroundColor: colors.accent,
  },
  presionado: {
    opacity: 0.8,
  },
  botonTexto: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  vacio: {
    textAlign: "center",
    marginTop: 24,
  },
});
