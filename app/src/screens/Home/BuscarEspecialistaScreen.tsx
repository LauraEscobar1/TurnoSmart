import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Animated, { FadeIn, FadeInDown, LinearTransition, ReduceMotion, ZoomOut } from "react-native-reanimated";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { Pantalla } from "@/components/Vidrio";
import { radius } from "@/theme/spacing";
import { body, fonts, heading, label } from "@/theme/typography";
import { useDato, useT } from "@/i18n";
import { RootStackParamList } from "@/navigation/types";
import { useAuth, usePaciente } from "@/auth/AuthContext";
import { CATALOGO_ESPECIALIDADES } from "@/data/mockData";
import { Card } from "@/components/Card";
import { TextField } from "@/components/forms";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AvisoEstado } from "@/components/AvisoEstado";
import { DialogoConfirmacion } from "@/components/DialogoConfirmacion";
import { useCargarDatos } from "@/hooks/useCargarDatos";
import { getSolicitudesActivas } from "@/services/solicitudesEsperaService";
import { diasEnEspera } from "@/utils/format";

type Props = NativeStackScreenProps<RootStackParamList, "BuscarEspecialista">;

/** Compara sin tildes ni mayúsculas: «cardio» encuentra «Cardiología». */
const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const ENTRA = FadeInDown.duration(280).reduceMotion(ReduceMotion.System);
const SALE = ZoomOut.duration(260).reduceMotion(ReduceMotion.System);
const ACOMODA = LinearTransition.duration(240).reduceMotion(ReduceMotion.System);

/**
 * Lista de espera y búsqueda de especialistas. Arriba, cada solicitud
 * activa en su card (especialidad, tiempo esperando y «Salir», que pide
 * confirmación); debajo, el buscador para sumarse a otra especialidad. Es
 * la misma preferencia que se elige en el registro y en Perfil ›
 * Preferencias, y la que usa la IA para ofrecer cupos.
 */
