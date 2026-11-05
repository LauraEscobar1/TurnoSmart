import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { Pantalla } from "@/components/Vidrio";
import { radius, sombra } from "@/theme/spacing";
import { body, fonts, heading } from "@/theme/typography";
import { ProfileStackParamList } from "@/navigation/types";
import { useAuth, usePaciente } from "@/auth/AuthContext";
import { abrirAjustes, pedirPermisoNotificaciones } from "@/services/permisosService";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card } from "@/components/Card";
import { AvatarPaciente } from "@/components/AvatarPaciente";
import { elegirFotoPerfil } from "@/services/fotoService";
import { diasEnEspera } from "@/utils/format";
import { Idioma, useDato, useT } from "@/i18n";
import { useAjustes } from "@/ajustes/AjustesContext";
import { perfilCompleto } from "@/utils/perfil";

type Nav = NativeStackNavigationProp<ProfileStackParamList>;

/** «Cardiología», «Cardiología o Dermatología», «Cardiología, Nutrición o Dermatología». */
function listaO(items: string[], idioma: Idioma) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${idioma === "en" ? "or" : "o"} ${items[items.length - 1]}`;
}

/**
 * Perfil — Nivel 1 ("NavDeslizable.dc.html", sección 5 / 5).
 * Una ficha amable del paciente: el nombre centrado con accesos redondos a
 * Preferencias y Datos personales, su círculo (foto o iniciales, con la
 * cámara para subirla) sobre el arco celeste, el aviso de perfil incompleto
 * (solo mientras falten datos opcionales), el estado de la lista de espera
 * y tres indicadores. Todo sale de los datos del paciente.
 */
export function ProfileHomeScreen() {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  const t = useT();
  const dato = useDato();
  const { idioma } = useAjustes();
  const navigation = useNavigation<Nav>();
  const paciente = usePaciente();
  const { actualizar, cerrarSesion } = useAuth();
  const [pidiendo, setPidiendo] = useState(false);
  const { width } = useWindowDimensions();

  const completo = perfilCompleto(paciente);
  const dias = diasEnEspera(paciente.registradoEnISO);
  const especialidades = paciente.especialidadesInteres;
  const personasAntes = Math.max(0, paciente.puestoEspera - 1);
  const irAPreferencias = () => navigation.navigate("Preferences");

  async function cambiarFoto() {
    const uri = await elegirFotoPerfil();
    if (uri) await actualizar({ fotoUri: uri });
  }

  async function alternarNotificaciones() {
    if (paciente.notificacionesActivas) {
      await actualizar({ notificacionesActivas: false });
      return;
    }
    setPidiendo(true);
    const ok = await pedirPermisoNotificaciones();
    setPidiendo(false);
    if (ok) await actualizar({ notificacionesActivas: true });
    else await abrirAjustes();
  }

  return (
    <Pantalla edges={["top"]} style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Encabezado sobre el arco celeste */}
        <View style={styles.hero}>
          <View
            pointerEvents="none"
            style={[styles.arco, { width: width * 3, height: width * 3, borderRadius: width * 1.5, left: -width }]}
          />

          <View style={styles.barra}>
            {/* Mismo ancho que el lápiz, para que el nombre quede centrado. Las preferencias
                se editan solo desde «Editar preferencias», en la card de la lista de espera. */}
            <View style={styles.redondoVacio} />
            <View style={styles.identidad}>
              <Text style={[heading(30, colors.textoSobreFondo), styles.centrado]} numberOfLines={1}>
                {paciente.nombre} {paciente.apellido}
              </Text>
              <Text style={[body(14, colors.textoTenueSobreFondo), styles.centrado]} numberOfLines={1}>
                {paciente.email}
              </Text>
            </View>
            <BotonRedondo
              icono="create-outline"
              etiqueta={t("datos.titulo")}
              onPress={() => navigation.navigate("PersonalData")}
            />
          </View>

          <View style={styles.personaje}>
            <AvatarPaciente paciente={paciente} size={132} onPress={cambiarFoto} />
          </View>
        </View>

        <View style={styles.cuerpo}>
          {/* Perfil por completar: desaparece cuando ya no falta nada */}
          {completo < 100 ? (
            <Card
              onPress={() => navigation.navigate("PersonalData")}
              accessibilityRole="button"
              accessibilityLabel={t("perfil.completarA11y", { porcentaje: completo })}
              style={styles.tarjeta}
            >
              <Text style={body(14, colors.neutral700)}>{t("perfil.completar")}</Text>
              <View style={styles.separador} />
              <View style={styles.progresoFila}>
                <Ionicons name="person-circle-outline" size={22} color={colors.icono} />
                <Text style={styles.progresoEtiqueta}>{t("nav.perfil")}</Text>
                <View style={styles.pista}>
                  <View style={[styles.relleno, { width: `${completo}%` }]} />
                </View>
                <Text style={heading(18, colors.accent700)}>{completo}%</Text>
              </View>
            </Card>
          ) : null}

          {/* Lista de espera */}
          <Card tono="acento" style={styles.espera}>
            <View style={styles.esperaFila}>
              <View style={styles.reloj}>
                <Ionicons name="hourglass-outline" size={30} color={colors.icono} />
              </View>
              <View style={styles.flex}>
                <Text style={heading(21, colors.accent900)}>{t("perfil.esperando")}</Text>
                <Text style={body(13, colors.neutral700)}>
                  {especialidades.length
                    ? t("perfil.esperandoTexto", {
                        count: personasAntes,
                        especialidades: listaO(
                          especialidades.map((e) => dato("especialidades", e)),
                          idioma
                        ),
                      })
                    : t("perfil.sinEspecialidades")}
                </Text>
              </View>
            </View>
            <PrimaryButton label={t("perfil.editarPreferencias")} onPress={irAPreferencias} />
          </Card>

          {/* Indicadores */}
          <Indicador
            icono="calendar-outline"
            valor={t("comun.nDias", { count: dias })}
            etiqueta={t("perfil.enListaEspera")}
          />
          <View style={styles.par}>
            <Indicador
              icono="medkit-outline"
              valor={String(especialidades.length)}
              etiqueta={t("preferencias.especialidades")}
            />
            <Indicador
              icono="time-outline"
              valor={dato("franjas", paciente.franjaPreferida)}
              etiqueta={t("perfil.franjaPreferida")}
            />
          </View>

          {/* Cuenta */}
          <Card style={styles.cuenta}>
            <Pressable
              onPress={alternarNotificaciones}
              accessibilityRole="button"
              accessibilityLabel={`${t("notificaciones.titulo")}: ${t(paciente.notificacionesActivas ? "perfil.activadas" : "perfil.desactivadas")}`}
              style={({ pressed }) => [styles.fila, pressed && styles.presionado]}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.icono} />
              <Text style={[body(15, colors.text), styles.flex]}>{t("notificaciones.titulo")}</Text>
              <Text style={body(14, colors.neutral600)}>
                {pidiendo ? "…" : t(paciente.notificacionesActivas ? "perfil.activadas" : "perfil.desactivadas")}
              </Text>
            </Pressable>
            <Pressable
              onPress={cerrarSesion}
              accessibilityRole="button"
              style={({ pressed }) => [styles.fila, styles.divisor, pressed && styles.presionado]}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.icono} />
              <Text style={[body(15, colors.accent700), styles.flex]}>{t("perfil.cerrarSesion")}</Text>
            </Pressable>
          </Card>
        </View>
      </ScrollView>
    </Pantalla>
  );
}

function BotonRedondo({
  icono,
  etiqueta,
  onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  etiqueta: string;
  onPress: () => void;
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [styles.redondo, pressed && styles.presionado]}
    >
      <Ionicons name={icono} size={22} color={colors.icono} />
    </Pressable>
  );
}

function Indicador({
  icono,
  valor,
  etiqueta,
  onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  valor: string;
  etiqueta: string;
  onPress?: () => void;
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearStyles);
  return (
    <Card
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${etiqueta}: ${valor}`}
      style={styles.indicador}
    >
      <Ionicons name={icono} size={20} color={colors.icono} style={styles.indicadorIcono} />
      <View style={styles.flex}>
        <Text style={heading(22, colors.accent900)}>{valor}</Text>
        <Text style={body(13, colors.neutral600)}>{etiqueta}</Text>
      </View>
    </Card>
  );
}

