import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as LocalAuthentication from "expo-local-authentication";
import { colors } from "@/theme/colors";
import { body, fonts, heading } from "@/theme/typography";
import { AuthStackParamList } from "@/navigation/types";
import { useAuth } from "@/auth/AuthContext";
import { AuthError, getUltimoUsuario } from "@/services/authService";
import { TextField } from "@/components/forms";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { BackBar } from "@/components/StepHeader";
import { FormScreen } from "@/screens/Auth/FormScreen";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

/** Acceso — Iniciar sesión: marca centrada, correo, contraseña y Face ID. */
export function LoginScreen({ navigation, route }: Props) {
  const { iniciarSesion, iniciarSesionBiometrica } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ campo?: string; mensaje: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(route.params?.aviso ?? null);
  const [enviando, setEnviando] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  // Al volver de «Restablecer contraseña» llega el aviso por parámetro.
  useEffect(() => {
    if (route.params?.aviso) setAviso(route.params.aviso);
  }, [route.params?.aviso]);

  async function ingresar() {
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      await iniciarSesion(email, password);
    } catch (e) {
      setError(e instanceof AuthError ? { campo: e.campo, mensaje: e.message } : { mensaje: "No pudimos iniciar sesión." });
      setEnviando(false);
    }
  }

  async function ingresarConFaceId() {
    setError(null);
    setAviso(null);
    if (!(await getUltimoUsuario())) {
      setAviso("Ingresá una vez con tu correo para activar Face ID.");
      return;
    }
    const disponible = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    if (!disponible) {
      setAviso("Face ID no está disponible o configurado en este dispositivo.");
      return;
    }
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: "Ingresar a TurnoSmart",
      cancelLabel: "Cancelar",
      disableDeviceFallback: false,
    });
    if (!r.success) return; // canceló: no es un error que mostrar
    try {
      await iniciarSesionBiometrica();
    } catch (e) {
      setAviso(e instanceof AuthError ? e.message : "No pudimos iniciar sesión.");
    }
  }

  return (
    <FormScreen
      header={navigation.canGoBack() ? <BackBar onBack={navigation.goBack} /> : undefined}
      footer={
        <>
          <PrimaryButton label="Iniciar sesión" onPress={ingresar} disabled={enviando} />
          <PrimaryButton label="Ingresar con Face ID" variant="secondary" onPress={ingresarConFaceId} />
          <View style={styles.signup}>
            <Text style={body(13, colors.neutral700)}>¿No tenés cuenta? </Text>
            <Pressable onPress={() => navigation.navigate("RegistroDatos")} hitSlop={8}>
              <Text style={[body(13, colors.accent700), styles.link]}>Crear cuenta</Text>
            </Pressable>
          </View>
        </>
      }
    >
      <View style={styles.marca}>
        <Logo size={52} wordmark />
        <Text style={[heading(24), styles.center, styles.titulo]}>Ingresá a tu cuenta</Text>
        <Text style={[body(13, colors.neutral700), styles.center]}>Para ver tus ofertas de cupo y tus citas.</Text>
      </View>

      <TextField
        label="Correo electrónico"
        placeholder="nombre@correo.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={error?.campo === "email" ? error.mensaje : undefined}
      />
      <TextField
        ref={passwordRef}
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        revelable
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={ingresar}
        error={error && error.campo !== "email" ? error.mensaje : undefined}
      />
      <Pressable
        onPress={() => navigation.navigate("RestablecerPassword", { email: email.trim() || undefined })}
        style={styles.forgot}
        hitSlop={8}
      >
        <Text style={body(12, colors.accent700)}>¿Olvidaste tu contraseña?</Text>
      </Pressable>
      {aviso ? <Text style={body(13, colors.neutral700)}>{aviso}</Text> : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  marca: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  titulo: {
    marginTop: 22,
    marginBottom: 4,
  },
  center: {
    textAlign: "center",
  },
  forgot: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  signup: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 6,
  },
  link: {
    fontFamily: fonts.bodyMedium,
  },
});
