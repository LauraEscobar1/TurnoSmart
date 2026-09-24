import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as LocalAuthentication from "expo-local-authentication";
import { colors } from "@/theme/colors";
import { body, fonts, heading } from "@/theme/typography";
import { AuthStackParamList } from "@/navigation/types";
import { useAuth } from "@/auth/AuthContext";
import { AuthError, getUltimoUsuario, recuperarPassword } from "@/services/authService";
import { TextField } from "@/components/forms";
import { PrimaryButton } from "@/components/PrimaryButton";
import { FormScreen } from "@/screens/Auth/FormScreen";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

/** 04 · Acceso — 01 Iniciar sesión. */
export function LoginScreen({ navigation }: Props) {
  const { iniciarSesion, iniciarSesionBiometrica } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ campo?: string; mensaje: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const passwordRef = useRef<TextInput>(null);

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

  async function olvide() {
    setError(null);
    try {
      await recuperarPassword(email);
      setAviso(`Si existe una cuenta con ${email.trim()}, te enviamos un enlace para crear una contraseña nueva.`);
    } catch (e) {
      if (e instanceof AuthError) setError({ campo: e.campo, mensaje: e.message });
    }
  }

  return (
    <FormScreen
      contentStyle={styles.content}
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
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={heading(15, colors.bg)}>TS</Text>
        </View>
        <Text style={heading(20)}>TurnoSmart</Text>
      </View>

      <View style={styles.welcome}>
        <Text style={[heading(34), styles.title]}>{"Bienvenido\nde nuevo"}</Text>
        <Text style={[body(13, colors.neutral700), styles.subtitle]}>Ingresá para ver tus ofertas de cupo.</Text>
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
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={ingresar}
        error={error && error.campo !== "email" ? error.mensaje : undefined}
      />
      <Pressable onPress={olvide} style={styles.forgot} hitSlop={8}>
        <Text style={body(12, colors.accent700)}>¿Olvidaste tu contraseña?</Text>
      </Pressable>
      {aviso ? <Text style={body(13, colors.neutral700)}>{aviso}</Text> : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 28,
    gap: 16,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 34,
    height: 34,
    backgroundColor: colors.accent900,
    alignItems: "center",
    justifyContent: "center",
  },
  welcome: {
    marginTop: 14,
  },
  title: {
    lineHeight: 35,
  },
  subtitle: {
    marginTop: 6,
  },
  forgot: {
    alignSelf: "flex-end",
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
