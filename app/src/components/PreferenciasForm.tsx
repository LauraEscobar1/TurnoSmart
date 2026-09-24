import React from "react";
import { View } from "react-native";
import { DistanciaMaxima, FranjaHoraria } from "@/types/domain";
import { PreferenciasCupo } from "@/services/authService";
import { ESPECIALIDADES } from "@/data/mockData";
import { ChipSelect, Segmented, TextField } from "@/components/forms";

interface PreferenciasFormProps {
  value: PreferenciasCupo;
  onChange: (value: PreferenciasCupo) => void;
  errorEspecialidades?: string;
}

const FRANJAS: { value: FranjaHoraria; label: string }[] = [
  { value: "Mañana", label: "Mañana" },
  { value: "Tarde", label: "Tarde" },
  { value: "Indistinto", label: "Indistinto" },
];

const DISTANCIAS: { value: DistanciaMaxima; label: string }[] = [
  { value: 3, label: "3 km" },
  { value: 10, label: "10 km" },
  { value: null, label: "Sin límite" },
];

export function distanciaLabel(d: DistanciaMaxima) {
  return d === null ? "Sin límite" : `${d} km`;
}

/** Preferencias de cupo: el mismo formulario en el registro (paso 2) y en Perfil. */
export function PreferenciasForm({ value, onChange, errorEspecialidades }: PreferenciasFormProps) {
  const set = <K extends keyof PreferenciasCupo>(k: K, v: PreferenciasCupo[K]) => onChange({ ...value, [k]: v });
  // Si el paciente tiene una especialidad fuera del listado, se sigue mostrando.
  const opciones = [...ESPECIALIDADES, ...value.especialidadesInteres.filter((e) => !ESPECIALIDADES.includes(e))];

  return (
    <View style={{ gap: 14 }}>
      <ChipSelect
        label="Especialidades en espera"
        options={opciones}
        value={value.especialidadesInteres}
        onChange={(v) => set("especialidadesInteres", v)}
        error={errorEspecialidades}
      />
      <Segmented
        label="Franja horaria preferida"
        options={FRANJAS}
        value={value.franjaPreferida}
        onChange={(v) => set("franjaPreferida", v)}
      />
      <Segmented
        label="Distancia máxima al consultorio"
        options={DISTANCIAS}
        value={value.distanciaMaxKm}
        onChange={(v) => set("distanciaMaxKm", v)}
      />
      <TextField
        label="Obra social / prepaga"
        placeholder="Ej.: OSDE 310"
        value={value.obraSocial}
        onChangeText={(v) => set("obraSocial", v)}
      />
    </View>
  );
}