const crearStyles = (colors: Paleta) =>
  StyleSheet.create({
  safe: {
    flex: 1,
  },
  // El degradado de la pantalla queda visible detrás del scroll; el arco es un halo tenue.
  scroll: {
    backgroundColor: "transparent",
  },
  content: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  centrado: {
    textAlign: "center",
  },
  presionado: {
    opacity: 0.7,
  },
  // Encabezado
  hero: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  // El borde del arco cruza el tercio inferior del círculo, como el personaje
  // de la referencia sobre la curva.
  arco: {
    position: "absolute",
    bottom: 44,
    backgroundColor: colors.arcoPerfil,
  },
  barra: {
    flexDirection: "row",
    alignItems: "flex-start",
    alignSelf: "stretch",
    gap: 10,
  },
  identidad: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingTop: 12,
    gap: 2,
  },
  redondo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.superficie,
    alignItems: "center",
    justifyContent: "center",
    ...sombra.sm,
  },
  redondoVacio: {
    width: 46,
    height: 46,
  },
  personaje: {
    marginTop: 26,
  },
  // Cuerpo
  cuerpo: {
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 14,
  },
  tarjeta: {
    padding: 18,
  },
  separador: {
    height: 1,
    backgroundColor: colors.borde,
    marginVertical: 14,
  },
  progresoFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progresoEtiqueta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.accent700,
  },
  pista: {
    flex: 1,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral200,
    overflow: "hidden",
  },
  relleno: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  espera: {
    marginTop: 6,
    padding: 18,
    gap: 18,
  },
  esperaFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  reloj: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.accent200,
    backgroundColor: colors.superficie,
    alignItems: "center",
    justifyContent: "center",
  },
  par: {
    flexDirection: "row",
    gap: 12,
  },
  indicador: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  indicadorIcono: {
    marginTop: 3,
  },
  cuenta: {
    marginTop: 6,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  divisor: {
    borderTopWidth: 1,
    borderTopColor: colors.borde,
  },
});
