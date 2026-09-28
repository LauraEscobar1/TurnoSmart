import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import { fireEvent, screen } from "@testing-library/react-native";
import * as auth from "@/services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CUENTA_DEMO, pacienteDemo } from "@/data/mockData";
import { irALogin, montarApp, reiniciarDatos } from "@/test-utils/app";
import {
  confirmarCorreoFalso,
  getSupabase,
  pacientesCreados,
  pedirConfirmacionDeCorreo,
  insertsIntentados,
  simularPacientesCaido,
} from "@/test-utils/supabaseFalso";

beforeEach(async () => {
  await reiniciarDatos();
  jest.clearAllMocks();
});

const datosValidos: auth.DatosCuenta = {
  nombre: "Laura",
  apellido: "Escobar",
  cedula: "1.020.304.050",
  email: "Laura@Correo.com ",
  telefono: "+54 11 4444 1234",
  password: "segura123",
};

const preferencias: auth.PreferenciasCupo = {
  especialidadesInteres: ["Cardiología"],
  franjaPreferida: "Mañana",
  distanciaMaxKm: null,
};

describe("authService", () => {
  it("inicia sesión con la cuenta demo y rechaza credenciales inválidas", async () => {
    const p = await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    expect(p.nombre).toBe("Martín");
    expect((await auth.getSesion())?.email).toBe(CUENTA_DEMO.email);

    await expect(auth.iniciarSesion(CUENTA_DEMO.email, "otra")).rejects.toMatchObject({ campo: "password" });
    await expect(auth.iniciarSesion("", "x")).rejects.toMatchObject({ campo: "email" });
  });

  it("cerrar sesión borra la sesión de Supabase pero recuerda el usuario; Face ID solo retoma una sesión guardada", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    // Con la sesión de Supabase guardada, Face ID la retoma.
    expect((await auth.iniciarSesionBiometrica()).email).toBe(CUENTA_DEMO.email);
    await auth.cerrarSesion();
    expect(await auth.getSesion()).toBeNull();
    expect(await auth.getUltimoUsuario()).toBe(CUENTA_DEMO.email);
    // Sin sesión no hay forma de reingresar sin contraseña: la app no la guarda.
    await expect(auth.iniciarSesionBiometrica()).rejects.toMatchObject({
      message: "Ingresá una vez con tu correo para activar Face ID.",
    });
    const guardado = JSON.stringify(await AsyncStorage.multiGet(await AsyncStorage.getAllKeys()));
    expect(guardado).not.toContain(CUENTA_DEMO.password);
  });

  it("valida los datos del paso 1", () => {
    expect(auth.validarDatosCuenta(datosValidos)).toEqual({});
    const e = auth.validarDatosCuenta({ nombre: " ", apellido: "", cedula: "12a", email: "x@", telefono: "123", password: "corta" });
    expect(Object.keys(e).sort()).toEqual(["apellido", "cedula", "email", "nombre", "password", "telefono"]);
    expect(auth.validarDatosCuenta({ ...datosValidos, password: "sinnumeros" }).password).toBe("Mínimo 8 caracteres, un número.");
  });

  it("no permite repetir correo ni cédula", async () => {
    // Correo: lo rechaza Supabase Auth al crear la cuenta.
    let codigo = await auth.enviarCodigo(datosValidos.telefono);
    await expect(
      auth.crearCuenta({ ...datosValidos, email: CUENTA_DEMO.email }, preferencias, { codigo, notificacionesActivas: true })
    ).rejects.toMatchObject({ campo: "email", message: "Ya existe una cuenta con este correo." });

    // Cédula: la rechaza la restricción única de `pacientes` dentro del trigger,
    // y Supabase responde con un error genérico de base de datos.
    codigo = await auth.enviarCodigo(datosValidos.telefono);
    await auth.crearCuenta(datosValidos, preferencias, { codigo, notificacionesActivas: true });
    await auth.cerrarSesion();
    codigo = await auth.enviarCodigo(datosValidos.telefono);
    await expect(
      auth.crearCuenta({ ...datosValidos, email: "otra@correo.com" }, preferencias, { codigo, notificacionesActivas: true })
    ).rejects.toMatchObject({ campo: "cedula", message: "Ya existe una cuenta con esta cédula." });
    // El registro rechazado no deja un usuario de Auth sin paciente.
    await expect(auth.iniciarSesion("otra@correo.com", datosValidos.password)).rejects.toMatchObject({ campo: "password" });
    expect(pacientesCreados.filter((p) => p.cedula === "1020304050")).toHaveLength(1);
  });

  it("migra las cuentas guardadas con DNI y obra social a cédula y EPS", async () => {
    const vieja = { ...pacienteDemo, cedula: undefined, eps: undefined, dni: "35482910", obraSocial: " Sanitas " };
    await AsyncStorage.setItem("ts.cuentas", JSON.stringify([{ paciente: vieja, password: "x1234567" }]));
    await AsyncStorage.setItem("ts.sesion", pacienteDemo.email);
    // Al abrir la app se borran las cuentas locales con contraseña…
    expect(await auth.getSesion()).toBeNull();
    expect(await AsyncStorage.getItem("ts.cuentas")).toBeNull();
    expect(JSON.stringify(await AsyncStorage.multiGet(await AsyncStorage.getAllKeys()))).not.toContain("x1234567");
    // …y el perfil se rescata en el primer ingreso con Supabase. (Sin la fila
    // de `pacientes` disponible: con ella, la base gana en cédula y EPS.)
    simularPacientesCaido(true);
    const aviso = jest.spyOn(console, "warn").mockImplementation(() => {});
    const p = await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    aviso.mockRestore();
    expect(p).toMatchObject({ cedula: "35482910", eps: "Sanitas" });
    expect(p).not.toHaveProperty("dni");
    expect(p).not.toHaveProperty("obraSocial");
  });

  it("crea la cuenta solo con el código correcto y deja la sesión abierta", async () => {
    const codigo = await auth.enviarCodigo(datosValidos.telefono);
    expect(codigo).toMatch(/^\d{6}$/);

    const incorrecto = codigo === "000000" ? "111111" : "000000";
    await expect(
      auth.crearCuenta(datosValidos, preferencias, { codigo: incorrecto, notificacionesActivas: true })
    ).rejects.toMatchObject({ campo: "codigo" });

    const p = await auth.crearCuenta(datosValidos, preferencias, { codigo, notificacionesActivas: true });
    expect(p).toMatchObject({
      nombre: "Laura",
      email: "laura@correo.com",
      cedula: "1020304050",
      franjaPreferida: "Mañana",
      distanciaMaxKm: null,
    });
    expect((await auth.getSesion())?.email).toBe("laura@correo.com");
    // La fila de `pacientes` la crea el trigger, con el mismo id que el usuario
    // de Supabase Auth; la app no inserta nada por su cuenta.
    expect(pacientesCreados.find((f) => f.id === p.id)).toMatchObject({
      cedula: "1020304050",
      email: "laura@correo.com",
      franja_preferida: "Mañana",
      distancia_max_km: null,
      notificaciones_activas: true,
    });
    expect(insertsIntentados).toEqual([]);
    expect(JSON.stringify(pacientesCreados)).not.toContain(datosValidos.password);
    // Y puede volver a entrar con su contraseña.
    await auth.cerrarSesion();
    await expect(auth.iniciarSesion("laura@correo.com", "segura123")).resolves.toMatchObject({ nombre: "Laura" });
  });

  it("con confirmación de correo: la cuenta queda creada sin sesión y entra después de confirmar", async () => {
    pedirConfirmacionDeCorreo(true);
    const codigo = await auth.enviarCodigo(datosValidos.telefono);
    const intento = auth.crearCuenta(datosValidos, preferencias, { codigo, notificacionesActivas: false });

    // No es un fallo: avisa que falta confirmar el correo, con el mensaje de siempre.
    await expect(intento).rejects.toBeInstanceOf(auth.ConfirmacionCorreoPendiente);
    await expect(intento).rejects.toMatchObject({
      cuentaCreada: true,
      message: "Te enviamos un correo para confirmar tu cuenta. Confirmalo y después iniciá sesión.",
    });
    expect(await auth.getSesion()).toBeNull();

    // El paciente ya existe (trigger) y la app no intentó crearlo desde el cliente.
    expect(pacientesCreados.filter((f) => f.email === "laura@correo.com")).toHaveLength(1);
    expect(insertsIntentados).toEqual([]);

    // Antes de confirmar no puede ingresar; después, sí, con sus datos del registro.
    await expect(auth.iniciarSesion("laura@correo.com", "segura123")).rejects.toMatchObject({
      campo: "email",
      message: "Confirmá tu correo antes de iniciar sesión.",
    });
    confirmarCorreoFalso("laura@correo.com");
    await expect(auth.iniciarSesion("laura@correo.com", "segura123")).resolves.toMatchObject({
      nombre: "Laura",
      cedula: "1020304050",
      notificacionesActivas: false,
    });
  });

  it("con confirmación de correo, un correo ya registrado se informa como tal", async () => {
    pedirConfirmacionDeCorreo(true);
    const codigo = await auth.enviarCodigo(datosValidos.telefono);
    await expect(
      auth.crearCuenta({ ...datosValidos, email: CUENTA_DEMO.email }, preferencias, { codigo, notificacionesActivas: true })
    ).rejects.toMatchObject({ campo: "email", message: "Ya existe una cuenta con este correo." });
  });
});

