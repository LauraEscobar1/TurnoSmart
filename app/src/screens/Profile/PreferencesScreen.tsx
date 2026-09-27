import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { body } from "@/theme/typography";
import { useT } from "@/i18n";
import { useAuth, usePaciente } from "@/auth/AuthContext";
import { PreferenciasCupo } from "@/services/authService";
import { PreferenciasForm } from "@/components/PreferenciasForm";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";

/**
 * Preferencias del paciente: especialidades, franja y distancia.
 * Es el mismo formulario del paso 2 del registro, y alimenta directamente
 * al motor de priorización de IA (docs/01-arquitectura-informacion.md §2.2).
 */
export function PreferencesScreen() {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const navigation = useNavigation();
  const paciente = usePaciente();
  const { actualizar } = useAuth();
  const [form, setForm] = useState<PreferenciasCupo>({
    especialidadesInteres: paciente.especialidadesInteres,
    franjaPreferida: paciente.franjaPreferida,
    distanciaMaxKm: paciente.distanciaMaxKm,
  });
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (form.especialidadesInteres.length === 0) {
      setError(t("preferencias.errorEspecialidad"));
      return;
    }
    setGuardando(true);
    await actualizar(form);
    setGuardando(false);
    navigation.goBack();
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <ScreenHeader title={t("preferencias.titulo")} onBack={navigation.goBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={body(13, colors.neutral700)}>
            {t("preferencias.bajada")}
          </Text>
          <PreferenciasForm
            value={form}
            onChange={(v) => {
              setForm(v);
              if (v.especialidadesInteres.length) setError(undefined);
            }}
            errorEspecialidades={error}
          />
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton label={t("comun.guardar")} onPress={guardar} disabled={guardando} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
  },
  content: {
    padding: 18,
    gap: 16,
  },
  footer: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
