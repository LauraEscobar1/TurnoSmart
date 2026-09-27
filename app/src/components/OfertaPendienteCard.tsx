import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { OfertaCupo } from "@/types/domain";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { body, fonts, heading, label } from "@/theme/typography";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Countdown, useCountdown } from "@/components/Countdown";
import { PrimaryButton } from "@/components/PrimaryButton";
import { fechaConDia, hora } from "@/utils/format";

interface Props {
  oferta: OfertaCupo;
  onAceptar: () => void;
  onVerDetalles: () => void;
}

/**
 * Oferta pendiente en la pantalla Ofertas: la tarjeta más importante de la
 * sección. Estado y contador arriba, la especialidad protagonista, los
 * cuatro datos en una grilla y, abajo, «Aceptar cupo» como acción clara
 * (un toque: sin «¿seguro?», regla de 2 toques) y «Ver detalles».
 */
export function OfertaPendienteCard({ oferta, onAceptar, onVerDetalles }: Props) {
  const segundos = useCountdown(oferta.expiraEnISO);
  const expirada = segundos === 0;

  return (
    <Card style={[styles.card, expirada && styles.expirada]}>
      <View style={styles.cabecera}>
        <Badge
          label={expirada ? "Oferta expirada" : "Esperando tu respuesta"}
          variant={expirada ? "lost" : "tint"}
        />
        {!expirada && <Countdown segundos={segundos} size={22} caption="para responder" />}
      </View>

      <Text style={heading(26, colors.accent900)}>{oferta.especialidad}</Text>

      <View style={styles.grilla}>
        <Dato icono="calendar-outline" etiqueta="Fecha" valor={fechaConDia(oferta.fechaHoraISO)} />
        <Dato icono="time-outline" etiqueta="Hora" valor={hora(oferta.fechaHoraISO)} />
        <Dato icono="person-outline" etiqueta="Especialista" valor={oferta.profesional} />
        <Dato icono="location-outline" etiqueta="Consultorio" valor={oferta.consultorio} />
      </View>

      <View style={styles.acciones}>
        <PrimaryButton label="Ver detalles" variant="secondary" onPress={onVerDetalles} style={styles.secundaria} />
        <PrimaryButton label="Aceptar cupo" onPress={onAceptar} disabled={expirada} style={styles.principal} />
      </View>
    </Card>
  );
}

function Dato({
  icono,
  etiqueta,
  valor,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  etiqueta: string;
  valor: string;
}) {
  return (
    <View style={styles.dato}>
      <View style={styles.datoIcono}>
        <Ionicons name={icono} size={15} color={colors.accent700} />
      </View>
      <View style={styles.flex}>
        <Text style={label(9)}>{etiqueta}</Text>
        <Text style={[body(14, colors.text), styles.datoValor]} numberOfLines={1}>
          {valor}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    gap: 14,
  },
  expirada: {
    opacity: 0.6,
  },
  cabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.fondo,
  },
  dato: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },
  datoIcono: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.superficie,
    alignItems: "center",
    justifyContent: "center",
  },
  datoValor: {
    fontFamily: fonts.bodyMedium,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  acciones: {
    flexDirection: "row",
    gap: 10,
  },
  secundaria: {
    flex: 1,
  },
  principal: {
    flex: 1.5,
  },
});
