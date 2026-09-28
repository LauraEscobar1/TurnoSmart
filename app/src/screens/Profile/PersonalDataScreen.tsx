import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { body, label } from "@/theme/typography";
import { useT } from "@/i18n";
import { useAuth, usePaciente } from "@/auth/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Card } from "@/components/Card";
import { AvatarPaciente } from "@/components/AvatarPaciente";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/forms";
import { elegirFotoPerfil } from "@/services/fotoService";
import { fechaADisplay, fechaDesdeDisplay, formatearCedula } from "@/utils/perfil";

/**
 * Datos personales. Arriba, la foto (opcional). Después, los datos de la
 * cuenta que se dieron en el registro (solo lectura) y la información
 * adicional, toda opcional y editable cuando el paciente quiera: fecha de
 * nacimiento, ciudad, EPS y contacto de emergencia.
 */
export function PersonalDataScreen() {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const navigation = useNavigation();
  const paciente = usePaciente();
  const { actualizar } = useAuth();

  const inicial = {
    fechaNacimiento: fechaADisplay(paciente.fechaNacimiento),
    ciudad: paciente.ciudad ?? "",
    eps: paciente.eps ?? "",
    contactoNombre: paciente.contactoEmergencia?.nombre ?? "",
    contactoTelefono: paciente.contactoEmergencia?.telefono ?? "",
  };
  const [form, setForm] = useState(inicial);
  const [errorFecha, setErrorFecha] = useState<string>();
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const cambios = (Object.keys(form) as (keyof typeof form)[]).some((k) => form[k].trim() !== inicial[k]);
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setGuardado(false);
    if (k === "fechaNacimiento") setErrorFecha(undefined);
  };

  async function cambiarFoto() {
    const uri = await elegirFotoPerfil();
    if (uri) await actualizar({ fotoUri: uri });
  }

  async function guardar() {
    const fecha = fechaDesdeDisplay(form.fechaNacimiento);
    if (fecha === null) {
      setErrorFecha(t("datos.errorFecha"));
      return;
    }
    const nombre = form.contactoNombre.trim();
    const telefono = form.contactoTelefono.trim();
    setGuardando(true);
    await actualizar({
      fechaNacimiento: fecha,
      ciudad: form.ciudad.trim() || undefined,
      eps: form.eps.trim() || undefined,
      contactoEmergencia: nombre || telefono ? { nombre, telefono } : undefined,
    });
    setGuardando(false);
    setGuardado(true);
  }

  const cuenta = [
    { label: t("datos.nombre"), value: `${paciente.nombre} ${paciente.apellido}` },
    { label: t("datos.cedula"), value: formatearCedula(paciente.cedula) },
    { label: t("datos.correo"), value: paciente.email },
    { label: t("datos.telefono"), value: paciente.telefono },
  ];

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <ScreenHeader title={t("datos.titulo")} onBack={navigation.goBack} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.foto}>
            <AvatarPaciente paciente={paciente} size={96} onPress={cambiarFoto} />
            <View style={styles.fotoAcciones}>
              <PrimaryButton
                label={t(paciente.fotoUri ? "datos.cambiarFoto" : "datos.subirFoto")}
                variant="ghost"
                onPress={cambiarFoto}
              />
              {paciente.fotoUri ? (
                <PrimaryButton label={t("datos.quitarFoto")} variant="ghost" onPress={() => actualizar({ fotoUri: undefined })} />
              ) : null}
            </View>
          </View>

          <View style={styles.seccion}>
            <Text style={label(10, colors.neutral600)}>{t("datos.cuenta")}</Text>
            <Card>
              {cuenta.map((c, i) => (
                <View key={c.label} style={[styles.row, i > 0 && styles.rowDivider]}>
                  <Text style={label(9, colors.neutral600)}>{c.label}</Text>
                  <Text style={body(15, colors.text)}>{c.value}</Text>
                </View>
              ))}
            </Card>
          </View>

          <View style={styles.seccion}>
            <Text style={label(10, colors.neutral600)}>{t("datos.adicional")}</Text>
            <Card style={styles.formulario}>
              <TextField
                label={t("datos.nacimiento")}
                placeholder={t("datos.formatoFecha")}
                keyboardType="numbers-and-punctuation"
                value={form.fechaNacimiento}
                onChangeText={set("fechaNacimiento")}
                error={errorFecha}
              />
              <TextField
                label={t("datos.ciudad")}
                placeholder={t("datos.ciudadEj")}
                autoComplete="postal-address-locality"
                textContentType="addressCity"
                value={form.ciudad}
                onChangeText={set("ciudad")}
              />
              <TextField
                label={t("datos.eps")}
                placeholder={t("datos.epsEj")}
                value={form.eps}
                onChangeText={set("eps")}
              />
              <TextField
                label={t("datos.contacto")}
                placeholder={t("datos.nombre")}
                value={form.contactoNombre}
                onChangeText={set("contactoNombre")}
              />
              <TextField
                label={t("datos.contactoTelefono")}
                placeholder={t("datos.contactoTelefonoEj")}
                keyboardType="phone-pad"
                value={form.contactoTelefono}
                onChangeText={set("contactoTelefono")}
              />
            </Card>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {guardado && !cambios ? (
            <Text style={[body(13, colors.accent700), styles.centrado]} accessibilityLiveRegion="polite">
              {t("datos.guardado")}
            </Text>
          ) : null}
          <PrimaryButton label={t("comun.guardar")} onPress={guardar} disabled={!cambios || guardando} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
  },
  flex: {
    flex: 1,
  },
  centrado: {
    textAlign: "center",
  },
  content: {
    padding: 18,
    gap: 22,
  },
  foto: {
    alignItems: "center",
    gap: 6,
  },
  fotoAcciones: {
    flexDirection: "row",
    gap: 4,
  },
  seccion: {
    gap: 8,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 2,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  formulario: {
    padding: 16,
    gap: 14,
  },
  footer: {
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