describe("Acceso en pantalla", () => {
  it("sin sesión muestra el inicio de sesión; con credenciales válidas entra a Home", async () => {
    await montarApp({ sesion: false });
    expect(await screen.findByRole("button", { name: "Empezar" })).toBeTruthy();
    await irALogin();

    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), CUENTA_DEMO.email);
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "mala");
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(await screen.findByText("El correo o la contraseña no coinciden.")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Contraseña"), CUENTA_DEMO.password);
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
  });

  it("Face ID: pide ingresar una vez con correo si no hay usuario recordado", async () => {
    await montarApp({ sesion: false });
    await irALogin();
    await fireEvent.press(await screen.findByText("Ingresar con Face ID"));
    expect(await screen.findByText("Ingresá una vez con tu correo para activar Face ID.")).toBeTruthy();
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
  });

  it("Face ID: con usuario recordado pero sin sesión guardada, pide ingresar con correo", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    await auth.cerrarSesion();
    await montarApp({ sesion: false });
    await irALogin();

    await fireEvent.press(await screen.findByText("Ingresar con Face ID"));
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Ingresá una vez con tu correo para activar Face ID.")).toBeTruthy();
    expect(screen.queryByText("Martín Ávila")).toBeNull();
  });

  it("Face ID cancelado no inicia sesión", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    await auth.cerrarSesion();
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValueOnce({ success: false, error: "user_cancel" });
    await montarApp({ sesion: false });
    await irALogin();

    await fireEvent.press(await screen.findByText("Ingresar con Face ID"));
    expect(screen.getByText("Ingresá a tu cuenta")).toBeTruthy();
    expect(screen.queryByText("Martín Ávila")).toBeNull();
  });

  it("registro en 3 pasos: valida, verifica el código, pide notificaciones y entra a Home", async () => {
    // Espía sin reemplazar: el servicio real genera el código y lo leemos.
    const enviar = jest.spyOn(auth, "enviarCodigo");
    await montarApp({ sesion: false });
    await fireEvent.press(await screen.findByRole("button", { name: "Empezar" }));

    // Paso 1 — datos
    expect(await screen.findByText("Tus datos")).toBeTruthy();
    expect(screen.getByText("1 / 3")).toBeTruthy();
    await fireEvent.press(screen.getByText("Continuar"));
    expect(await screen.findByText("Ingresá tu nombre.")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Laura");
    await fireEvent.changeText(screen.getByLabelText("Apellido"), "Escobar");
    await fireEvent.changeText(screen.getByLabelText("Cédula"), "1.020.304.050");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), CUENTA_DEMO.email);
    await fireEvent.changeText(screen.getByLabelText("Teléfono"), "+54 11 4444 1234");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "segura123");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "otra1234");
    await fireEvent.press(screen.getByText("Continuar"));
    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeTruthy();

    // El correo repetido ya no se puede detectar en este paso (sin RPC): lo
    // rechaza Supabase al crear la cuenta (ver «no permite repetir correo ni cédula»).
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "segura123");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "laura@correo.com");
    await fireEvent.press(screen.getByText("Continuar"));

    // Paso 2 — preferencias
    expect(await screen.findByText("¿Qué cupos te sirven?")).toBeTruthy();
    expect(screen.getByText("2 / 3")).toBeTruthy();
    await fireEvent.press(screen.getByText("Continuar"));
    expect(await screen.findByText("Elegí al menos una especialidad.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("checkbox", { name: "Cardiología" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Nutrición" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Tarde" }));
    await fireEvent.press(screen.getByRole("radio", { name: "3 km" }));
    await fireEvent.press(screen.getByText("Continuar"));

    // Paso 3 — verificación
    expect(await screen.findByText("Verificá tu teléfono")).toBeTruthy();
    expect(screen.getByText("3 / 3")).toBeTruthy();
    expect(screen.getByText("Enviamos un código de 6 dígitos al +54 11 4444 1234.")).toBeTruthy();
    expect(enviar).toHaveBeenCalledWith("+54 11 4444 1234");

    // Sin código completo ni términos aceptados, «Crear cuenta» no hace nada.
    const crear = () => screen.getByRole("button", { name: "Crear cuenta" });
    expect(crear()).toBeDisabled();
    await fireEvent.press(crear());
    expect(screen.getByText("Verificá tu teléfono")).toBeTruthy();

    const codigo = await enviar.mock.results[0].value;
    const incorrecto = codigo === "000000" ? "111111" : "000000";
    await fireEvent.changeText(screen.getByTestId("codigo-input"), incorrecto);
    await fireEvent.press(screen.getByRole("checkbox", { name: "Acepto términos y política de privacidad" }));
    await fireEvent.press(crear());
    expect(await screen.findByText("El código no es correcto.")).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId("codigo-input"), codigo);
    await fireEvent.press(crear());

    expect(await screen.findByText("Laura Escobar")).toBeTruthy();
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    // Lista de espera real: en Nutrición no espera nadie, así que es el primero.
    expect(screen.getByText("Sos el primero: el próximo cupo que te sirva es tuyo.")).toBeTruthy();

    // Lo elegido en el paso 2 aparece en Perfil.
    await fireEvent.press(screen.getByRole("tab", { name: "Perfil" }));
    expect(await screen.findByText("LE", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText("Especialidades en espera: 2")).toBeTruthy();
    expect(screen.getByText("Tarde")).toBeTruthy();
    expect(screen.getByText("Activadas")).toBeTruthy();

    // Cada paciente ve solo sus notificaciones: la cuenta nueva empieza sin
    // ninguna y nunca ve las de la cuenta demo.
    await fireEvent.press(screen.getByRole("tab", { name: "Notificaciones" }));
    expect(await screen.findByText("No tenés notificaciones")).toBeTruthy();
    expect(screen.queryByText(/Martín/)).toBeNull();
  });

  it("registro con confirmación de correo: lleva al inicio de sesión con el aviso, sin ingresar", async () => {
    pedirConfirmacionDeCorreo(true);
    const enviar = jest.spyOn(auth, "enviarCodigo");
    const ingresar = jest.spyOn(getSupabase().auth, "signInWithPassword");
    await montarApp({ sesion: false });
    await fireEvent.press(await screen.findByRole("button", { name: "Empezar" }));

    await fireEvent.changeText(await screen.findByLabelText("Nombre"), "Laura");
    await fireEvent.changeText(screen.getByLabelText("Apellido"), "Escobar");
    await fireEvent.changeText(screen.getByLabelText("Cédula"), "1.020.304.050");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), "laura@correo.com");
    await fireEvent.changeText(screen.getByLabelText("Teléfono"), "+54 11 4444 1234");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "segura123");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "segura123");
    await fireEvent.press(screen.getByText("Continuar"));
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Cardiología" }));
    await fireEvent.press(screen.getByText("Continuar"));

    expect(await screen.findByText("Verificá tu teléfono")).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId("codigo-input"), await enviar.mock.results[0].value);
    await fireEvent.press(screen.getByRole("checkbox", { name: "Acepto términos y política de privacidad" }));
    await fireEvent.press(screen.getByRole("button", { name: "Crear cuenta" }));

    // Inicio de sesión con el aviso de confirmación; no es un error ni entra a la app.
    expect(await screen.findByText("Te enviamos un correo para confirmar tu cuenta. Confirmalo y después iniciá sesión.")).toBeTruthy();
    expect(screen.getByText("Ingresá a tu cuenta")).toBeTruthy();
    expect(screen.queryByText("No pudimos crear la cuenta.")).toBeNull();
    expect(screen.queryByText("Laura Escobar")).toBeNull();
    expect(ingresar).not.toHaveBeenCalled();
    expect(await auth.getSesion()).toBeNull();
    expect(pacientesCreados.filter((f) => f.email === "laura@correo.com")).toHaveLength(1);

    // «Atrás» vuelve a la Bienvenida, no al paso 3 del registro.
    await fireEvent.press(screen.getByLabelText("Volver"));
    expect(await screen.findByRole("button", { name: "Empezar" })).toBeTruthy();
    expect(screen.queryByText("Verificá tu teléfono")).toBeNull();
  });

  it("en inglés, entrando al registro desde «Log in»: Login recibe el aviso de confirmación y lo muestra", async () => {
    await AsyncStorage.setItem("ts.ajustes", JSON.stringify({ modoOscuro: false, idioma: "en" }));
    pedirConfirmacionDeCorreo(true);
    const enviar = jest.spyOn(auth, "enviarCodigo");
    await montarApp({ sesion: false });

    // Bienvenida → Log in → «Create account» (el camino de quien ya pasó por el login).
    await fireEvent.press(await screen.findByLabelText("Log in"));
    expect(await screen.findByText("Log in to your account")).toBeTruthy();
    expect(screen.queryByText(/We sent you an email/)).toBeNull();
    await fireEvent.press(screen.getByText("Create account"));

    await fireEvent.changeText(await screen.findByLabelText("Name"), "Laura");
    await fireEvent.changeText(screen.getByLabelText("Last name"), "Escobar");
    await fireEvent.changeText(screen.getByLabelText("ID number"), "1020304050");
    await fireEvent.changeText(screen.getByLabelText("Email"), "laura@correo.com");
    await fireEvent.changeText(screen.getByLabelText("Phone"), "+54 11 4444 1234");
    await fireEvent.changeText(screen.getByLabelText("Password"), "segura123");
    await fireEvent.changeText(screen.getByLabelText("Confirm password"), "segura123");
    await fireEvent.press(screen.getByText("Continue"));
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Cardiology" }));
    await fireEvent.press(screen.getByText("Continue"));

    expect(await screen.findByText("Verify your phone")).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId("codigo-input"), await enviar.mock.results[0].value);
    await fireEvent.press(screen.getByRole("checkbox", { name: "I accept the terms and privacy policy" }));
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));

    // La pantalla de Login que queda enfocada recibió el aviso y lo muestra.
    expect(
      await screen.findByText("We sent you an email to confirm your account. Confirm it and then log in.")
    ).toBeTruthy();
    expect(screen.getByText("Log in to your account")).toBeTruthy();
    expect(screen.queryByText("Verify your phone")).toBeNull();
    expect(await auth.getSesion()).toBeNull();
  });

  it("la flecha del registro vuelve a la pantalla anterior", async () => {
    await montarApp({ sesion: false });
    await fireEvent.press(await screen.findByRole("button", { name: "Empezar" }));
    await fireEvent.changeText(await screen.findByLabelText("Nombre"), "Laura");
    await fireEvent.press(screen.getByLabelText("Volver"));
    expect(await screen.findByRole("button", { name: "Empezar" })).toBeTruthy();
  });
});
