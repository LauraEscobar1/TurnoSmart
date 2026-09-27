import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCargarDatos } from "@/hooks/useCargarDatos";
import { colors } from "@/theme/colors";
import { radius, sombra } from "@/theme/spacing";
import { body, fonts, label } from "@/theme/typography";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Notificacion, TipoNotificacion } from "@/types/domain";
import { getNotificaciones, marcarComoLeida, marcarTodasComoLeidas } from "@/services/notificationsService";
import { RootStackParamList } from "@/navigation/types";
import { grupoAviso, marcaAviso } from "@/utils/format";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Filtro = "todas" | "citas" | "ofertas";

const FILTROS: { value: Filtro; label: string; vacio: string }[] = [
  { value: "todas", label: "Todas", vacio: "No tenés avisos." },
  { value: "citas", label: "Citas", vacio: "No tenés avisos de citas." },
  { value: "ofertas", label: "Ofertas", vacio: "No tenés avisos de ofertas." },
];

/**
 * Cada tipo tiene su ícono y su jerarquía, sin salir de la paleta mono:
 * el cupo disponible (lo único urgente) lleva el círculo de Acero sólido;
 * citas y confirmaciones, el tinte suave; lo ya resuelto, gris.
 */
const TIPO: Record<
  TipoNotificacion,
  { titulo: string; icono: keyof typeof Ionicons.glyphMap; tono: "fuerte" | "suave" | "apagado"; filtro: Filtro }
> = {
  "cupo-ultimo-minuto": { titulo: "Cupo disponible", icono: "flash", tono: "fuerte", filtro: "ofertas" },
  recordatorio: { titulo: "Recordatorio de cita", icono: "calendar-outline", tono: "suave", filtro: "citas" },
  confirmacion: { titulo: "Cupo confirmado", icono: "checkmark-circle-outline", tono: "suave", filtro: "ofertas" },
  expiracion: { titulo: "Oferta expirada", icono: "time-outline", tono: "apagado", filtro: "ofertas" },
};

/**
 * Notificaciones (Avisos) — Nivel 1 (04 · Notificaciones).
 * Una bandeja, no una lista de tarjetas: avisos agrupados por día en filas
 * compactas, filtros Todas · Citas · Ofertas y «Marcar todo como leído».
 * Es también un punto de entrada transversal (docs/03-navegacion.md §4):
 * un cupo disponible abre el detalle de la oferta; un recordatorio, la cita.
 * Sin leer: título en negrita y punto de Acero. Leído: texto atenuado.
 */
