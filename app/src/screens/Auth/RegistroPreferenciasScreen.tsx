import React, { useState } from "react";
import { Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, heading } from "@/theme/typography";
import { AuthStackParamList } from "@/navigation/types";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StepHeader, StepProgress } from "@/components/StepHeader";
import { PreferenciasForm } from "@/components/PreferenciasForm";
import { FormScreen } from "@/screens/Auth/FormScreen";
import { useRegistro } from "@/screens/Auth/RegistroContext";

type Props = NativeStackScreenProps<AuthStackParamList, "RegistroPreferencias">;

/**
 * 04 · Acceso — 03 Registro, preferencias (2 / 3).
 * Captura los mismos factores que después muestra el panel de
 * explicabilidad: especialidad, franja y distancia.
 */
export function RegistroPreferenciasScreen({ navigation }: Props) {
  const { preferencias, setPreferencias } = useRegistro();
  const [form, setForm] = useState(preferencias);
  const [error, setError] = useState<string>();

  function continuar() {
    if (form.especialidadesInteres.length === 0) {
      setError("Elegí al menos una especialidad.");
      return;
    }
    setPreferencias(form);
    navigation.navigate("RegistroVerificacion");
  }

  return (
    <FormScreen
      header={<StepHeader title="Crear cuenta" step={2} total={3} onBack={navigation.goBack} />}
      footer={<PrimaryButton label="Continuar" onPress={continuar} />}
    >
      <StepProgress step={2} total={3} />
      <View>
        <Text style={heading(26)}>¿Qué cupos te sirven?</Text>
        <Text style={[body(13, colors.neutral700), { marginTop: 4 }]}>
          Con esto la IA decide qué ofertas enviarte. Te mostraremos siempre por qué.
        </Text>
      </View>
      <PreferenciasForm
        value={form}
        onChange={(v) => {
          setForm(v);
          if (v.especialidadesInteres.length) setError(undefined);
        }}
        errorEspecialidades={error}
      />
    </FormScreen>
  );
}
