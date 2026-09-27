import React, { useState } from "react";
import { Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { body, heading } from "@/theme/typography";
import { useT } from "@/i18n";
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
  const { colors } = useTema();
  const t = useT();
  const { preferencias, setPreferencias } = useRegistro();
  const [form, setForm] = useState(preferencias);
  const [error, setError] = useState<string>();

  function continuar() {
    if (form.especialidadesInteres.length === 0) {
      setError(t("preferencias.errorEspecialidad"));
      return;
    }
    setPreferencias(form);
    navigation.navigate("RegistroVerificacion");
  }

  return (
    <FormScreen
      header={<StepHeader title={t("login.crearCuenta")} step={2} total={3} onBack={navigation.goBack} />}
      footer={<PrimaryButton label={t("registro.continuar")} onPress={continuar} />}
    >
      <StepProgress step={2} total={3} />
      <View>
        <Text style={heading(26, colors.text)}>{t("registro.queCupos")}</Text>
        <Text style={[body(13, colors.neutral700), { marginTop: 4 }]}>
          {t("registro.queCuposBajada")}
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
