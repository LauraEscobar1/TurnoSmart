import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";

interface FormScreenProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  /** Acciones que quedan abajo del contenido (margin-top: auto en el mockup). */
  footer: React.ReactNode;
  contentStyle?: ViewStyle;
}

/**
 * Molde de las pantallas de acceso: el contenido desplaza por encima del
 * teclado y las acciones quedan al pie cuando sobra espacio.
 */
export function FormScreen({ header, children, footer, contentStyle }: FormScreenProps) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
          <View style={styles.footer}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingVertical: 18,
    paddingHorizontal: 22,
    gap: 14,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 8,
    gap: 10,
  },
});
