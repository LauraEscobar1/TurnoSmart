import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { colors } from "@/theme/colors";
import { body } from "@/theme/typography";
import { useAuth, usePaciente } from "@/auth/AuthContext";
import { PreferenciasCupo } from "@/services/authService";
import { PreferenciasForm } from "@/components/PreferenciasForm";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";

/**
 * Preferencias del paciente: especialidades, franja, distancia y obra social.
 * Es el mismo formulario del paso 2 del registro, y alimenta directamente
 * al motor de priorización de IA (docs/01-arquitectura-informacion.md §2.2).
 */
export function PreferencesScreen() {
  const navigation = useNavigation();
  const paciente = usePaciente();
  const { actualizar } = useAuth();
  const [form, setForm] = useState<PreferenciasCupo>({
    especialidadesInteres: paciente.especialidadesInteres,
    franjaPreferida: paciente.franjaPreferida,
    distanciaMaxKm: paciente.distanciaMaxKm,
    obraSocial: paciente.obraSocial,
  });
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (form.especialidadesInteres.length === 0) {
      setError("Elegí al menos una especialidad.");
      return;
    }
    setGuardando(true);
    await actualizar({ ...form, obraSocial: form.obraSocial.trim() });
    setGuardando(false);
    navigation.goBack();
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <ScreenHeader title="Preferencias" onBack={navigation.goBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={body(13, colors.neutral700)}>
            Usamos estas preferencias para decidir a quién ofrecer cada cupo liberado.
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
          <PrimaryButton label="Guardar" onPress={guardar} disabled={guardando} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
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
