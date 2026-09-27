import React, { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { body, fonts } from "@/theme/typography";
import { HojaInferior } from "@/components/HojaInferior";
import { Segmented } from "@/components/forms";
import { Ajustes, getAjustes, guardarAjustes, Idioma } from "@/services/ajustesService";

// Cada idioma se nombra en su propio idioma, para encontrarlo sin entender el otro.
const IDIOMAS: { value: Idioma; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

/**
 * Ajustes (menú ☰ de Inicio): modo oscuro e idioma, en una hoja que sube
 * desde abajo. Cada cambio se guarda al instante en el teléfono.
 */
export function MenuAjustes({ visible, onCerrar }: { visible: boolean; onCerrar: () => void }) {
  const [ajustes, setAjustes] = useState<Ajustes>({ modoOscuro: false, idioma: "es" });

  useEffect(() => {
    getAjustes().then(setAjustes);
  }, []);

  const cambiar = (cambios: Partial<Ajustes>) => {
    const nuevos = { ...ajustes, ...cambios };
    setAjustes(nuevos);
    guardarAjustes(nuevos);
  };

  return (
    <HojaInferior visible={visible} onCerrar={onCerrar} titulo="Ajustes">
      <View style={styles.grupo}>
        <View style={styles.fila}>
          <View style={styles.icono}>
            <Ionicons name={ajustes.modoOscuro ? "moon" : "moon-outline"} size={18} color={colors.accent700} />
          </View>
          <Text style={[body(15), styles.etiqueta]}>Modo oscuro</Text>
          <Switch
            value={ajustes.modoOscuro}
            onValueChange={(modoOscuro) => cambiar({ modoOscuro })}
            accessibilityLabel="Modo oscuro"
            trackColor={{ false: colors.neutral300, true: colors.accent }}
            thumbColor="#ffffff"
            ios_backgroundColor={colors.neutral300}
          />
        </View>

        <View style={[styles.fila, styles.filaIdioma, styles.divisor]}>
          <View style={styles.cabecera}>
            <View style={styles.icono}>
              <Ionicons name="language-outline" size={18} color={colors.accent700} />
            </View>
            <Text style={[body(15), styles.etiqueta]}>Idioma</Text>
          </View>
          <Segmented options={IDIOMAS} value={ajustes.idioma} onChange={(idioma) => cambiar({ idioma })} variante="pildora" />
        </View>
      </View>
    </HojaInferior>
  );
}

const styles = StyleSheet.create({
  grupo: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borde,
    paddingHorizontal: 16,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  filaIdioma: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divisor: {
    borderTopWidth: 1,
    borderTopColor: colors.borde,
  },
  icono: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent100,
    alignItems: "center",
    justifyContent: "center",
  },
  etiqueta: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
  },
});
