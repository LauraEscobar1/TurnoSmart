import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, fonts, heading } from "@/theme/typography";
import { AuthStackParamList } from "@/navigation/types";
import { AuthError, restablecerPassword, solicitarRestablecimiento } from "@/services/authService";
import { CodeInput, LARGO_CODIGO, ReenviarCodigo, useEnvioCodigo } from "@/components/CodeInput";
import { TextField } from "@/components/forms";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { BackBar } from "@/components/StepHeader";
import { FormScreen } from "@/screens/Auth/FormScreen";

type Props = NativeStackScreenProps<AuthStackParamList, "RestablecerPassword">;

/**
 * Restablecer contraseña en dos momentos sobre la misma pantalla:
 * 1) el correo y «Enviar código»; 2) el código y la contraseña nueva.
 */
export function RestablecerPasswordScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? "");
  const [enviado, setEnviado] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [errores, setErrores] = useState<Record<string, string | undefined>>({});
  const [enviando, setEnviando] = useState(false);

  const envio = useEnvioCodigo(
    useCallback(() => solicitarRestablecimiento(email), [email]),
    { alMontar: false }
  );

  async function enviarCodigo() {
    setErrores({});
    setEnviando(true);
    try {
      await envio.reenviar();
      setEnviado(true);
    } catch (e) {
      if (e instanceof AuthError) setErrores({ [e.campo ?? "email"]: e.message });
    } finally {
      setEnviando(false);
    }
  }

  async function cambiar() {
    if (password !== confirmar) {
      setErrores({ confirmar: "Las contraseñas no coinciden." });
      return;
    }
    setErrores({});
    setEnviando(true);
    try {
      await restablecerPassword(email, codigo, password);
      navigation.navigate("Login", { aviso: "Listo: ya podés ingresar con tu contraseña nueva." });
    } catch (e) {
      if (e instanceof AuthError) setErrores({ [e.campo ?? "codigo"]: e.message });
      setEnviando(false);
    }
  }

  return (
    <FormScreen
      header={<BackBar onBack={navigation.goBack} />}
      footer={
        enviado ? (
          <PrimaryButton
            label="Cambiar contraseña"
            onPress={cambiar}
            disabled={enviando || codigo.length < LARGO_CODIGO}
          />
        ) : (
          <PrimaryButton label="Enviar código" onPress={enviarCodigo} disabled={enviando} />
        )
      }
    >
      <View style={styles.marca}>
        <Logo size={44} wordmark />
        <Text style={[heading(24), styles.center, styles.titulo]}>Restablecer contraseña</Text>
        <Text style={[body(13, colors.neutral700), styles.center]}>
          {enviado
            ? `Enviamos un código de 6 dígitos a ${email.trim()}.`
            : "Ingresá tu correo y te enviamos un código para crear una nueva."}
        </Text>
        <View style={styles.sobre}>
          <Ionicons name="mail-outline" size={20} color={colors.accent700} />
        </View>
      </View>

      {enviado ? (
        <>
          <CodeInput value={codigo} onChange={setCodigo} autoFocus />
          {errores.codigo ? <Text style={styles.error}>{errores.codigo}</Text> : null}
          <ReenviarCodigo restante={envio.restante} codigoPrueba={envio.codigoPrueba} onReenviar={envio.reenviar} />
          <TextField
            label="Contraseña nueva"
            value={password}
            onChangeText={setPassword}
            revelable
            autoComplete="new-password"
            textContentType="newPassword"
            hint="Mínimo 8 caracteres, un número."
            error={errores.password}
          />
          <TextField
            label="Confirmar contraseña"
            value={confirmar}
            onChangeText={setConfirmar}
            revelable
            autoComplete="new-password"
            textContentType="newPassword"
            error={errores.confirmar}
          />
        </>
      ) : (
        <TextField
          label="Correo electrónico"
          placeholder="nombre@correo.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          error={errores.email}
        />
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  marca: {
    alignItems: "center",
    paddingTop: 4,
  },
  titulo: {
    marginTop: 18,
    marginBottom: 4,
  },
  center: {
    textAlign: "center",
  },
  sobre: {
    width: 48,
    height: 48,
    marginTop: 14,
    borderRadius: 24,
    backgroundColor: colors.accent100,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text,
    marginTop: -8,
  },
});
