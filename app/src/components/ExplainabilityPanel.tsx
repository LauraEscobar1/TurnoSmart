import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EstrategiaOferta, FactorPrioridad } from "@/types/domain";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { IconoMetal } from "@/components/Adornos";
import { body, label } from "@/theme/typography";
import { T, useT, useValorFactor } from "@/i18n";

interface ExplainabilityPanelProps {
  factores: FactorPrioridad[];
  title?: string;
  /**
   * Con "ai" el panel dice «Por qué la IA te recomienda este turno»; con el
   * respaldo determinista (o sin dato) no menciona la IA.
   */
  estrategia?: EstrategiaOferta;
  /** Fecha del cupo: para decir si coincide con el horario preferido. */
  fechaHoraISO?: string;
}

/** Colombia no tiene horario de verano: UTC-5 todo el año (igual que el servidor). */
function franjaDelCupo(fechaHoraISO: string): "Mañana" | "Tarde" {
  const h = (new Date(fechaHoraISO).getUTCHours() + 24 - 5) % 24;
  return h < 12 ? "Mañana" : "Tarde";
}

/**
 * Cada factor guardado por `priorizar-cupo` (etiqueta canónica en español +
 * dato real del paciente) contado en lenguaje cercano. Si llega un factor
 * desconocido, se muestra tal cual: «Etiqueta: valor».
 */
export function razonDeFactor(f: FactorPrioridad, t: T, valorFactor: (texto: string) => string, fechaHoraISO?: string) {
  const valor = valorFactor(f.valor);
  switch (f.etiqueta) {
    case "Tiempo en espera":
      return t("oferta.razones.tiempoEspera", { valor });
    case "Tu especialidad":
      return t("oferta.razones.especialidad", { valor });
    case "Horario preferido": {
      if (f.valor === "Indistinto") return t("oferta.razones.horarioIndistinto");
      if (fechaHoraISO && franjaDelCupo(fechaHoraISO) === f.valor) {
        return t(f.valor === "Mañana" ? "oferta.razones.horarioManana" : "oferta.razones.horarioTarde");
      }
      return t("oferta.razones.horarioOtro", { valor: valor.toLowerCase() });
    }
    case "Disponibilidad":
      return t("oferta.razones.disponibilidad");
    case "Distancia al consultorio":
      return t("oferta.razones.distancia", { valor });
    default:
      return `${valorFactor(f.etiqueta)}: ${valor}`;
  }
}

/**
 * Panel de explicabilidad. Máximo cuatro factores, ordenados por peso, cada
 * uno como una frase con el dato real y una barra de peso relativo. Nunca
 * muestra el score numérico: muestra la razón.
 */
export function ExplainabilityPanel({ factores, title, estrategia, fechaHoraISO }: ExplainabilityPanelProps) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const valorFactor = useValorFactor();
  const ia = estrategia === "ai";
  const top = [...factores].sort((a, b) => b.peso - a.peso).slice(0, 4);
  const titulo = title ?? t(ia ? "oferta.recomendacion.porQueIA" : "oferta.porQue");

  return (
    <View>
      <View style={styles.titleRow}>
        {ia && <IconoMetal ia tamano={15} />}
        <Text style={label(10, colors.accent700)} accessibilityRole="header">
          {titulo}
        </Text>
      </View>
      <View style={styles.list}>
        {top.map((f) => {
          const razon = razonDeFactor(f, t, valorFactor, fechaHoraISO);
          return (
            <View key={f.etiqueta} accessible accessibilityLabel={razon}>
              <View style={styles.row}>
                <Ionicons name="checkmark" size={14} color={colors.icono} style={styles.check} />
                <Text style={[body(13, colors.text), styles.razon]}>{razon}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(f.peso * 100)}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
      {ia && <Text style={[body(12, colors.neutral600), styles.nota]}>{t("oferta.recomendacion.notaIA")}</Text>}
    </View>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  check: {
    marginTop: 2,
  },
  // En teléfonos angostos la frase se ajusta en líneas.
  razon: {
    flex: 1,
    flexShrink: 1,
  },
  track: {
    height: 6,
    marginTop: 6,
    marginLeft: 22,
    borderRadius: 3,
    backgroundColor: colors.accent100,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  nota: {
    marginTop: 14,
  },
});
