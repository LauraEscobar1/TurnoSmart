import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { sombra } from "@/theme/spacing";
import { body } from "@/theme/typography";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { MenuAjustes } from "@/components/MenuAjustes";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Segmented } from "@/components/forms";
import { useAuth, useStaff } from "@/auth/AuthContext";
import * as staffService from "@/services/staffService";
import { CitaAgenda, CupoStaff, MetricasStaff } from "@/types/staff";
import { useT } from "@/i18n";
import { CitaAgendaCard, CupoCard, MetricasPanel } from "@/screens/Staff/TarjetasStaff";

type Seccion = "agenda" | "cupos";
type Estado = "cargando" | "listo" | "error";
/** "todo" mientras se calcula el riesgo de toda la agenda; si no, el id de la cita ocupada. */
type Ocupado = string | null;

/**
 * Panel del staff del consultorio: métricas de los últimos 30 días, agenda
 * de las próximas citas con su riesgo de inasistencia (y las acciones de
 * cancelar o marcar inasistencia) y los cupos liberados con el estado de
 * sus ofertas. Los pacientes se muestran solo con iniciales y código.
 */
export function PanelStaffScreen() {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const staff = useStaff();
  const { cerrarSesion } = useAuth();
  const [seccion, setSeccion] = useState<Seccion>("agenda");
  const [estado, setEstado] = useState<Estado>("cargando");
  const [refrescando, setRefrescando] = useState(false);
  const [metricas, setMetricas] = useState<MetricasStaff | null>(null);
  const [agenda, setAgenda] = useState<CitaAgenda[]>([]);
  const [cupos, setCupos] = useState<CupoStaff[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<Ocupado>(null);
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const montado = useRef(true);
  const sinConsultorio = staff.consultorios.length === 0;

  const cargar = useCallback(async () => {
    try {
      const [m, a, c] = await Promise.all([staffService.getMetricas(), staffService.getAgenda(), staffService.getCupos()]);
      if (!montado.current) return;
      setMetricas(m);
      setAgenda(a);
      setCupos(c);
      setEstado("listo");
    } catch (e) {
      console.warn(`[staff] No se pudo cargar el panel. ${String(e)}`);
      if (montado.current) setEstado("error");
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    if (!sinConsultorio) cargar();
    return () => {
      montado.current = false;
    };
  }, [cargar, sinConsultorio]);

  const reintentar = useCallback(() => {
    setEstado("cargando");
    cargar();
  }, [cargar]);

  const refrescar = useCallback(async () => {
    setRefrescando(true);
    await cargar();
    if (montado.current) setRefrescando(false);
  }, [cargar]);

  const calcular = useCallback(
    async (citaId?: string) => {
      setOcupado(citaId ?? "todo");
      setAviso(null);
      try {
        const r = await staffService.calcularRiesgo(citaId);
        if (!montado.current) return;
        setAviso(
          r.calculadas === 0
            ? t("staff.riesgo.ninguna")
            : t("staff.riesgo.resultado", { count: r.calculadas, ai: r.ai, fallback: r.fallback })
        );
        await cargar();
      } catch (e) {
        console.warn(`[staff] No se pudo calcular el riesgo. ${String(e)}`);
        if (montado.current) setAviso(t("staff.errores.riesgo"));
      } finally {
        if (montado.current) setOcupado(null);
      }
    },
    [cargar, t]
  );

  const ejecutar = useCallback(
    async (tipo: "cancelar" | "inasistencia", cita: CitaAgenda) => {
      setOcupado(cita.id);
      setAviso(null);
      try {
        if (tipo === "cancelar") await staffService.cancelarCitaStaff(cita.id);
        else await staffService.registrarInasistencia(cita.id);
        if (!montado.current) return;
        setAviso(tipo === "cancelar" ? t("staff.avisos.cancelada") : t("staff.avisos.inasistencia"));
        await cargar();
      } catch (e) {
        console.warn(`[staff] No se pudo completar la acción. ${String(e)}`);
        if (montado.current) setAviso(t("staff.errores.accion"));
      } finally {
        if (montado.current) setOcupado(null);
      }
    },
    [cargar, t]
  );

  const confirmar = useCallback(
    (tipo: "cancelar" | "inasistencia", cita: CitaAgenda) => {
      const cancelar = tipo === "cancelar";
      Alert.alert(
        cancelar ? t("staff.confirmar.cancelarTitulo") : t("staff.confirmar.inasistenciaTitulo"),
        cancelar ? t("staff.confirmar.cancelarTexto") : t("staff.confirmar.inasistenciaTexto"),
        [
          { text: t("staff.confirmar.volver"), style: "cancel" },
          { text: t("staff.confirmar.confirmar"), style: "destructive", onPress: () => ejecutar(tipo, cita) },
        ]
      );
    },
    [ejecutar, t]
  );

  const ahora = Date.now();

  const contenido = () => {
    if (sinConsultorio) {
      return <EmptyState title={t("staff.sinConsultorio")} description={t("staff.sinConsultorioTexto")} />;
    }
    if (estado === "cargando") {
      return (
        <View style={styles.centro} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.textoSobreFondo} />
          <Text style={body(14, colors.textoSuaveSobreFondo)}>{t("staff.cargando")}</Text>
        </View>
      );
    }
    if (estado === "error") {
      return (
        <View style={styles.bloque}>
          <EmptyState title={t("staff.errores.cargar")} description={t("staff.errores.cargarTexto")} />
          <PrimaryButton label={t("staff.errores.reintentar")} onPress={reintentar} />
        </View>
      );
    }
    return (
      <View style={styles.bloque}>
        {metricas ? <MetricasPanel metricas={metricas} /> : null}

        <Segmented
          variante="pildora"
          value={seccion}
          onChange={setSeccion}
          options={[
            { value: "agenda", label: t("staff.secciones.agenda") },
            { value: "cupos", label: t("staff.secciones.cupos") },
          ]}
        />

        {aviso ? (
          <Card tono="acento" style={styles.aviso}>
            <Text style={body(14, colors.accent900)} accessibilityLiveRegion="polite">
              {aviso}
            </Text>
          </Card>
        ) : null}

        {seccion === "agenda" ? (
          <View style={styles.bloque}>
            <PrimaryButton
              label={ocupado === "todo" ? t("staff.agenda.calculando") : t("staff.agenda.calcularTodo")}
              onPress={() => calcular()}
              disabled={ocupado !== null || agenda.length === 0}
            />
            <Text style={body(12, colors.textoTenueSobreFondo)}>{t("staff.riesgo.aviso")}</Text>
            {agenda.length === 0 ? (
              <EmptyState title={t("staff.agenda.vacio")} description={t("staff.agenda.vacioTexto")} />
            ) : (
              agenda.map((cita) => (
                <CitaAgendaCard
                  key={cita.id}
                  cita={cita}
                  pasada={new Date(cita.fechaHoraISO).getTime() <= ahora}
                  ocupado={ocupado !== null}
                  onCalcular={() => calcular(cita.id)}
                  onCancelar={() => confirmar("cancelar", cita)}
                  onInasistencia={() => confirmar("inasistencia", cita)}
                />
              ))
            )}
          </View>
        ) : (
          <View style={styles.bloque}>
            {cupos.length === 0 ? (
              <EmptyState title={t("staff.cupos.vacio")} description={t("staff.cupos.vacioTexto")} />
            ) : (
              cupos.map((cupo) => <CupoCard key={cupo.id} cupo={cupo} />)
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader
        title={t("staff.titulo")}
        accion={
          <View style={styles.iconos}>
            <Pressable
              onPress={() => setAjustesAbiertos(true)}
              hitSlop={8}
              style={styles.icono}
              accessibilityRole="button"
              accessibilityLabel={t("staff.ajustes")}
            >
              <Ionicons name="settings-outline" size={18} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={cerrarSesion}
              hitSlop={8}
              style={styles.icono}
              accessibilityRole="button"
              accessibilityLabel={t("staff.cerrarSesion")}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.text} />
            </Pressable>
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          sinConsultorio ? undefined : (
            <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colors.textoSobreFondo} />
          )
        }
      >
        <View style={styles.saludo}>
          {staff.nombre ? (
            <Text style={body(15, colors.textoSobreFondo)}>{t("staff.hola", { nombre: staff.nombre })}</Text>
          ) : null}
          {staff.consultorios.length ? (
            <Text style={body(13, colors.textoSuaveSobreFondo)}>{staff.consultorios.map((c) => c.nombre).join(" · ")}</Text>
          ) : null}
        </View>
        {contenido()}
      </ScrollView>
      <MenuAjustes visible={ajustesAbiertos} onCerrar={() => setAjustesAbiertos(false)} />
    </SafeAreaView>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.fondoPantalla },
    content: { paddingHorizontal: 18, paddingBottom: 40, gap: 16 },
    saludo: { gap: 2 },
    bloque: { gap: 12 },
    centro: { alignItems: "center", gap: 10, paddingVertical: 40 },
    aviso: { paddingVertical: 12, paddingHorizontal: 14 },
    iconos: { flexDirection: "row", gap: 10 },
    icono: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.superficie,
      borderWidth: 1,
      borderColor: colors.borde,
      alignItems: "center",
      justifyContent: "center",
      ...sombra.sm,
    },
  });
