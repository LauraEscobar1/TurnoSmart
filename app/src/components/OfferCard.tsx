import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { OfertaCupo } from "@/types/domain";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { body, heading, label } from "@/theme/typography";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Countdown, useCountdown } from "@/components/Countdown";
import { PrimaryButton } from "@/components/PrimaryButton";
import { fechaConDia, hora, diaRelativo } from "@/utils/format";

interface OfferCardProps {
  oferta: OfertaCupo;
  /**
   * home:      tarjeta tintada de Home con «Ver oferta» (01 · Home).
   * full:      tarjeta completa con Rechazar / Aceptar cupo (componente primario).
   */
  variant?: "home" | "full";
  onPress?: () => void;
  onAceptar?: () => void;
  onRechazar?: () => void;
}

/**
 * Tarjeta de oferta de cupo — el objeto de mayor jerarquía de la app
 * (docs/02-jerarquia.md §4). Nunca hay dos tarjetas de oferta activas.
 */
export function OfferCard({ oferta, variant = "full", onPress, onAceptar, onRechazar }: OfferCardProps) {
  return variant === "home" ? (
    <HomeOffer oferta={oferta} onPress={onPress} />
  ) : (
    <FullOffer oferta={oferta} onAceptar={onAceptar} onRechazar={onRechazar} />
  );
}

function abreviarProfesional(nombre: string) {
  // "Dr. Camilo Rojas" → "Dr. C. Rojas"
  const partes = nombre.split(" ");
  if (partes.length < 3) return nombre;
  return `${partes[0]} ${partes[1][0]}. ${partes.slice(2).join(" ")}`;
}

function HomeOffer({ oferta, onPress }: Pick<OfferCardProps, "oferta" | "onPress">) {
  const segundos = useCountdown(oferta.expiraEnISO);
  const expirada = segundos === 0;

  return (
    <Card tono="acento" style={[styles.home, expirada && styles.expired]}>
      <View style={styles.topRow}>
        <Badge label={expirada ? "Oferta expirada" : "Oferta para vos"} variant={expirada ? "lost" : "accent"} />
        {!expirada && (
          <Countdown
            segundos={segundos}
            size={22}
            caption="restantes"
            color={colors.accent800}
            captionStyle={{ fontSize: 8, color: colors.accent800 }}
          />
        )}
      </View>
      <View>
        <Text style={heading(25, colors.accent900)}>{oferta.especialidad}</Text>
        <Text style={body(13, colors.accent800)}>
          {diaRelativo(oferta.fechaHoraISO)} {hora(oferta.fechaHoraISO)} · {abreviarProfesional(oferta.profesional)}
        </Text>
      </View>
      <PrimaryButton label="Ver oferta" onPress={onPress} disabled={expirada} />
    </Card>
  );
}

function FullOffer({ oferta, onAceptar, onRechazar }: Pick<OfferCardProps, "oferta" | "onAceptar" | "onRechazar">) {
  const segundos = useCountdown(oferta.expiraEnISO);
  const expirada = segundos === 0;

  return (
    <Card style={styles.full}>
      <View style={styles.topRow}>
        <Badge label={expirada ? "Oferta expirada" : "Oferta para vos"} variant={expirada ? "lost" : "tint"} />
        {!expirada && <Countdown segundos={segundos} size={26} caption="para responder" />}
      </View>
      <View>
        <Text style={heading(30)}>{oferta.especialidad}</Text>
        <Text style={body(14, colors.neutral700)}>
          {oferta.profesional} · {oferta.consultorio}
        </Text>
      </View>
      <DataRow fecha={fechaConDia(oferta.fechaHoraISO)} hora={hora(oferta.fechaHoraISO)} size={19} />
      <View style={styles.actions}>
        <PrimaryButton
          label="Rechazar"
          variant="secondary"
          onPress={onRechazar}
          disabled={expirada}
          style={styles.action}
        />
        <PrimaryButton label="Aceptar cupo" onPress={onAceptar} disabled={expirada} style={styles.action} />
      </View>
    </Card>
  );
}

/** Franja FECHA | HORA entre reglas de un pelo. */
export function DataRow({ fecha, hora: h, size }: { fecha: string; hora: string; size: number }) {
  return (
    <View style={styles.dataRow}>
      <View style={styles.dataCell}>
        <Text style={label(9)}>Fecha</Text>
        <Text style={heading(size)}>{fecha}</Text>
      </View>
      <View style={[styles.dataCell, styles.dataCellRight]}>
        <Text style={label(9)}>Hora</Text>
        <Text style={heading(size)}>{h}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  home: {
    padding: 16,
    gap: 12,
  },
  full: {
    padding: 20,
    gap: 14,
  },
  expired: {
    opacity: 0.55,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  action: {
    flex: 1,
  },
  dataRow: {
    flexDirection: "row",
    gap: 10,
  },
  dataCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.accent100,
  },
  dataCellRight: {},
});
