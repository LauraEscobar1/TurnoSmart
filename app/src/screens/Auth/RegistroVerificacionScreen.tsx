import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, fonts, heading } from "@/theme/typography";
import { AuthStackParamList } from "@/navigation/types";
import { useAuth } from "@/auth/AuthContext";
import { AuthError, enviarCodigo } from "@/services/authService";
import { pedirPermisoNotificaciones } from "@/services/permisosService";
import { Blueprint } from "@/components/Blueprint";
import { CheckRow } from "@/components/forms";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StepHeader, StepProgress } from "@/components/StepHeader";
import { FormScreen } from "@/screens/Auth/FormScreen";
import { useRegistro } from "@/screens/Auth/RegistroContext";

type Props = NativeStackScreenProps<AuthStackParamList, "RegistroVerificacion">;

const LARGO_CODIGO = 6;
const ESPERA_REENVIO = 60;

/**
 * 04 · Acceso — 04 Registro, verificación (3 / 3).
 * Verifica el teléfono y pide el permiso de notificaciones.
 */
export function RegistroVerificacionScreen({ navigation }: Props) {
  const { datos, preferencias } = useRegistro();
  const { crearCuenta } = useAuth();
  const [codigo, setCodigo] = useState("");
  const [codigoPrueba, setCodigoPrueba] = useState<string | null>(null);
  const [restante, setRestante] = useState(ESPERA_REENVIO);
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const enviar = useCallback(async () => {
    const c = await enviarCodigo(datos.telefono);
    if (__DEV__) setCodigoPrueba(c);
    setRestante(ESPERA_REENVIO);
  }, [datos.telefono]);

  useEffect(() => {
    enviar();
  }, [enviar]);

  useEffect(() => {
    if (restante <= 0) return;
    const id = setTimeout(() => setRestante((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [restante]);

  async function crear() {
    setError(null);
    setEnviando(true);
    try {
      const notificacionesActivas = await pedirPermisoNotificaciones();
      await crearCuenta(datos, preferencias, { codigo, notificacionesActivas });
      // La sesión queda abierta: el navegador raíz pasa solo a la app.
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "No pudimos crear la cuenta.");
      setEnviando(false);
    }
  }

  const listo = codigo.length === LARGO_CODIGO && acepta;

  return (
    <FormScreen
      header={<StepHeader title="Crear cuenta" step={3} total={3} onBack={navigation.goBack} />}
      contentStyle={{ gap: 16 }}
      footer={<PrimaryButton label="Crear cuenta" onPress={crear} disabled={!listo || enviando} />}
    >
      <StepProgress step={3} total={3} />
      <View>
        <Text style={heading(26)}>Verificá tu teléfono</Text>
        <Text style={[body(13, colors.neutral700), { marginTop: 4 }]}>
          Enviamos un código de 6 dígitos al {datos.telefono}.
        </Text>
      </View>

      <Pressable onPress={() => inputRef.current?.focus()} style={styles.cells} accessibilityLabel="Código de verificación">
        {Array.from({ length: LARGO_CODIGO }, (_, i) => (
          <View key={i} style={[styles.cell, i === Math.min(codigo.length, LARGO_CODIGO - 1) && styles.cellActive]}>
            <Text style={heading(24)}>{codigo[i] ?? ""}</Text>
          </View>
        ))}
        <TextInput
          ref={inputRef}
          testID="codigo-input"
          value={codigo}
          onChangeText={(v) => {
            setCodigo(v.replace(/\D/g, "").slice(0, LARGO_CODIGO));
            setError(null);
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={LARGO_CODIGO}
          autoFocus
          caretHidden
          style={styles.hiddenInput}
        />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {restante > 0 ? (
        <Text style={body(12, colors.neutral600)}>
          Reenviar código en 0:{String(restante).padStart(2, "0")}
        </Text>
      ) : (
        <Pressable onPress={enviar} hitSlop={8} style={{ alignSelf: "flex-start" }}>
          <Text style={body(12, colors.accent700)}>Reenviar código</Text>
        </Pressable>
      )}
      {codigoPrueba ? <Text style={body(12, colors.neutral600)}>Código de prueba: {codigoPrueba}</Text> : null}

      <Blueprint style={styles.notice}>
        <Ionicons name="notifications-outline" size={18} color={colors.accent700} style={{ marginTop: 1 }} />
        <Text style={[body(13, colors.neutral700), { flex: 1 }]}>
          <Text style={styles.strong}>Activá las notificaciones.</Text> Las ofertas de cupo duran minutos: sin push, te
          las perdés.
        </Text>
      </Blueprint>

      <CheckRow checked={acepta} onChange={setAcepta}>
        Acepto términos y política de privacidad
      </CheckRow>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  cells: {
    flexDirection: "row",
    gap: 6,
  },
  cell: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  cellActive: {
    borderColor: colors.accent,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text,
    marginTop: -8,
  },
  notice: {
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  strong: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
});
