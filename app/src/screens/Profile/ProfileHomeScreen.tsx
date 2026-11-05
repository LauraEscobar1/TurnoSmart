import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Paleta } from "@/theme/colors";
import { useEstilos, useTema } from "@/theme/Tema";
import { IconoCirculo } from "@/components/Adornos";
import { Presionable } from "@/components/Presionable";
import { Pantalla } from "@/components/Vidrio";
import { radius } from "@/theme/spacing";
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
 * cámara para subirla) sobre el banner de la cabecera, el aviso de perfil incompleto
 * (solo mientras falten datos opcionales), el estado de la lista de espera
 * y tres indicadores. Todo sale de los datos del paciente.
 */
/** Avatar de la cabecera y la mitad de su alto con el anillo: lo que asoma bajo el banner. */
const TAMANO_AVATAR = 132;
const MITAD_AVATAR = (TAMANO_AVATAR + 2 * Math.max(3, Math.round(TAMANO_AVATAR * 0.035))) / 2;

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
        {/* Cabecera: banner sólido de ancho completo y, montado sobre su borde inferior, el avatar. */}
        <View style={styles.hero}>
          <View pointerEvents="none" style={styles.banner} />

          <View style={styles.barra}>
            {/* Mismo ancho que el lápiz, para que el nombre quede centrado. Las preferencias
                se editan solo desde «Editar preferencias», en la card de la lista de espera. */}
            <View style={styles.redondoVacio} />
            <View style={styles.identidad}>
              <Text style={[heading(30, colors.textoBannerPerfil), styles.centrado]} numberOfLines={1}>
                {paciente.nombre} {paciente.apellido}
              </Text>
              <Text style={[body(14, colors.textoBannerPerfil), styles.centrado]} numberOfLines={1}>
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
            <AvatarPaciente paciente={paciente} size={TAMANO_AVATAR} onPress={cambiarFoto} anillo />
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
                <IconoCirculo nombre="hourglass-outline" tamano={64} tamanoIcono={30} />
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
            <Presionable
              onPress={alternarNotificaciones}
              accessibilityRole="button"
              accessibilityLabel={`${t("notificaciones.titulo")}: ${t(paciente.notificacionesActivas ? "perfil.activadas" : "perfil.desactivadas")}`}
              style={({ pressed }) => [styles.fila, pressed && styles.presionado]}
            >
              <IconoCirculo nombre="notifications-outline" tamano={34} tamanoIcono={18} />
              <Text style={[body(15, colors.text), styles.flex]}>{t("notificaciones.titulo")}</Text>
              <Text style={body(14, colors.neutral600)}>
                {pidiendo ? "…" : t(paciente.notificacionesActivas ? "perfil.activadas" : "perfil.desactivadas")}
              </Text>
            </Presionable>
            <Presionable
              onPress={cerrarSesion}
              accessibilityRole="button"
              style={({ pressed }) => [styles.fila, styles.divisor, pressed && styles.presionado]}
            >
              <IconoCirculo nombre="log-out-outline" tamano={34} tamanoIcono={18} />
              <Text style={[body(15, colors.accent700), styles.flex]}>{t("perfil.cerrarSesion")}</Text>
            </Presionable>
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
    <Presionable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [styles.redondo, pressed && styles.presionado]}
    >
      <Ionicons name={icono} size={22} color={colors.textoBannerPerfil} />
    </Presionable>
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
      <IconoCirculo nombre={icono} tamano={36} tamanoIcono={18} />
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
  // El degradado de la pantalla queda visible detrás del scroll (también en el rebote).
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
  // Banner rectangular sólido: ancho completo, esquinas inferiores redondeadas y sombra suave.
  // Termina a media altura del avatar, que queda montado sobre su borde.
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: MITAD_AVATAR,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: colors.bannerPerfil,
    shadowColor: colors.sombraCard,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
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
  // Sobre el banner: un círculo del mismo tono, apenas aclarado u oscurecido, con el ícono del banner.
  redondo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.botonBannerPerfil,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: colors.fondoChip,
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
    borderRadius: 32,
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
