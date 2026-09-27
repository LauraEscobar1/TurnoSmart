import React from "react";
import { View } from "react-native";
import { DistanciaMaxima, FranjaHoraria } from "@/types/domain";
import { PreferenciasCupo } from "@/services/authService";
import { ESPECIALIDADES } from "@/data/mockData";
import { ChipSelect, Segmented } from "@/components/forms";
import { T, useDato, useT } from "@/i18n";

interface PreferenciasFormProps {
  value: PreferenciasCupo;
  onChange: (value: PreferenciasCupo) => void;
  errorEspecialidades?: string;
}

const FRANJAS: FranjaHoraria[] = ["Mañana", "Tarde", "Indistinto"];
const DISTANCIAS: DistanciaMaxima[] = [3, 10, null];

export function distanciaLabel(d: DistanciaMaxima, t: T) {
  return d === null ? t("preferencias.sinLimite") : `${d} km`;
}

/** Preferencias de cupo: el mismo formulario en el registro (paso 2) y en Perfil. */
export function PreferenciasForm({ value, onChange, errorEspecialidades }: PreferenciasFormProps) {
  const t = useT();
  const dato = useDato();
  const set = <K extends keyof PreferenciasCupo>(k: K, v: PreferenciasCupo[K]) => onChange({ ...value, [k]: v });
  // Si el paciente tiene una especialidad fuera del listado, se sigue mostrando.
  const opciones = [...ESPECIALIDADES, ...value.especialidadesInteres.filter((e) => !ESPECIALIDADES.includes(e))];

  return (
    <View style={{ gap: 14 }}>
      <ChipSelect
        label={t("preferencias.especialidades")}
        options={opciones}
        etiqueta={(e) => dato("especialidades", e)}
        value={value.especialidadesInteres}
        onChange={(v) => set("especialidadesInteres", v)}
        error={errorEspecialidades}
      />
      <Segmented
        label={t("preferencias.franja")}
        options={FRANJAS.map((f) => ({ value: f, label: dato("franjas", f) }))}
        value={value.franjaPreferida}
        onChange={(v) => set("franjaPreferida", v)}
      />
      <Segmented
        label={t("preferencias.distancia")}
        options={DISTANCIAS.map((d) => ({ value: d, label: distanciaLabel(d, t) }))}
        value={value.distanciaMaxKm}
        onChange={(v) => set("distanciaMaxKm", v)}
      />
    </View>
  );
}
