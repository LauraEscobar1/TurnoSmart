import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCargarDatos } from "@/hooks/useCargarDatos";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { radius } from "@/theme/spacing";
import { body, fonts, heading } from "@/theme/typography";
import { Badge, BadgeVariant } from "@/components/Badge";
import { Card } from "@/components/Card";
import { IlustracionSinOfertas } from "@/components/IlustracionSinOfertas";
import { OfertaPendienteCard } from "@/components/OfertaPendienteCard";
import { EstadoOferta, OfertaCupo } from "@/types/domain";
import { aceptarOferta, getHistorialOfertas, getOfertasPendientes } from "@/services/offersService";
import { RootStackParamList } from "@/navigation/types";
import { hora, useFormato } from "@/utils/format";
import { Clave, useDato, useT } from "@/i18n";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Filtro = "todas" | "aceptada" | "rechazada" | "expirada";

const FILTROS: { value: Filtro; label: Clave; vacio: Clave }[] = [
  { value: "todas", label: "ofertas.filtros.todas", vacio: "ofertas.vacios.todas" },
  { value: "aceptada", label: "ofertas.filtros.aceptadas", vacio: "ofertas.vacios.aceptadas" },
  { value: "rechazada", label: "ofertas.filtros.canceladas", vacio: "ofertas.vacios.canceladas" },
  { value: "expirada", label: "ofertas.filtros.expiradas", vacio: "ofertas.vacios.expiradas" },
];

const ESTADO: Record<Exclude<EstadoOferta, "pendiente">, { label: Clave; variant: BadgeVariant; icono: keyof typeof Ionicons.glyphMap }> = {
  aceptada: { label: "ofertas.estados.aceptada", variant: "solid", icono: "checkmark" },
  rechazada: { label: "ofertas.estados.cancelada", variant: "neutral", icono: "close" },
  expirada: { label: "ofertas.estados.expirada", variant: "lost", icono: "time-outline" },
};

const PASOS: Clave[] = ["ofertas.pasos.uno", "ofertas.pasos.dos", "ofertas.pasos.tres"];

/**
 * Ofertas — el centro donde el paciente recibe y responde cupos
 * (docs/02-jerarquia.md §2). Tres pesos visuales:
 *   1. Lo que requiere acción: aviso protagonista y ofertas pendientes completas.
 *   2. El historial, compacto y filtrable.
 *   3. «¿Cómo funcionan las ofertas?», colapsable, para quien recién empieza.
 */
