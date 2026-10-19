import { fireEvent, screen } from "@testing-library/react-native";
import * as auth from "@/services/authService";
import { montarApp, reiniciarDatos } from "@/test-utils/app";
import { cedulasRechazadas, getSupabase, pacientesCreados, tablaFalsa } from "@/test-utils/supabaseFalso";

/**
 * Cédula en el registro: la base exige `pacientes_cedula_check`
 * (`^[0-9]{6,10}$`) y el trigger `crear_paciente_desde_auth` arma el paciente
 * con los metadatos de signUp. La app debe mandar siempre una cédula que lo
 * cumpla, con los nombres de metadatos que espera el trigger.
 */

/** La misma regla que el CHECK de la base y la normalización del trigger (`\D` → ""). */
const cumpleCheckDeLaBase = (enviada: string) => /^[0-9]{6,10}$/.test(enviada.replace(/\D/g, ""));

const VALIDAS = ["1020304050", "1.020.304.050", "102 030 4050", "123456", "12.345.678", " 1085123456 "];
const INVALIDAS = [
  "", // vacía
  "12345", // corta
  "10203040501", // larga
  "12a456", // letras
  "1-020-304-050", // guiones
  "+57 1020304050", // prefijo
  "１０２０３０４０５０", // dígitos de ancho completo (algunos teclados)
  "......", // sin dígitos
];

const datos = (cedula: string): auth.DatosCuenta => ({
  nombre: " Ana ",
  apellido: " Prueba ",
  cedula,
  email: "Ana.Prueba@Correo.com",
  telefono: "+57 300 123 4567",
  password: "segura123",
});

const preferencias: auth.PreferenciasCupo = {
  especialidadesInteres: ["Medicina general", "Nutrición"],
  franjaPreferida: "Tarde",
  distanciaMaxKm: 3,
};

async function crear(cedula: string) {
  const d = datos(cedula);
  const codigo = await auth.enviarCodigo(d.telefono);
  return auth.crearCuenta(d, preferencias, { codigo, notificacionesActivas: true });
}

beforeEach(async () => {
  await reiniciarDatos();
  jest.restoreAllMocks();
});

describe("Validación de cédula", () => {
  it.each(VALIDAS)("acepta %p y lo que se envía cumple el CHECK de la base", (cedula) => {
    expect(auth.cedulaValida(cedula)).toBe(true);
    expect(auth.validarDatosCuenta(datos(cedula)).cedula).toBeUndefined();
    const enviada = auth.normalizarCedula(cedula);
    expect(enviada).toMatch(auth.FORMATO_CEDULA_BASE);
    expect(cumpleCheckDeLaBase(enviada)).toBe(true);
  });

  it.each(INVALIDAS)("rechaza %p en el paso 1", (cedula) => {
    expect(auth.cedulaValida(cedula)).toBe(false);
    expect(auth.validarDatosCuenta(datos(cedula)).cedula).toBe("La cédula tiene entre 6 y 10 números.");
  });

  it("la regla de la app coincide con el CHECK para todas las entradas probadas", () => {
    // Si la app acepta una cédula, la base también la acepta (nunca al revés).
    for (const cedula of [...VALIDAS, ...INVALIDAS]) {
      if (auth.cedulaValida(cedula)) expect(cumpleCheckDeLaBase(auth.normalizarCedula(cedula))).toBe(true);
    }
  });
});

describe("crearCuenta → signUp → trigger", () => {
  it("envía los metadatos con los nombres que espera el trigger y crea el paciente", async () => {
    const signUp = jest.spyOn(getSupabase().auth, "signUp");
    await crear("1.085.123.456");

    expect(signUp).toHaveBeenCalledTimes(1);
    const [{ email, options }] = signUp.mock.calls[0] as [{ email: string; options: { data: Record<string, unknown> } }];
    expect(email).toBe("ana.prueba@correo.com");
    expect(options.data).toMatchObject({
      nombre: "Ana",
      apellido: "Prueba",
      cedula: "1085123456",
      telefono: "+57 300 123 4567",
      franjaPreferida: "Tarde",
      distanciaMaxKm: 3,
      especialidadesInteres: ["Medicina general", "Nutrición"],
      notificacionesActivas: true,
    });
    expect(options.data).not.toHaveProperty("password");

    const [fila] = pacientesCreados.filter((p) => p.email === "ana.prueba@correo.com");
    expect(fila).toMatchObject({
      nombre: "Ana",
      apellido: "Prueba",
      cedula: "1085123456",
      franja_preferida: "Tarde",
      distancia_max_km: 3,
      notificaciones_activas: true,
    });
    expect(tablaFalsa("solicitudes_espera").filter((s) => s.paciente_id === fila.id)).toHaveLength(2);
    expect(cedulasRechazadas).toEqual([]);
  });

  it.each(INVALIDAS)("con la cédula %p no llama a signUp (la base nunca la recibe)", async (cedula) => {
    // Un borrador incompleto o desactualizado que no pasó por el paso 1.
    const signUp = jest.spyOn(getSupabase().auth, "signUp");
    await expect(crear(cedula)).rejects.toMatchObject({ campo: "cedula", message: "La cédula tiene entre 6 y 10 números." });
    expect(signUp).not.toHaveBeenCalled();
    expect(cedulasRechazadas).toEqual([]);
    expect(pacientesCreados.filter((p) => p.email === "ana.prueba@correo.com")).toHaveLength(0);
  });

  it("sin cédula en los metadatos la base rechaza el usuario (p. ej. «Add user» del panel)", async () => {
    // Así falla cualquier alta fuera de la app que no envíe los metadatos del registro.
    const { data, error } = await getSupabase().auth.signUp({ email: "sin.datos@correo.com", password: "segura123" });
    expect(error?.message).toBe("Database error saving new user");
    expect(data.user).toBeNull();
    expect(cedulasRechazadas).toEqual([""]);
  });
});

describe("Registro en pantalla", () => {
  it("una cédula corta no deja avanzar del paso 1 ni llama a Supabase", async () => {
    const signUp = jest.spyOn(getSupabase().auth, "signUp");
    await montarApp({ sesion: false });
    await fireEvent.press(await screen.findByRole("button", { name: "Empezar" }));
    await screen.findByText("Tus datos");

    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana");
    await fireEvent.changeText(screen.getByLabelText("Apellido"), "Prueba");
    await fireEvent.changeText(screen.getByLabelText("Cédula"), "12345");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "ana@correo.com");
    await fireEvent.changeText(screen.getByLabelText("Teléfono"), "+57 300 123 4567");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "segura123");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "segura123");
    await fireEvent.press(screen.getByText("Continuar"));

    expect(await screen.findByText("La cédula tiene entre 6 y 10 números.")).toBeTruthy();
    expect(screen.getByText("Tus datos")).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();
  });
});
