import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { RootStackParamList } from "@/navigation/types";
import { PrimaryButton } from "@/components/PrimaryButton";

type Props = NativeStackScreenProps<RootStackParamList, "OfferConfirmation">;

/**
 * Confirmación — Nivel 4 (estado terminal).
 * Tras aceptar, navega automáticamente a "Mis citas" (docs/03-navegacion.md §2.4).
 * Tras rechazar, vuelve a Home.
 */
export function OfferConfirmationScreen({ route, navigation }: Props) {
  const { resultado } = route.params;
  const esAceptada = resultado === "aceptada";

  useEffect(() => {
    if (esAceptada) {
      const timeout = setTimeout(() => {
        navigation.replace("Tabs");
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [esAceptada, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{esAceptada ? "✅" : "👍"}</Text>
      <Text style={styles.title}>
        {esAceptada ? "¡Cita confirmada!" : "Cupo rechazado"}
      </Text>
      <Text style={styles.description}>
        {esAceptada
          ? "Te esperamos. Puedes verla en Mis citas."
          : "Gracias por avisarnos. Se lo ofreceremos a otro paciente."}
      </Text>
      {!esAceptada && (
        <View style={styles.action}>
          <PrimaryButton label="Volver al inicio" onPress={() => navigation.replace("Tabs")} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
  action: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
  },
});
