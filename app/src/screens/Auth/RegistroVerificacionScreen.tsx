import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { body, fonts, heading } from "@/theme/typography";
import { useT } from "@/i18n";
import { AuthStackParamList } from "@/navigation/types";
import { useAuth } from "@/auth/AuthContext";
import { AuthError, ConfirmacionCorreoPendiente, enviarCodigo } from "@/services/authService";
import { pedirPermisoNotificaciones } from "@/services/permisosService";
import { Card } from "@/components/Card";
import { CodeInput, LARGO_CODIGO, ReenviarCodigo, useEnvioCodigo } from "@/components/CodeInput";
import { CheckRow } from "@/components/forms";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StepHeader, StepProgress } from "@/components/StepHeader";
import { FormScreen } from "@/screens/Auth/FormScreen";
import { useRegistro } from "@/screens/Auth/RegistroContext";

type Props = NativeStackScreenProps<AuthStackParamList, "RegistroVerificacion">;

/**
 * 04 · Acceso — 04 Registro, verificación (3 / 3).
 * Verifica el teléfono y pide el permiso de notificaciones.
 */
export function RegistroVerificacionScreen({ navigation }: Props) {
  const t = useT();
  const { datos, preferencias } = useRegistro();
  const { crearCuenta } = useAuth();
  const [codigo, setCodigo] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const envio = useEnvioCodigo(useCallback(() => enviarCodigo(datos.telefono), [datos.telefono]));

  async function crear() {
    setError(null);
    setEnviando(true);
    try {
      const notificacionesActivas = await pedirPermisoNotificaciones();
      await crearCuenta(datos, preferencias, { codigo, notificacionesActivas });
      // La sesión queda abierta: el navegador raíz pasa solo a la app.
    } catch (e) {
      // Cuenta creada, falta confirmar el correo: no es un error. Va al inicio
      // de sesión con el aviso (como tras restablecer la contraseña), sin
      // volver al registro con «atrás».
      if (e instanceof ConfirmacionCorreoPendiente) {
        navigation.reset({
          index: 1,
          routes: [{ name: "Bienvenida" }, { name: "Login", params: { aviso: t("errores.confirmaCorreo") } }],
        });
        return;
      }
      setError(e instanceof AuthError ? e.message : t("registro.error"));
      setEnviando(false);
    }
  }

  const listo = codigo.length === LARGO_CODIGO && acepta;

  return (
    <FormScreen
      header={<StepHeader title={t("login.crearCuenta")} step={3} total={3} onBack={navigation.goBack} />}
      contentStyle={{ gap: 16 }}
      footer={<PrimaryButton label={t("login.crearCuenta")} onPress={crear} disabled={!listo || enviando} />}
    >
      <StepProgress step={3} total={3} />
      <View>
        <Text style={heading(26)}>{t("registro.verificaTelefono")}</Text>
        <Text style={[body(13, colors.neutral700), { marginTop: 4 }]}>
          {t("registro.enviamosAl", { telefono: datos.telefono })}
        </Text>
      </View>

      <CodeInput
        value={codigo}
        onChange={(v) => {
          setCodigo(v);
          setError(null);
        }}
        autoFocus
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ReenviarCodigo restante={envio.restante} codigoPrueba={envio.codigoPrueba} onReenviar={envio.reenviar} />

      <Card style={styles.notice}>
        <Ionicons name="notifications-outline" size={18} color={colors.accent700} style={{ marginTop: 1 }} />
        <Text style={[body(13, colors.neutral700), { flex: 1 }]}>
          <Text style={styles.strong}>{t("registro.activaNotificaciones")}</Text> {t("registro.activaNotificacionesTexto")}
        </Text>
      </Card>

      <CheckRow checked={acepta} onChange={setAcepta}>
        {t("registro.aceptoTerminos")}
      </CheckRow>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
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
