import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCargarDatos } from "@/hooks/useCargarDatos";
import { usePaciente } from "@/auth/AuthContext";
import { colors } from "@/theme/colors";
import { radius, sombra } from "@/theme/spacing";
import { body, fonts, label } from "@/theme/typography";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Notificacion, TipoNotificacion } from "@/types/domain";
import { getNotificaciones, marcarComoLeida, marcarTodasComoLeidas } from "@/services/notificationsService";
import { RootStackParamList } from "@/navigation/types";
import { useFormato } from "@/utils/format";
import { useT } from "@/i18n";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Cada tipo tiene su ícono y su jerarquía, sin salir de la paleta mono:
 * el cupo disponible (lo único urgente) lleva el círculo de Acero sólido;
 * citas y confirmaciones, el tinte suave; lo ya resuelto, gris.
 */
const TIPO: Record<TipoNotificacion, { icono: keyof typeof Ionicons.glyphMap; tono: "fuerte" | "suave" | "apagado" }> = {
  "cupo-ultimo-minuto": { icono: "flash", tono: "fuerte" },
  recordatorio: { icono: "calendar-outline", tono: "suave" },
  confirmacion: { icono: "checkmark-circle-outline", tono: "suave" },
  expiracion: { icono: "time-outline", tono: "apagado" },
};

/**
 * Notificaciones — Nivel 1 (04 · Notificaciones).
 * Una bandeja cronológica (Hoy, Ayer, Esta semana, Anteriores), no una lista
 * de tarjetas. Cada fila es la notificación tal como llegó: título, mensaje
 * breve y, si corresponde, una acción. El detalle completo vive en el
 * destino (docs/03-navegacion.md §4): un recordatorio abre su cita al
 * tocarlo; un cupo disponible abre la oferta desde «Ver oferta».
 * Sin leer: título en negrita y punto de Acero. Leído: texto atenuado.
 */
export function NotificationsScreen() {
  const t = useT();
  const { idioma, grupoAviso } = useFormato();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Notificacion[]>([]);

  const { nombre } = usePaciente();

  const cargar = useCallback(() => {
    getNotificaciones(nombre, idioma).then(setItems);
  }, [nombre, idioma]);

  useCargarDatos(cargar);

  const hayNoLeidas = items.some((n) => !n.leida);

  const grupos = useMemo(() => {
    const porGrupo = new Map<string, Notificacion[]>();
    for (const n of items) {
      const g = grupoAviso(n.fechaISO);
      porGrupo.set(g, [...(porGrupo.get(g) ?? []), n]);
    }
    return [...porGrupo.entries()];
  }, [items, grupoAviso]);

  /** Tocar la notificación la marca como leída; el recordatorio además abre su cita. */
  async function handlePress(n: Notificacion) {
    await marcarComoLeida(n.id);
    cargar();
    if (n.tipo === "recordatorio" && n.referenciaId) {
      navigation.navigate("Tabs", {
        screen: "MisCitas",
        params: { screen: "AppointmentDetail", params: { citaId: n.referenciaId }, initial: false },
      });
    }
  }

  /** «Ver oferta»: el destino con el contador y las acciones de la oferta. */
  async function handleVerOferta(n: Notificacion) {
    await marcarComoLeida(n.id);
    cargar();
    if (n.referenciaId) navigation.navigate("OfferDetail", { ofertaId: n.referenciaId });
  }

  async function handleMarcarTodas() {
    await marcarTodasComoLeidas();
    cargar();
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScreenHeader
        title={t("notificaciones.titulo")}
        accion={
          hayNoLeidas ? (
            <Pressable
              onPress={handleMarcarTodas}
              hitSlop={10}
              accessibilityRole="button"
              style={({ pressed }) => pressed && styles.presionado}
            >
              <Text style={styles.marcarTodas}>{t("notificaciones.marcarTodo")}</Text>
            </Pressable>
          ) : null
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filtros}>
          <View accessibilityState={{ selected: true }} style={[styles.filtro, styles.filtroActivo]}>
            <Text style={[styles.filtroTexto, styles.filtroTextoActivo]}>{t("notificaciones.todas")}</Text>
          </View>
        </View>

        {items.length === 0 ? (
          <EmptyState title={t("notificaciones.vacio")} />
        ) : (
          grupos.map(([grupo, avisos]) => (
            <View key={grupo} style={styles.grupo}>
              <Text style={label(10, colors.neutral600)}>{grupo}</Text>
              <View style={styles.bandeja}>
                {avisos.map((n, i) => (
                  <FilaAviso
                    key={n.id}
                    aviso={n}
                    divisor={i > 0}
                    onPress={() => handlePress(n)}
                    onVerOferta={() => handleVerOferta(n)}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilaAviso({
  aviso,
  divisor,
  onPress,
  onVerOferta,
}: {
  aviso: Notificacion;
  divisor: boolean;
  onPress: () => void;
  onVerOferta: () => void;
}) {
  const t = useT();
  const { marcaAviso } = useFormato();
  const tipo = TIPO[aviso.tipo];
  const noLeida = !aviso.leida;
  const conOferta = aviso.tipo === "cupo-ultimo-minuto" && !!aviso.referenciaId;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${noLeida ? `${t("notificaciones.sinLeer")}. ` : ""}${aviso.titulo}. ${marcaAviso(aviso.fechaISO)}. ${aviso.cuerpo}`}
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
            // Sin límite de líneas: si el título y la hora no entran juntos
            // (p. ej. «Appointment reminder» en inglés), el título pasa a dos líneas.
            style={[styles.titulo, noLeida ? styles.tituloNoLeido : styles.tituloLeido]}
          >
            {aviso.titulo}
          </Text>
          <Text style={body(12, colors.neutral600)}>{marcaAviso(aviso.fechaISO)}</Text>
          {noLeida ? <View style={styles.punto} /> : null}
        </View>
        <Text style={[body(14, aviso.leida ? colors.neutral700 : colors.text), styles.mensaje]}>{aviso.cuerpo}</Text>
        {conOferta ? (
          <Pressable
            onPress={onVerOferta}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={t("oferta.verOferta")}
            style={({ pressed }) => [styles.verOferta, pressed && styles.presionado]}
          >
            <Text style={styles.verOfertaTexto}>{t("oferta.verOferta")}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.accent700} />
          </Pressable>
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
  // Filtro (misma pastilla que el historial de Ofertas)
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
  mensaje: {
    lineHeight: 20,
  },
  verOferta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: 6,
  },
  verOfertaTexto: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.accent700,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
