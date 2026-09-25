import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCargarDatos } from "@/hooks/useCargarDatos";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
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
import { claveDia, fechaCorta, fechaLarga, rangoDias } from "@/utils/format";

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
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? "proximas");
  const [proximas, setProximas] = useState<Cita[]>([]);
  const [pasadas, setPasadas] = useState<Cita[]>([]);
  const [seleccionado, setSeleccionado] = useState<Date | null>(null);

  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab]);

  useCargarDatos(
    useCallback(() => {
      getCitasProximas().then(setProximas);
      getCitasPasadas().then(setPasadas);
    }, [])
  );

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
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader title="Mis citas" seccion={3} />
      <FlatList
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.cabecera}>
            <CalendarioHorizontal dias={dias} seleccionado={dia} onSeleccionar={setSeleccionado} citasPorDia={conteo} />
            <Segmented
              variante="pildora"
              value={tab}
              onChange={setTab}
              options={[
                { value: "proximas", label: "Próximas" },
                { value: "pasadas", label: "Pasadas" },
              ]}
            />
            <View style={styles.titulo}>
              <Text style={heading(17, colors.accent900)}>
                {fechaLarga(dia).replace(/^./, (c) => c.toUpperCase())}
              </Text>
              <Text style={body(13, colors.neutral600)}>
                {delDia.length ? `${delDia.length} ${delDia.length === 1 ? "cita" : "citas"}` : "Sin citas"}
              </Text>
            </View>
          </View>
        }
        data={delDia}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AppointmentCard
            cita={item}
            past={esPasada}
            onPress={() => navigation.navigate("AppointmentDetail", { citaId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <EmptyState
              title={`No tenés citas el ${fechaCorta(dia.toISOString())}`}
              description={
                cercana
                  ? `${esPasada ? "Tu cita anterior fue" : "Tu próxima cita es"} el ${fechaCorta(cercana.toISOString())}.`
                  : esPasada
                    ? "Todavía no tenés historial."
                    : "Te avisamos apenas se libere un cupo que te sirva."
              }
            />
            {cercana ? (
              <PrimaryButton label="Ir a ese día" variant="secondary" onPress={() => setSeleccionado(cercana)} />
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
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