export function BuscarEspecialistaScreen({ navigation }: Props) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const dato = useDato();
  const paciente = usePaciente();
  const { actualizar } = useAuth();
  const [busqueda, setBusqueda] = useState("");
  /** Especialidad que se está por sacar de la lista (diálogo abierto). */
  const [porSalir, setPorSalir] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Alta de cada solicitud activa, para contar cuánto lleva esperando. */
  const [desde, setDesde] = useState<Record<string, string>>({});

  useCargarDatos(
    useCallback(() => {
      getSolicitudesActivas(paciente.id)
        .then((s) => setDesde(Object.fromEntries(s.map((x) => [x.especialidad, x.creadaEnISO]))))
        .catch(() => {});
    }, [paciente.id, paciente.especialidadesInteres.length])
  );

  const resultados = useMemo(() => {
    const q = normalizar(busqueda);
    // Busca por el nombre que ve el paciente (en su idioma) y por el original.
    return CATALOGO_ESPECIALIDADES.filter(
      (e) => normalizar(dato("especialidades", e)).includes(q) || normalizar(e).includes(q)
    );
  }, [busqueda, dato]);

  const enEspera = (e: string) => paciente.especialidadesInteres.includes(e);

  const sumarme = (e: string) => {
    setAviso(null);
    actualizar({ especialidadesInteres: [...paciente.especialidadesInteres, e] });
  };

  async function confirmarSalida() {
    const e = porSalir;
    if (!e) return;
    setPorSalir(null);
    await actualizar({ especialidadesInteres: paciente.especialidadesInteres.filter((x) => x !== e) });
    setAviso(t("buscar.saliste", { especialidad: dato("especialidades", e) }));
  }

  const tiempoEsperando = (e: string) => {
    const dias = diasEnEspera(desde[e] ?? paciente.registradoEnISO);
    return dias === 0 ? t("buscar.esperandoDesdeHoy") : t("buscar.esperandoHace", { tiempo: t("comun.nDias", { count: dias }) });
  };

  const buscando = busqueda.trim().length > 0;

  return (
    <Pantalla edges={["top", "bottom"]} style={styles.safe}>
      <ScreenHeader title={t("buscar.titulo")} onBack={navigation.goBack} />
      <FlatList
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.cabecera}>
            {/* Mientras se escribe solo se muestran los resultados. */}
            {!buscando ? (
              <View style={styles.seccion}>
                <Text style={label(10, colors.textoTenueSobreFondo)}>{t("buscar.tuLista")}</Text>
                {aviso ? (
                  <Animated.View entering={FadeIn.reduceMotion(ReduceMotion.System)}>
                    <AvisoEstado tipo="exito">{aviso}</AvisoEstado>
                  </Animated.View>
                ) : null}
                {paciente.especialidadesInteres.length === 0 ? (
                  <Text style={body(13, colors.textoSuaveSobreFondo)}>{t("buscar.listaVacia")}</Text>
                ) : (
                  paciente.especialidadesInteres.map((e) => (
                    <Animated.View key={e} entering={ENTRA} exiting={SALE} layout={ACOMODA}>
                      <Card style={styles.solicitud}>
                        <View style={styles.icono}>
                          <Ionicons name="medkit-outline" size={18} color={colors.icono} />
                        </View>
                        <View style={styles.texto}>
                          <Text style={heading(18, colors.accent900)}>{dato("especialidades", e)}</Text>
                          <View style={styles.espera}>
                            <Ionicons name="hourglass-outline" size={13} color={colors.icono} />
                            <Text style={body(12, colors.neutral600)}>{tiempoEsperando(e)}</Text>
                          </View>
                        </View>
                        <Pressable
                          onPress={() => setPorSalir(e)}
                          accessibilityRole="button"
                          accessibilityLabel={t("buscar.salirDe", { especialidad: dato("especialidades", e) })}
                          hitSlop={6}
                          style={({ pressed }) => [styles.salir, pressed && styles.salirPresionado]}
                        >
                          <Ionicons name="trash-outline" size={15} color={colors.error} />
                          <Text style={styles.salirTexto}>{t("buscar.salir")}</Text>
                        </Pressable>
                      </Card>
                    </Animated.View>
                  ))
                )}
              </View>
            ) : null}

            <View style={styles.seccion}>
              <Text style={label(10, colors.textoTenueSobreFondo)}>{t("buscar.todas")}</Text>
              <TextField
                sobreFondo
                label={t("buscar.especialidad")}
                placeholder={t("buscar.placeholder")}
                value={busqueda}
                onChangeText={setBusqueda}
                autoCorrect={false}
                returnKeyType="search"
              />
              <Text style={body(13, colors.textoSuaveSobreFondo)}>{t("buscar.bajada")}</Text>
            </View>
          </View>
        }
        data={resultados}
        keyExtractor={(e) => e}
        renderItem={({ item }) => {
          const activa = enEspera(item);
          return (
            <Card style={styles.fila}>
              <View style={styles.icono}>
                <Ionicons name="medkit-outline" size={18} color={colors.icono} />
              </View>
              <View style={styles.texto}>
                <Text style={heading(17, colors.accent900)}>{dato("especialidades", item)}</Text>
                <Text style={body(12, activa ? colors.accent700 : colors.neutral600)}>
                  {t(activa ? "buscar.enTuLista" : "buscar.sinLista")}
                </Text>
              </View>
              <Pressable
                onPress={() => (activa ? setPorSalir(item) : sumarme(item))}
                accessibilityRole="button"
                accessibilityLabel={t(activa ? "buscar.quitar" : "buscar.sumarmeA", { especialidad: dato("especialidades", item) })}
                style={({ pressed }) => [
                  styles.boton,
                  activa ? styles.botonActivo : styles.botonInactivo,
                  pressed && styles.presionado,
                ]}
              >
                {activa ? <Ionicons name="checkmark" size={14} color={colors.icono} /> : null}
                <Text style={[styles.botonTexto, { color: activa ? colors.accent700 : colors.sobreAcento }]}>
                  {t(activa ? "buscar.enEspera" : "buscar.sumarme")}
                </Text>
              </Pressable>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Text style={[body(14, colors.textoSuaveSobreFondo), styles.vacio]}>
            {t("buscar.sinResultados", { busqueda: busqueda.trim() })}
          </Text>
        }
      />

      <DialogoConfirmacion
        visible={porSalir !== null}
        titulo={t("buscar.confirmarTitulo", { especialidad: porSalir ? dato("especialidades", porSalir) : "" })}
        descripcion={t("buscar.confirmarTexto", { especialidad: porSalir ? dato("especialidades", porSalir) : "" })}
        confirmar={t("buscar.confirmarSalir")}
        cancelar={t("buscar.seguirEsperando")}
        onConfirmar={confirmarSalida}
        onCancelar={() => setPorSalir(null)}
      />
    </Pantalla>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    safe: {
      flex: 1,
    },
    content: {
      padding: 20,
      gap: 10,
    },
    cabecera: {
      gap: 22,
      marginBottom: 6,
    },
    seccion: {
      gap: 10,
    },
    solicitud: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    espera: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 2,
    },
    salir: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.error,
      backgroundColor: colors.superficie,
    },
    salirPresionado: {
      backgroundColor: colors.errorFondo,
    },
    salirTexto: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: colors.error,
    },
    fila: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    icono: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.accent100,
      alignItems: "center",
      justifyContent: "center",
    },
    texto: {
      flex: 1,
      minWidth: 0,
    },
    boton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
    },
    botonActivo: {
      backgroundColor: colors.accent100,
    },
    botonInactivo: {
      backgroundColor: colors.accent,
    },
    presionado: {
      opacity: 0.8,
    },
    botonTexto: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
    },
    vacio: {
      textAlign: "center",
      marginTop: 24,
    },
  });
