import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputInstance } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as LocalAuthentication from "expo-local-authentication";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { body, fonts, heading } from "@/theme/typography";
import { useT } from "@/i18n";
import { AuthStackParamList } from "@/navigation/types";
import { useAuth } from "@/auth/AuthContext";
import { AuthError, getUltimoUsuario } from "@/services/authService";
import { TextField } from "@/components/forms";
import { Card } from "@/components/Card";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { BackBar } from "@/components/StepHeader";
import { FormScreen } from "@/screens/Auth/FormScreen";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

/**
 * Acceso — Iniciar sesión, como en el diseño: logo arriba a la izquierda,
 * titular y bajada alineados a la izquierda, y una card de vidrio con
 * correo, contraseña y el botón de marca (el mismo de «Empezar»). Debajo,
 * Face ID y el enlace para crear cuenta.
 */
export function LoginScreen({ navigation, route }: Props) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const { iniciarSesion, iniciarSesionBiometrica } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ campo?: string; mensaje: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(route.params?.aviso ?? null);
  const [enviando, setEnviando] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

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
      setError(e instanceof AuthError ? { campo: e.campo, mensaje: e.message } : { mensaje: t("login.error") });
      setEnviando(false);
    }
  }

  async function ingresarConFaceId() {
    setError(null);
    setAviso(null);
    if (!(await getUltimoUsuario())) {
      setAviso(t("errores.faceIdPrimeraVez"));
      return;
    }
    const disponible = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    if (!disponible) {
      setAviso(t("login.faceIdNoDisponible"));
      return;
    }
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: t("login.faceIdPrompt"),
      cancelLabel: t("comun.cancelar"),
      disableDeviceFallback: false,
    });
    if (!r.success) return; // canceló: no es un error que mostrar
    try {
      await iniciarSesionBiometrica();
    } catch (e) {
      setAviso(e instanceof AuthError ? e.message : t("login.error"));
    }
  }

  return (
    <FormScreen
      header={navigation.canGoBack() ? <BackBar onBack={navigation.goBack} /> : undefined}
      footer={
        <>
          <PrimaryButton label={t("login.conFaceId")} variant="secondary" onPress={ingresarConFaceId} />
          <View style={styles.signup}>
            <Text style={body(13, colors.textoSuaveSobreFondo)}>{t("login.noTenesCuenta")} </Text>
            <Pressable onPress={() => navigation.navigate("RegistroDatos")} hitSlop={8}>
              <Text style={[body(13, colors.acentoSobreFondo), styles.link]}>{t("login.crearCuenta")}</Text>
            </Pressable>
          </View>
        </>
      }
    >
      <View style={styles.marca}>
        <Logo
          size={38}
          tamanoNombre={28}
          wordmark
          disposicion="horizontal"
          color={colors.logoSobreFondo}
          acento={colors.logoAcentoSobreFondo}
          acentoNombre={colors.nombreAcentoSobreFondo}
        />
        <Text style={[heading(40, colors.textoSobreFondo), styles.titulo]} accessibilityRole="header">
          {t("login.titulo")}
        </Text>
        <Text style={body(15, colors.textoSuaveSobreFondo)}>{t("login.bajada")}</Text>
      </View>

      <Card destacada style={styles.formulario}>
        <TextField
          label={t("comun.correo")}
          placeholder={t("comun.correoEj")}
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
          label={t("comun.password")}
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
          <Text style={[body(13, colors.accent700), styles.link]}>{t("login.olvidaste")}</Text>
        </Pressable>
        {aviso ? <Text style={body(13, colors.neutral700)}>{aviso}</Text> : null}
        <PrimaryButton label={t("login.iniciarSesion")} variant="marca" onPress={ingresar} disabled={enviando} />
      </Card>
    </FormScreen>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  marca: {
    alignItems: "flex-start",
    paddingTop: 8,
    paddingBottom: 10,
  },
  titulo: {
    marginTop: 30,
    marginBottom: 6,
    lineHeight: 44,
  },
  formulario: {
    padding: 18,
    gap: 14,
  },
  forgot: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  // Pie separado por una línea, como en el diseño.
  signup: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divisorSobreFondo,
  },
  link: {
    fontFamily: fonts.bodyMedium,
  },
});
