import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { OfertaCupo } from "@/types/domain";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { radius } from "@/theme/spacing";
import { body, fonts, heading } from "@/theme/typography";
import { CupoReasignado, getCuposReasignados, getOfertasPendientes } from "@/services/offersService";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { PrimaryButton } from "@/components/PrimaryButton";
import { IconoCirculo } from "@/components/Adornos";
import { EntradaEscalonada, PulsoAsistente } from "@/components/Animaciones";
import { IlustracionSinOfertas } from "@/components/IlustracionSinOfertas";
import { InsigniaRecomendacion } from "@/components/Recomendacion";
import { hora, useFormato } from "@/utils/format";
import { useDato, useT } from "@/i18n";

interface Props {
  visible: boolean;
  onCerrar: () => void;
  onVerOferta: (ofertaId: string) => void;
  onVerCita: (citaId: string) => void;
}

const RESORTE = { damping: 20, stiffness: 190, mass: 0.9 };
const CIERRE_MS = 220;
/** Arrastre (px) o velocidad a partir de los que la hoja se cierra al soltarla. */
const UMBRAL_CIERRE = 110;
const VELOCIDAD_CIERRE = 0.9;

/**
 * Panel del asistente IA (Inicio › Ofertas de cupo): hoja que sube con
 * resorte sobre un velo; se cierra deslizándola hacia abajo o tocando fuera.
 * Muestra las ofertas que esperan respuesta y los cupos reasignados a este
 * paciente. Regla de honestidad: la IA se menciona solo en los cupos con
 * estrategia "ai"; los del respaldo dicen «Reasignado por TurnoSmart».
 */
