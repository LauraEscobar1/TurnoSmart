import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { heading } from "@/theme/typography";
import { AuthStackParamList } from "@/navigation/types";
import { AuthError, DatosCuenta, validarDatosCuenta, verificarDisponibilidad } from "@/services/authService";
import { TextField } from "@/components/forms";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StepHeader, StepProgress } from "@/components/StepHeader";
import { FormScreen } from "@/screens/Auth/FormScreen";
import { useRegistro } from "@/screens/Auth/RegistroContext";

type Props = NativeStackScreenProps<AuthStackParamList, "RegistroDatos">;
type Errores = Partial<Record<keyof DatosCuenta, string>>;

/** 04 · Acceso — 02 Registro, datos (1 / 3). */
export function RegistroDatosScreen({ navigation }: Props) {
  const { datos, setDatos } = useRegistro();
  const [form, setForm] = useState(datos);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);

  const campo = (k: keyof DatosCuenta) => ({
    value: form[k],
    error: errores[k],
    onChangeText: (v: string) => {
      setForm((f) => ({ ...f, [k]: v }));
      if (errores[k]) setErrores((e) => ({ ...e, [k]: undefined }));
    },
  });

  async function continuar() {
    const e = validarDatosCuenta(form);
    setErrores(e);
    if (Object.keys(e).length) return;
    setEnviando(true);
    try {
      await verificarDisponibilidad(form);
      setDatos(form);
      navigation.navigate("RegistroPreferencias");
    } catch (err) {
      if (err instanceof AuthError && err.campo) setErrores({ [err.campo]: err.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <FormScreen
      header={<StepHeader title="Crear cuenta" step={1} total={3} onBack={navigation.goBack} />}
      footer={<PrimaryButton label="Continuar" onPress={continuar} disabled={enviando} />}
    >
      <StepProgress step={1} total={3} />
      <Text style={heading(26)}>Tus datos</Text>
      <View style={styles.row}>
        <TextField label="Nombre" autoComplete="given-name" textContentType="givenName" style={styles.half} {...campo("nombre")} />
        <TextField label="Apellido" autoComplete="family-name" textContentType="familyName" style={styles.half} {...campo("apellido")} />
      </View>
      <TextField label="DNI" keyboardType="number-pad" {...campo("dni")} />
      <TextField
        label="Correo electrónico"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        {...campo("email")}
      />
      <TextField label="Teléfono" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" {...campo("telefono")} />
      <TextField
        label="Contraseña"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        hint="Mínimo 8 caracteres, un número."
        {...campo("password")}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  half: {
    flex: 1,
  },
});
