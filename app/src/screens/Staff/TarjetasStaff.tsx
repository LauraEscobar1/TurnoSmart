import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { body, fonts, heading, label } from "@/theme/typography";
import { Badge, BadgeVariant } from "@/components/Badge";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { CitaAgenda, CupoStaff, EstadoCupo, EstadoOfertaCupo, MetricasStaff, RiesgoCita } from "@/types/staff";
import { hora, useFormato } from "@/utils/format";
import { useDato, useT } from "@/i18n";

/**
 * Piezas del panel del staff. Paleta mono del sistema de diseño: el estado
 * se codifica por relleno, nunca por color (§02 Vocabulario y estados).
 *   · Riesgo de inasistencia: contorno punteado («es una hipótesis»).
 *   · Cupo: disponible = contorno, oferta enviada = relleno tenue,
 *     recuperado = campo sólido, perdido = gris tachado.
 */

const VARIANTE_CUPO: Record<EstadoCupo, BadgeVariant> = {
  abierto: "outline",
  ofrecido: "tint",
  tomado: "solid",
  expirado: "lost",
};

const VARIANTE_OFERTA: Record<EstadoOfertaCupo, BadgeVariant> = {
  pendiente: "tint",
  aceptada: "solid",
  rechazada: "neutral",
  expirada: "lost",
};

// — Métricas —

export function MetricasPanel({ metricas }: { metricas: MetricasStaff }) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const tasa = metricas.tasaRecuperacion === null ? "—" : `${Math.round(metricas.tasaRecuperacion * 100)} %`;
  const items: { clave: string; etiqueta: string; valor: string }[] = [
    { clave: "cancelaciones", etiqueta: t("staff.metricas.cancelaciones"), valor: String(metricas.cancelaciones) },
    { clave: "liberados", etiqueta: t("staff.metricas.cuposLiberados"), valor: String(metricas.cuposLiberados) },
    { clave: "recuperados", etiqueta: t("staff.metricas.cuposRecuperados"), valor: String(metricas.cuposRecuperados) },
    { clave: "tasa", etiqueta: t("staff.metricas.tasaRecuperacion"), valor: tasa },
  ];
  return (
    <View style={styles.metricas}>
      <Text style={label(11, colors.textoSuaveSobreFondo)}>{t("staff.ultimosDias", { dias: metricas.dias })}</Text>
      <View style={styles.rejilla}>
        {items.map((m) => (
          <Card key={m.clave} style={styles.metrica}>
            <Text style={heading(34, colors.accent900)} accessibilityLabel={`${m.etiqueta}: ${m.valor}`}>
              {m.valor}
            </Text>
            <Text style={body(13, colors.neutral700)}>{m.etiqueta}</Text>
          </Card>
        ))}
      </View>
    </View>
  );
}

// — Riesgo —

export function BadgeRiesgo({ riesgo }: { riesgo: RiesgoCita | null }) {
  const t = useT();
  if (!riesgo) return <Badge label={t("staff.riesgo.sinCalcular")} variant="neutral" />;
  return <Badge label={t(`staff.riesgo.${riesgo.nivel}`)} variant="risk" />;
}

// — Agenda —

interface CitaAgendaCardProps {
  cita: CitaAgenda;
  /** true si la hora de la cita ya pasó (solo se puede marcar inasistencia). */
  pasada: boolean;
  ocupado: boolean;
  onCalcular: () => void;
  onCancelar: () => void;
  onInasistencia: () => void;
}