export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Notificacion[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const cargar = useCallback(() => {
    getNotificaciones().then(setItems);
  }, []);

  useCargarDatos(cargar);

  const hayNoLeidas = items.some((n) => !n.leida);

  const grupos = useMemo(() => {
    const visibles = filtro === "todas" ? items : items.filter((n) => TIPO[n.tipo].filtro === filtro);
    const porGrupo = new Map<string, Notificacion[]>();
    for (const n of visibles) {
      const g = grupoAviso(n.fechaISO);
      porGrupo.set(g, [...(porGrupo.get(g) ?? []), n]);
    }
    return [...porGrupo.entries()];
  }, [items, filtro]);

  async function handlePress(n: Notificacion) {
    await marcarComoLeida(n.id);
    cargar();
    if (!n.referenciaId) return;
    if (n.tipo === "cupo-ultimo-minuto") {
      navigation.navigate("OfferDetail", { ofertaId: n.referenciaId });
    } else if (n.tipo === "recordatorio") {
      navigation.navigate("Tabs", {
        screen: "MisCitas",
        params: { screen: "AppointmentDetail", params: { citaId: n.referenciaId }, initial: false },
      });
    }
  }

  async function handleMarcarTodas() {
    await marcarTodasComoLeidas();
    cargar();
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader
        title="Notificaciones"
        accion={
          hayNoLeidas ? (
            <Pressable
              onPress={handleMarcarTodas}
              hitSlop={10}
              accessibilityRole="button"
              style={({ pressed }) => pressed && styles.presionado}
            >
              <Text style={styles.marcarTodas}>Marcar todo como leído</Text>
            </Pressable>
          ) : null
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filtros}>
          {FILTROS.map((f) => {
            const activo = f.value === filtro;
            return (
              <Pressable
                key={f.value}
                onPress={() => setFiltro(f.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                style={[styles.filtro, activo && styles.filtroActivo]}
              >
                <Text style={[styles.filtroTexto, activo && styles.filtroTextoActivo]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {items.length === 0 ? (
          <EmptyState title="No tenés notificaciones" />
        ) : grupos.length === 0 ? (
          <Text style={[body(14, colors.neutral600), styles.vacio]}>
            {FILTROS.find((f) => f.value === filtro)?.vacio}
          </Text>
        ) : (
          grupos.map(([grupo, avisos]) => (
            <View key={grupo} style={styles.grupo}>
              <Text style={label(10, colors.neutral600)}>{grupo}</Text>
              <View style={styles.bandeja}>
                {avisos.map((n, i) => (
                  <FilaAviso key={n.id} aviso={n} divisor={i > 0} onPress={() => handlePress(n)} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilaAviso({ aviso, divisor, onPress }: { aviso: Notificacion; divisor: boolean; onPress: () => void }) {
  const tipo = TIPO[aviso.tipo];
  const noLeida = !aviso.leida;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${noLeida ? "Sin leer. " : ""}${tipo.titulo}. ${aviso.titulo}. ${marcaAviso(aviso.fechaISO)}`}
      style={({ pressed }) => [styles.fila, pressed && styles.filaPresionada]}
    >
      <View
        style={[
          styles.icono,
          tipo.tono === "fuerte" && styles.iconoFuerte,
          tipo.tono === "apagado" && styles.iconoApagado,
        ]}
      >
        <Ionicons
          name={tipo.icono}
          size={18}
          color={tipo.tono === "fuerte" ? "#ffffff" : tipo.tono === "apagado" ? colors.neutral600 : colors.accent700}
        />
      </View>

      <View style={[styles.texto, divisor && styles.divisor]}>
        <View style={styles.encabezado}>
          <Text
            style={[styles.titulo, noLeida ? styles.tituloNoLeido : styles.tituloLeido]}
            numberOfLines={1}
          >
            {tipo.titulo}
          </Text>
          <Text style={body(12, colors.neutral600)}>{marcaAviso(aviso.fechaISO)}</Text>
          {noLeida ? <View style={styles.punto} /> : null}
        </View>
        <Text style={body(14, aviso.leida ? colors.neutral700 : colors.text)} numberOfLines={2}>
          {aviso.titulo}
        </Text>
        {aviso.cuerpo ? (
          <Text style={body(13, colors.neutral600)} numberOfLines={1}>
            {aviso.cuerpo}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
    gap: 20,
  },
  presionado: {
    opacity: 0.6,
  },
  marcarTodas: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.accent700,
  },
  vacio: {
    paddingVertical: 24,
    textAlign: "center",
  },
  // Filtros (mismas pastillas que el historial de Ofertas)
  filtros: {
    flexDirection: "row",
    gap: 8,
  },
  filtro: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.superficie,
    borderWidth: 1,
    borderColor: colors.borde,
  },
  filtroActivo: {
    backgroundColor: colors.accent900,
    borderColor: colors.accent900,
  },
  filtroTexto: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.neutral700,
  },
  filtroTextoActivo: {
    color: "#ffffff",
  },
  // Bandeja
  grupo: {
    gap: 8,
  },
  bandeja: {
    borderRadius: radius.lg,
    backgroundColor: colors.superficie,
    overflow: "hidden",
    ...sombra.sm,
  },
  fila: {
    flexDirection: "row",
    gap: 12,
    paddingLeft: 14,
  },
  filaPresionada: {
    backgroundColor: colors.neutral100,
  },
  icono: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent100,
  },
  iconoFuerte: {
    backgroundColor: colors.accent,
  },
  iconoApagado: {
    backgroundColor: colors.neutral100,
  },
  texto: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingVertical: 12,
    paddingRight: 14,
  },
  divisor: {
    borderTopWidth: 1,
    borderTopColor: colors.borde,
  },
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titulo: {
    flex: 1,
    fontSize: 15,
  },
  tituloNoLeido: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  tituloLeido: {
    fontFamily: fonts.bodyMedium,
    color: colors.neutral700,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