export function PanelAsistente({ visible, onCerrar, onVerOferta, onVerCita }: Props) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reducir = useReducedMotion();
  const [pendientes, setPendientes] = useState<OfertaCupo[]>([]);
  const [reasignados, setReasignados] = useState<CupoReasignado[] | null>(null);

  // Solo datos propios, con los servicios de siempre; se leen cada vez que se abre.
  useEffect(() => {
    if (!visible) return;
    let vivo = true;
    setReasignados(null);
    Promise.all([getOfertasPendientes(), getCuposReasignados()]).then(([p, r]) => {
      if (!vivo) return;
      setPendientes(p);
      setReasignados(r);
    });
    return () => {
      vivo = false;
    };
  }, [visible]);

  // Entrada con resorte y salida deslizando; sin movimiento con «Reducir movimiento».
  const y = useSharedValue(height);
  const velo = useSharedValue(0);
  useEffect(() => {
    if (!visible) return;
    if (reducir) {
      y.value = 0;
      velo.value = 1;
    } else {
      y.value = height;
      y.value = withSpring(0, RESORTE);
      velo.value = withTiming(1, { duration: 200 });
    }
  }, [visible, reducir, height, y, velo]);

  const cerrando = useRef(false);
  const cerrar = useCallback(() => {
    if (cerrando.current) return;
    cerrando.current = true;
    if (!reducir) {
      y.value = withTiming(height, { duration: CIERRE_MS });
      velo.value = withTiming(0, { duration: CIERRE_MS });
    }
    setTimeout(
      () => {
        cerrando.current = false;
        onCerrar();
      },
      reducir ? 0 : CIERRE_MS
    );
  }, [reducir, height, y, velo, onCerrar]);

  const arrastre = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          y.value = Math.max(0, g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > UMBRAL_CIERRE || g.vy > VELOCIDAD_CIERRE) cerrar();
          else y.value = reducir ? 0 : withSpring(0, RESORTE);
        },
      }),
    [y, cerrar, reducir]
  );

  const estiloHoja = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const estiloVelo = useAnimatedStyle(() => ({ opacity: velo.value }));

  const deIA = (reasignados ?? []).filter((r) => r.oferta.estrategia === "ai").length;
  const deRespaldo = (reasignados ?? []).length - deIA;
  // Solo se habla de la IA si hay cupos de la IA (o ninguno todavía: el asistente está atento).
  const titulo = deIA > 0 || deRespaldo === 0 ? t("panelIA.titulo") : t("panelIA.tituloTurnoSmart");

  const irA = (accion: () => void) => {
    onCerrar();
    accion();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={cerrar} statusBarTranslucent>
      <View style={styles.contenedor}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.velo, estiloVelo]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={cerrar} accessibilityLabel={t("comun.cerrar")} />
        </Animated.View>

        <Animated.View
          style={[styles.hoja, { maxHeight: height * 0.88, paddingBottom: insets.bottom + 16 }, estiloHoja]}
          accessibilityViewIsModal
        >
          {/* Zona de arrastre: tirador y encabezado. */}
          <View {...arrastre.panHandlers} accessibilityHint={t("panelIA.deslizar")}>
            <View style={styles.tirador} />
            <View style={styles.encabezado}>
              <PulsoAsistente tamano={76}>
                <IconoCirculo ia tamano={56} tamanoIcono={30} />
              </PulsoAsistente>
              <Text style={[heading(22, colors.textoPanelIA), styles.centrado]} accessibilityRole="header">
                {titulo}
              </Text>
              {reasignados && deIA > 0 ? <Contador clave="panelIA.contadorIA" objetivo={deIA} /> : null}
              {reasignados && deRespaldo > 0 ? <Contador clave="panelIA.contadorTurnoSmart" objetivo={deRespaldo} /> : null}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
            {pendientes.length ? (
              <View style={styles.bloque}>
                <Text style={styles.seccion}>{t("panelIA.pendientes")}</Text>
                {pendientes.map((o, i) => (
                  <EntradaEscalonada key={o.id} indice={i}>
                    <OfertaPendiente oferta={o} onVer={() => irA(() => onVerOferta(o.id))} />
                  </EntradaEscalonada>
                ))}
              </View>
            ) : null}

            {reasignados === null ? null : reasignados.length ? (
              <View style={styles.bloque}>
                <Text style={styles.seccion}>{t("panelIA.reasignados")}</Text>
                {reasignados.map((r, i) => (
                  <EntradaEscalonada key={r.oferta.id} indice={pendientes.length + i}>
                    <CupoRecuperado
                      cupo={r}
                      onVerCita={r.citaId ? () => irA(() => onVerCita(r.citaId!)) : undefined}
                    />
                  </EntradaEscalonada>
                ))}
              </View>
            ) : (
              <View style={styles.vacio}>
                <PulsoAsistente tamano={150}>
                  <IlustracionSinOfertas size={130} />
                </PulsoAsistente>
                <Text style={[body(14, colors.textoSuavePanelIA), styles.centrado]}>{t("panelIA.vacio")}</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** «La IA ha recuperado X citas para ti»: el número sube de 0 a X (al instante con «Reducir movimiento»). */
function Contador({ clave, objetivo }: { clave: "panelIA.contadorIA" | "panelIA.contadorTurnoSmart"; objetivo: number }) {
  const styles = useEstilos(crearStyles);
  const t = useT();
  const reducir = useReducedMotion();
  const [n, setN] = useState(reducir ? objetivo : 0);
  useEffect(() => {
    if (reducir || objetivo <= 1) {
      setN(objetivo);
      return;
    }
    setN(0);
    const paso = Math.max(40, Math.round(600 / objetivo));
    const id = setInterval(() => setN((v) => (v + 1 >= objetivo ? (clearInterval(id), objetivo) : v + 1)), paso);
    return () => clearInterval(id);
  }, [objetivo, reducir]);
  return (
    <Text style={styles.contador} accessibilityLiveRegion="polite">
      {t(clave, { count: n })}
    </Text>
  );
}

function OfertaPendiente({ oferta, onVer }: { oferta: OfertaCupo; onVer: () => void }) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const dato = useDato();
  const { fechaConDia } = useFormato();
  return (
    <Card tono="acento" style={styles.item}>
      <InsigniaRecomendacion estrategia={oferta.estrategia} />
      <Text style={heading(20, colors.accent900)}>{dato("especialidades", oferta.especialidad)}</Text>
      <Text style={body(13, colors.neutral700)}>
        {fechaConDia(oferta.fechaHoraISO)} · {hora(oferta.fechaHoraISO)} · {oferta.profesional}
      </Text>
      <PrimaryButton label={t("oferta.verOferta")} onPress={onVer} />
    </Card>
  );
}

function CupoRecuperado({ cupo, onVerCita }: { cupo: CupoReasignado; onVerCita?: () => void }) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const dato = useDato();
  const { fechaConDia } = useFormato();
  const { oferta } = cupo;
  const ia = oferta.estrategia === "ai";
  return (
    <Card style={styles.item}>
      <Badge label={t(ia ? "panelIA.reasignadoIA" : "panelIA.reasignadoTurnoSmart")} variant={ia ? "info" : "neutral"} />
      <Text style={heading(20, colors.accent900)}>{dato("especialidades", oferta.especialidad)}</Text>
      <View style={styles.datos}>
        <Text style={[body(14, colors.text), styles.medio]}>
          {fechaConDia(oferta.fechaHoraISO)} · {hora(oferta.fechaHoraISO)}
        </Text>
        <Text style={body(13, colors.neutral700)}>
          {oferta.profesional} · {oferta.consultorio}
        </Text>
      </View>
      <Text style={body(13, colors.neutral700)}>{t(ia ? "panelIA.explicacionIA" : "panelIA.explicacionTurnoSmart")}</Text>
      {onVerCita ? <PrimaryButton label={t("panelIA.verCita")} variant="secondary" onPress={onVerCita} /> : null}
    </Card>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    contenedor: {
      flex: 1,
      justifyContent: "flex-end",
    },
    velo: {
      backgroundColor: colors.velo,
    },
    // Un tono más oscuro del tema, en una sola capa con sombra suave.
    hoja: {
      borderTopLeftRadius: radius.xl + 4,
      borderTopRightRadius: radius.xl + 4,
      backgroundColor: colors.fondoPanelIA,
      shadowColor: colors.sombraCard,
      shadowOpacity: 0.35,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: -6 },
      elevation: 12,
    },
    tirador: {
      alignSelf: "center",
      width: 44,
      height: 5,
      borderRadius: 3,
      marginTop: 10,
      backgroundColor: colors.tiradorPanelIA,
    },
    encabezado: {
      alignItems: "center",
      gap: 8,
      paddingTop: 12,
      paddingHorizontal: 24,
      paddingBottom: 8,
    },
    centrado: {
      textAlign: "center",
    },
    contador: {
      fontFamily: fonts.bodyBold,
      fontSize: 14,
      color: colors.textoSuavePanelIA,
      textAlign: "center",
    },
    contenido: {
      paddingHorizontal: 18,
      paddingTop: 8,
      gap: 18,
    },
    bloque: {
      gap: 10,
    },
    seccion: {
      fontFamily: fonts.bodyMedium,
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: colors.textoSuavePanelIA,
    },
    item: {
      padding: 16,
      gap: 8,
    },
    datos: {
      gap: 2,
    },
    medio: {
      fontFamily: fonts.bodyMedium,
    },
    vacio: {
      alignItems: "center",
      gap: 14,
      paddingVertical: 12,
    },
  });
