import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useCargarDatos } from "@/hooks/useCargarDatos";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import Animated from "react-native-reanimated";
import { EncabezadoConVidrio, EntradaEscalonada, useEncabezadoAlDesplazar } from "@/components/Animaciones";
import { Pantalla } from "@/components/Vidrio";
import { body, heading } from "@/theme/typography";
import { AppointmentCard } from "@/components/AppointmentCard";
import { CalendarioHorizontal } from "@/components/CalendarioHorizontal";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Segmented } from "@/components/forms";
import { Cita } from "@/types/domain";
import { getCitasPasadas, getCitasProximas } from "@/services/appointmentsService";
import { AppointmentsStackParamList } from "@/navigation/types";
import { claveDia, rangoDias, useFormato } from "@/utils/format";
import { useT } from "@/i18n";

type Props = NativeStackScreenProps<AppointmentsStackParamList, "AppointmentsList">;

type Tab = "proximas" | "pasadas";

/** Días que muestra el calendario en cada pestaña. */
const RANGO: Record<Tab, { desde: number; dias: number }> = {
  proximas: { desde: 0, dias: 30 },
  pasadas: { desde: -60, dias: 60 },
};

/**
 * Mis citas — Nivel 1 (docs/02-jerarquia.md §2).
 * Arriba un calendario horizontal; debajo las pestañas Próximas/Pasadas,
 * que cambian el rango del calendario, y las citas del día elegido.
 */
export function AppointmentsListScreen({ navigation, route }: Props) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const { fechaCorta, fechaLarga } = useFormato();
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? "proximas");
  const [proximas, setProximas] = useState<Cita[]>([]);
  const [pasadas, setPasadas] = useState<Cita[]>([]);
  const [seleccionado, setSeleccionado] = useState<Date | null>(null);

  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab]);

  const cargar = useCallback(
    () => Promise.all([getCitasProximas().then(setProximas), getCitasPasadas().then(setPasadas)]),
    []
  );
  useCargarDatos(cargar);

  // Deslizar hacia abajo vuelve a leer las citas; al terminar, las cards entran de nuevo.
  const [refrescando, setRefrescando] = useState(false);
  const [ronda, setRonda] = useState(0);
  const refrescar = useCallback(() => {
    setRefrescando(true);
    cargar().finally(() => {
      setRefrescando(false);
      setRonda((r) => r + 1);
    });
  }, [cargar]);
  const { onScroll, estiloVidrio } = useEncabezadoAlDesplazar();

  const esPasada = tab === "pasadas";
  const citas = esPasada ? pasadas : proximas;
  const dias = useMemo(() => rangoDias(RANGO[tab].desde, RANGO[tab].dias), [tab]);

  const citasPorDia = useMemo(() => {
    const mapa: Record<string, Cita[]> = {};
    for (const c of citas) (mapa[claveDia(c.fechaHoraISO)] ??= []).push(c);
    for (const lista of Object.values(mapa)) {
      lista.sort((a, b) => new Date(a.fechaHoraISO).getTime() - new Date(b.fechaHoraISO).getTime());
    }
    return mapa;
  }, [citas]);

  const diasConCitas = useMemo(() => dias.filter((d) => citasPorDia[claveDia(d)]), [dias, citasPorDia]);

  // Día por defecto: en Próximas el primero con citas, en Pasadas el último.
  const diaPorDefecto = useMemo(() => {
    if (diasConCitas.length) return esPasada ? diasConCitas[diasConCitas.length - 1] : diasConCitas[0];
    return esPasada ? dias[dias.length - 1] : dias[0];
  }, [diasConCitas, dias, esPasada]);

  // Al cambiar de pestaña, o si el día elegido quedó fuera del rango, vuelve al día por defecto.
  const dia =
    seleccionado && dias.some((d) => claveDia(d) === claveDia(seleccionado)) ? seleccionado : diaPorDefecto;

  useEffect(() => {
    setSeleccionado(null);
  }, [tab]);

  const delDia = citasPorDia[claveDia(dia)] ?? [];
  const cercana = esPasada
    ? ([...diasConCitas].reverse().find((d) => d < dia) ?? diasConCitas[diasConCitas.length - 1])
    : (diasConCitas.find((d) => d > dia) ?? diasConCitas[0]);

  const conteo = useMemo(
    () => Object.fromEntries(Object.entries(citasPorDia).map(([k, v]) => [k, v.length])),
    [citasPorDia]
  );

  return (
    <Pantalla edges={["top"]} style={styles.safe}>
      <EncabezadoConVidrio estilo={estiloVidrio}>
        <ScreenHeader title={t("nav.citas")} />
      </EncabezadoConVidrio>
      <Animated.FlatList
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colors.textoSobreFondo} />
        }
        ListHeaderComponent={
          <View style={styles.cabecera}>
            <CalendarioHorizontal dias={dias} seleccionado={dia} onSeleccionar={setSeleccionado} citasPorDia={conteo} />
            <Segmented
              variante="pildora"
              value={tab}
              onChange={setTab}
              options={[
                { value: "proximas", label: t("citas.proximas") },
                { value: "pasadas", label: t("citas.pasadas") },
              ]}
            />
            <View style={styles.titulo}>
              <Text style={heading(17, colors.textoSobreFondo)}>
                {fechaLarga(dia).replace(/^./, (c) => c.toUpperCase())}
              </Text>
              <Text style={body(13, colors.textoTenueSobreFondo)}>
                {delDia.length ? t("citas.nCitas", { count: delDia.length }) : t("citas.sinCitas")}
              </Text>
            </View>
          </View>
        }
        data={delDia}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          // La clave cambia con el día y con cada refresco: las cards vuelven a entrar escalonadas.
          <EntradaEscalonada key={`${ronda}-${claveDia(dia)}-${item.id}`} indice={index}>
            <AppointmentCard
              cita={item}
              past={esPasada}
              onPress={() => navigation.navigate("AppointmentDetail", { citaId: item.id })}
            />
          </EntradaEscalonada>
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <EmptyState
              title={t("citas.sinCitasEl", { fecha: fechaCorta(dia.toISOString()) })}
              description={
                cercana
                  ? t(esPasada ? "citas.anteriorFue" : "citas.proximaEs", { fecha: fechaCorta(cercana.toISOString()) })
                  : t(esPasada ? "citas.sinHistorial" : "citas.teAvisamos")
              }
            />
            {cercana ? (
              <PrimaryButton label={t("citas.irAEseDia")} variant="secondary" onPress={() => setSeleccionado(cercana)} />
            ) : null}
          </View>
        }
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
    padding: 18,
    paddingTop: 8,
    gap: 12,
  },
  cabecera: {
    gap: 16,
    marginBottom: 2,
  },
  titulo: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  vacio: {
    gap: 12,
  },
});
