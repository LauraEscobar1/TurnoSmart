import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCargarDatos } from "@/hooks/useCargarDatos";
import { usePaciente } from "@/auth/AuthContext";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import Animated, { LinearTransition, ReduceMotion } from "react-native-reanimated";
import { EncabezadoCompacto, EntradaEscalonada, useEncabezadoAlDesplazar } from "@/components/Animaciones";
import { IconoCirculo, TituloSeccion } from "@/components/Adornos";
import { Presionable } from "@/components/Presionable";
import { Pantalla } from "@/components/Vidrio";
import { radius } from "@/theme/spacing";
import { body, fonts } from "@/theme/typography";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/Card";
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
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const { idioma, grupoAviso } = useFormato();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Notificacion[]>([]);

  const { nombre } = usePaciente();

  const cargar = useCallback(() => getNotificaciones(nombre, idioma).then(setItems), [nombre, idioma]);

  useCargarDatos(cargar);

  // Deslizar hacia abajo vuelve a leer los avisos; al terminar, las cards entran de nuevo.
  const [refrescando, setRefrescando] = useState(false);
  const [ronda, setRonda] = useState(0);
  const refrescar = useCallback(() => {
    setRefrescando(true);
    cargar().finally(() => {
      setRefrescando(false);
      setRonda((r) => r + 1);
    });
  }, [cargar]);
  const { onScroll, desplazamiento } = useEncabezadoAlDesplazar();

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

  // Grupos (Hoy, Ayer…) y avisos en una sola lista: cada card entra al aparecer en pantalla.
  const filas = useMemo<Fila[]>(
    () =>
      grupos.flatMap(([grupo, avisos]) => [
        { clave: `g-${grupo}`, grupo },
        ...avisos.map((aviso) => ({ clave: aviso.id, aviso })),
      ]),
    [grupos]
  );

  return (
    <Pantalla edges={["top"]} style={styles.safe}>
      <EncabezadoCompacto
        titulo={t("notificaciones.titulo")}
        desplazamiento={desplazamiento}
        accion={
          hayNoLeidas ? (
            <Presionable onPress={handleMarcarTodas} hitSlop={10} accessibilityRole="button">
              <Text style={styles.marcarTodas}>{t("notificaciones.marcarTodo")}</Text>
            </Presionable>
          ) : null
        }
      />

      <Animated.FlatList
        data={filas}
        keyExtractor={(f) => `${ronda}-${f.clave}`}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        initialNumToRender={8}
        windowSize={7}
        itemLayoutAnimation={LinearTransition.duration(220).reduceMotion(ReduceMotion.System)}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colors.textoSobreFondo} />
        }
        ListHeaderComponent={
          <View style={styles.filtros}>
            <View accessibilityState={{ selected: true }} style={[styles.filtro, styles.filtroActivo]}>
              <Text style={[styles.filtroTexto, styles.filtroTextoActivo]}>{t("notificaciones.todas")}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState title={t("notificaciones.vacio")} />}
        renderItem={({ item, index }) =>
          "grupo" in item ? (
            <View style={[styles.grupo, index > 0 && styles.grupoSeparado]}>
              <TituloSeccion titulo={item.grupo} />
            </View>
          ) : (
            // Las primeras entran escalonadas; las que aparecen al desplazar, sin espera.
            <EntradaEscalonada indice={index < 8 ? index : 0}>
              <FilaAviso
                aviso={item.aviso}
                onPress={() => handlePress(item.aviso)}
                onVerOferta={() => handleVerOferta(item.aviso)}
              />
            </EntradaEscalonada>
          )
        }
      />
    </Pantalla>
  );
}

type Fila = { clave: string; grupo: string } | { clave: string; aviso: Notificacion };

function FilaAviso({
  aviso,
  onPress,
  onVerOferta,
}: {
  aviso: Notificacion;
  onPress: () => void;
  onVerOferta: () => void;
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const { marcaAviso } = useFormato();
  const tipo = TIPO[aviso.tipo];
  const noLeida = !aviso.leida;
  const conOferta = aviso.tipo === "cupo-ultimo-minuto" && !!aviso.referenciaId;
  return (
    <Card
      onPress={onPress}
      tono={noLeida ? "superficie" : "plana"}
      accessibilityRole="button"
      accessibilityLabel={`${noLeida ? `${t("notificaciones.sinLeer")}. ` : ""}${aviso.titulo}. ${marcaAviso(aviso.fechaISO)}. ${aviso.cuerpo}`}
      style={styles.fila}
    >
      {tipo.tono === "fuerte" ? (
        // Cupo de último minuto: lo ofrece el asistente de IA (robot con brillo suave).
        <View style={styles.iconoFuerte}>
          <IconoCirculo ia tamano={36} tamanoIcono={20} />
        </View>
      ) : (
        <IconoCirculo nombre={tipo.icono} tamano={36} tamanoIcono={18} />
      )}

      <View style={styles.texto}>
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
          <Presionable
            onPress={onVerOferta}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={t("oferta.verOferta")}
            style={styles.verOferta}
          >
            <Text style={styles.verOfertaTexto}>{t("oferta.verOferta")}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.icono} />
          </Presionable>
        ) : null}
      </View>
    </Card>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
    gap: 10,
  },
  marcarTodas: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.acentoSobreFondo,
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
    backgroundColor: colors.campo,
    borderColor: colors.campo,
  },
  filtroTexto: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.neutral700,
  },
  filtroTextoActivo: {
    color: colors.sobreCampo,
  },
  // Cada aviso en su card compacta; los grupos (Hoy, Ayer…) como títulos de sección.
  grupo: {
    marginTop: 4,
  },
  grupoSeparado: {
    marginTop: 14,
  },
  fila: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  // Cupo disponible: círculo sólido con brillo de IA.
  iconoFuerte: {
    borderRadius: 18,
    shadowColor: colors.brilloIA,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  texto: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