export function OffersListScreen() {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const navigation = useNavigation<Nav>();
  const [pendientes, setPendientes] = useState<OfertaCupo[]>([]);
  const [historial, setHistorial] = useState<OfertaCupo[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [ayudaAbierta, setAyudaAbierta] = useState(false);

  useCargarDatos(
    useCallback(() => {
      getOfertasPendientes().then(setPendientes);
      getHistorialOfertas().then(setHistorial);
    }, [])
  );

  const filtradas = useMemo(
    () => (filtro === "todas" ? historial : historial.filter((o) => o.estado === filtro)),
    [historial, filtro]
  );

  async function aceptar(oferta: OfertaCupo) {
    await aceptarOferta(oferta.id);
    navigation.navigate("OfferConfirmation", { ofertaId: oferta.id, resultado: "aceptada" });
  }

  const n = pendientes.length;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Encabezado */}
        <View>
          <Text style={heading(30, colors.accent900)} accessibilityRole="header">
            {t("ofertas.titulo")}
          </Text>
          <Text style={[body(14, colors.neutral700), styles.bajada]}>{t("ofertas.bajada")}</Text>
        </View>

        {/* 1. Lo que requiere respuesta */}
        {n > 0 ? (
          <View style={styles.bloque}>
            <View style={styles.aviso} accessibilityRole="summary">
              <View style={styles.avisoIcono}>
                <Ionicons name="flash" size={18} color={colors.accent900} />
              </View>
              <Text style={styles.avisoTexto}>{t("ofertas.requierenRespuesta", { count: n })}</Text>
            </View>
            {pendientes.map((o) => (
              <OfertaPendienteCard
                key={o.id}
                oferta={o}
                onAceptar={() => aceptar(o)}
                onVerDetalles={() => navigation.navigate("OfferDetail", { ofertaId: o.id })}
              />
            ))}
          </View>
        ) : (
          <View style={styles.vacio}>
            <IlustracionSinOfertas />
            <Text style={[heading(22, colors.accent900), styles.centro]}>{t("ofertas.sinNuevas")}</Text>
            <Text style={[body(14, colors.neutral700), styles.centro, styles.vacioTexto]}>
              {t("ofertas.sinNuevasTexto")}
            </Text>
          </View>
        )}

        {/* 2. Historial compacto */}
        {historial.length > 0 && (
          <View style={styles.bloque}>
            <Text style={heading(18, colors.accent900)}>{t("ofertas.historial")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtros}
              style={styles.filtrosScroll}
            >
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
                    <Text style={[styles.filtroTexto, activo && styles.filtroTextoActivo]}>{t(f.label)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Card style={styles.lista}>
              {filtradas.length ? (
                filtradas.map((o, i) => <FilaHistorial key={o.id} oferta={o} divisor={i > 0} />)
              ) : (
                <Text style={[body(13, colors.neutral600), styles.listaVacia]}>
                  {t(FILTROS.find((f) => f.value === filtro)!.vacio)}
                </Text>
              )}
            </Card>
          </View>
        )}

        {/* 3. Ayuda colapsable */}
        <Card tono="plana" style={styles.ayuda}>
          <Pressable
            onPress={() => setAyudaAbierta((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: ayudaAbierta }}
            style={styles.ayudaCabecera}
          >
            <Text style={heading(17, colors.accent900)}>{t("ofertas.comoFuncionan")}</Text>
            <Ionicons name={ayudaAbierta ? "remove" : "add"} size={20} color={colors.accent700} />
          </Pressable>
          {ayudaAbierta && (
            <View style={styles.pasos}>
              {PASOS.map((p, i) => (
                <View key={i} style={styles.paso}>
                  <View style={styles.pasoNumero}>
                    <Text style={styles.pasoNumeroTexto}>{i + 1}</Text>
                  </View>
                  <Text style={[body(13, colors.neutral700), styles.flex]}>{t(p)}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Una línea por oferta resuelta: ya no requieren acción, así que ocupan poco. */
function FilaHistorial({ oferta, divisor }: { oferta: OfertaCupo; divisor: boolean }) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const dato = useDato();
  const { fechaCorta } = useFormato();
  const e = ESTADO[oferta.estado as Exclude<EstadoOferta, "pendiente">];
  return (
    <View style={[styles.fila, divisor && styles.filaDivisor]}>
      <View style={[styles.filaIcono, oferta.estado === "aceptada" && styles.filaIconoAceptada]}>
        <Ionicons name={e.icono} size={14} color={oferta.estado === "aceptada" ? colors.sobreCampo : colors.neutral600} />
      </View>
      <View style={styles.flex}>
        <Text style={heading(16, colors.accent900)} numberOfLines={1}>
          {dato("especialidades", oferta.especialidad)}
        </Text>
        <Text style={body(12, colors.neutral600)} numberOfLines={1}>
          {fechaCorta(oferta.fechaHoraISO)} · {hora(oferta.fechaHoraISO)} · {oferta.profesional}
        </Text>
      </View>
      <Badge label={t(e.label)} variant={e.variant} style={styles.centrado} />
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.fondo,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 26,
  },
  bajada: {
    marginTop: 4,
  },
  bloque: {
    gap: 12,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  centro: {
    textAlign: "center",
  },
  centrado: {
    alignSelf: "center",
  },
  // Aviso protagonista
  aviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.campo,
  },
  avisoIcono: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent300,
    alignItems: "center",
    justifyContent: "center",
  },
  avisoTexto: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.sobreCampo,
  },
  // Vacío
  vacio: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  vacioTexto: {
    maxWidth: 290,
  },
  // Historial
  filtrosScroll: {
    marginHorizontal: -20,
  },
  filtros: {
    gap: 8,
    paddingHorizontal: 20,
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
  lista: {
    paddingHorizontal: 14,
  },
  listaVacia: {
    paddingVertical: 16,
    textAlign: "center",
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  filaDivisor: {
    borderTopWidth: 1,
    borderTopColor: colors.borde,
  },
  filaIcono: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  filaIconoAceptada: {
    backgroundColor: colors.campo,
  },
  // Ayuda
  ayuda: {
    paddingHorizontal: 16,
  },
  ayudaCabecera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  pasos: {
    gap: 12,
    paddingBottom: 16,
  },
  paso: {
    flexDirection: "row",
    gap: 10,
  },
  pasoNumero: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent100,
    alignItems: "center",
    justifyContent: "center",
  },
  pasoNumeroTexto: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.accent700,
  },
});
