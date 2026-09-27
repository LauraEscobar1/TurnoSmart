import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, heading } from "@/theme/typography";
import { useT } from "@/i18n";
import { AuthStackParamList } from "@/navigation/types";
import { AuthError, DatosCuenta, validarDatosCuenta, verificarDisponibilidad } from "@/services/authService";
import { TextField } from "@/components/forms";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StepHeader, StepProgress } from "@/components/StepHeader";
import { FormScreen } from "@/screens/Auth/FormScreen";
import { useRegistro } from "@/screens/Auth/RegistroContext";

type Props = NativeStackScreenProps<AuthStackParamList, "RegistroDatos">;
type Errores = Partial<Record<keyof DatosCuenta | "confirmar", string>>;

/** 04 · Acceso — 02 Registro, datos (1 / 3). */
export function RegistroDatosScreen({ navigation }: Props) {
  const t = useT();
  const { datos, setDatos } = useRegistro();
  const [form, setForm] = useState(datos);
  const [confirmar, setConfirmar] = useState(datos.password);
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
    const e: Errores = validarDatosCuenta(form);
    if (!e.password && confirmar !== form.password) e.confirmar = t("errores.noCoinciden");
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
      header={<StepHeader title={t("login.crearCuenta")} step={1} total={3} onBack={navigation.goBack} />}
      footer={<PrimaryButton label={t("registro.continuar")} onPress={continuar} disabled={enviando} />}
    >
      <View style={styles.marca}>
        <Logo size={40} />
        <Text style={[heading(26), styles.center, styles.titulo]}>{t("registro.tusDatos")}</Text>
        <Text style={[body(13, colors.neutral700), styles.center]}>
          {t("registro.tusDatosBajada")}
        </Text>
      </View>
      <StepProgress step={1} total={3} />
      <View style={styles.row}>
        <TextField label={t("datos.nombre")} autoComplete="given-name" textContentType="givenName" style={styles.half} {...campo("nombre")} />
        <TextField label={t("registro.apellido")} autoComplete="family-name" textContentType="familyName" style={styles.half} {...campo("apellido")} />
      </View>
      <TextField label={t("datos.cedula")} keyboardType="number-pad" {...campo("cedula")} />
      <TextField
        label={t("comun.correo")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        {...campo("email")}
      />
      <TextField label={t("datos.telefono")} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" {...campo("telefono")} />
      <TextField
        label={t("comun.password")}
        revelable
        autoComplete="new-password"
        textContentType="newPassword"
        hint={t("errores.passwordMinimo")}
        {...campo("password")}
      />
      <TextField
        label={t("comun.confirmarPassword")}
        revelable
        autoComplete="new-password"
        textContentType="newPassword"
        value={confirmar}
        error={errores.confirmar}
        onChangeText={(v) => {
          setConfirmar(v);
          if (errores.confirmar) setErrores((e) => ({ ...e, confirmar: undefined }));
        }}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  marca: {
    alignItems: "center",
  },
  titulo: {
    marginTop: 12,
    marginBottom: 2,
  },
  center: {
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  half: {
    flex: 1,
  },
});