export function CitaAgendaCard({ cita, pasada, ocupado, onCalcular, onCancelar, onInasistencia }: CitaAgendaCardProps) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const dato = useDato();
  const { idioma, fechaConDia } = useFormato();
  const r = cita.riesgo;
  return (
    <Card style={styles.tarjeta}>
      <View style={styles.cabecera}>
        <View style={styles.flex}>
          <Text style={heading(26, colors.accent900)}>{hora(cita.fechaHoraISO)}</Text>
          <Text style={label(11, colors.neutral600)}>{fechaConDia(cita.fechaHoraISO)}</Text>
        </View>
        <BadgeRiesgo riesgo={r} />
      </View>

      <Text style={[body(15, colors.text), styles.medio]}>
        {t("staff.agenda.paciente", { iniciales: cita.paciente.iniciales, codigo: cita.paciente.codigo })}
      </Text>
      <Text style={body(13, colors.neutral700)}>
        {dato("especialidades", cita.especialidad)} · {cita.profesional}
      </Text>
      {cita.origen === "cupo-recuperado" ? <Badge label={t("staff.agenda.recuperado")} variant="neutral" /> : null}

      {r ? (
        <View style={styles.explicacion}>
          <Text style={body(13, colors.text)}>{idioma === "en" ? r.explicacion.en : r.explicacion.es}</Text>
          <Text style={label(10, colors.neutral600)}>
            {r.estrategia === "ai" ? t("staff.riesgo.ia") : t("staff.riesgo.reglas")}
          </Text>
        </View>
      ) : null}

      {pasada ? (
        <View style={styles.acciones}>
          <Text style={[body(13, colors.neutral700), styles.flex]}>{t("staff.agenda.pasoLaHora")}</Text>
          <PrimaryButton
            label={t("staff.agenda.inasistencia")}
            variant="secondary"
            onPress={onInasistencia}
            disabled={ocupado}
            style={styles.boton}
          />
        </View>
      ) : (
        <View style={styles.acciones}>
          <PrimaryButton
            label={r ? t("staff.agenda.recalcular") : t("staff.agenda.calcular")}
            variant="ghost"
            onPress={onCalcular}
            disabled={ocupado}
            style={[styles.boton, styles.flex]}
          />
          <PrimaryButton
            label={t("staff.agenda.cancelar")}
            variant="secondary"
            onPress={onCancelar}
            disabled={ocupado}
            style={[styles.boton, styles.flex]}
          />
        </View>
      )}
    </Card>
  );
}

// — Cupos —

export function CupoCard({ cupo }: { cupo: CupoStaff }) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const dato = useDato();
  const { fechaConDia } = useFormato();
  return (
    <Card style={styles.tarjeta}>
      <View style={styles.cabecera}>
        <View style={styles.flex}>
          <Text style={heading(22, colors.accent900)}>
            {fechaConDia(cupo.fechaHoraISO)} · {hora(cupo.fechaHoraISO)}
          </Text>
          <Text style={body(13, colors.neutral700)}>
            {dato("especialidades", cupo.especialidad)} · {t(`staff.cupos.motivo.${cupo.motivo}`)}
          </Text>
        </View>
        <Badge label={t(`staff.cupos.estado.${cupo.estado}`)} variant={VARIANTE_CUPO[cupo.estado]} />
      </View>

      <Text style={label(10, colors.neutral600)}>{t("staff.cupos.ofertas")}</Text>
      {cupo.ofertas.length === 0 ? (
        <Text style={body(13, colors.neutral700)}>{t("staff.cupos.sinOfertas")}</Text>
      ) : (
        cupo.ofertas.map((o, i) => (
          <View key={`${cupo.id}-${i}`} style={styles.oferta}>
            <Text style={[body(14, colors.text), styles.flex]}>
              {i + 1}. {o.paciente.iniciales} · {o.paciente.codigo}
            </Text>
            <Badge label={t(`staff.cupos.oferta.${o.estado}`)} variant={VARIANTE_OFERTA[o.estado]} />
          </View>
        ))
      )}
    </Card>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
    flex: { flex: 1 },
    metricas: { gap: 8 },
    rejilla: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    metrica: { flexBasis: "47%", flexGrow: 1, paddingVertical: 14, paddingHorizontal: 16, gap: 2 },
    tarjeta: { padding: 16, gap: 8 },
    cabecera: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    medio: { fontFamily: fonts.bodyMedium },
    explicacion: {
      gap: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    acciones: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
    boton: { minHeight: 42 },
    oferta: { flexDirection: "row", alignItems: "center", gap: 10 },
  });
