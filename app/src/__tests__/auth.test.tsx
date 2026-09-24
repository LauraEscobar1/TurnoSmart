import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import { fireEvent, screen } from "@testing-library/react-native";
import * as auth from "@/services/authService";
import { CUENTA_DEMO } from "@/data/mockData";
import { irALogin, montarApp, reiniciarDatos } from "@/test-utils/app";

beforeEach(async () => {
  await reiniciarDatos();
  jest.clearAllMocks();
});

const datosValidos: auth.DatosCuenta = {
  nombre: "Laura",
  apellido: "Escobar",
  dni: "30.111.222",
  email: "Laura@Correo.com ",
  telefono: "+54 11 4444 1234",
  password: "segura123",
};

const preferencias: auth.PreferenciasCupo = {
  especialidadesInteres: ["Cardiología"],
  franjaPreferida: "Mañana",
  distanciaMaxKm: null,
  obraSocial: " OSDE 310 ",
};

describe("authService", () => {
  it("inicia sesión con la cuenta demo y rechaza credenciales inválidas", async () => {
    const p = await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    expect(p.nombre).toBe("Martín");
    expect((await auth.getSesion())?.email).toBe(CUENTA_DEMO.email);

    await expect(auth.iniciarSesion(CUENTA_DEMO.email, "otra")).rejects.toMatchObject({ campo: "password" });
    await expect(auth.iniciarSesion("", "x")).rejects.toMatchObject({ campo: "email" });
  });

  it("cerrar sesión borra la sesión pero recuerda el usuario para Face ID", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    await auth.cerrarSesion();
    expect(await auth.getSesion()).toBeNull();
    expect(await auth.getUltimoUsuario()).toBe(CUENTA_DEMO.email);
    expect((await auth.iniciarSesionBiometrica()).email).toBe(CUENTA_DEMO.email);
  });

  it("valida los datos del paso 1", () => {
    expect(auth.validarDatosCuenta(datosValidos)).toEqual({});
    const e = auth.validarDatosCuenta({ nombre: " ", apellido: "", dni: "12a", email: "x@", telefono: "123", password: "corta" });
    expect(Object.keys(e).sort()).toEqual(["apellido", "dni", "email", "nombre", "password", "telefono"]);
    expect(auth.validarDatosCuenta({ ...datosValidos, password: "sinnumeros" }).password).toBe("Mínimo 8 caracteres, un número.");
  });

  it("no permite repetir correo ni DNI", async () => {
    await expect(auth.verificarDisponibilidad({ email: CUENTA_DEMO.email, dni: "1" })).rejects.toMatchObject({ campo: "email" });
    await expect(auth.verificarDisponibilidad({ email: "nuevo@correo.com", dni: "35.482.910" })).rejects.toMatchObject({ campo: "dni" });
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
      dni: "30111222",
      obraSocial: "OSDE 310",
      franjaPreferida: "Mañana",
      distanciaMaxKm: null,
    });
    expect((await auth.getSesion())?.email).toBe("laura@correo.com");
    // Y puede volver a entrar con su contraseña.
    await auth.cerrarSesion();
    await expect(auth.iniciarSesion("laura@correo.com", "segura123")).resolves.toMatchObject({ nombre: "Laura" });
  });
});

describe("Acceso en pantalla", () => {
  it("sin sesión muestra el inicio de sesión; con credenciales válidas entra a Home", async () => {
    await montarApp({ sesion: false });
    expect(await screen.findByText("Crear cuenta con tu teléfono")).toBeTruthy();
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

  it("Face ID: con usuario recordado y biometría válida entra a Home", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    await auth.cerrarSesion();
    await montarApp({ sesion: false });
    await irALogin();

    await fireEvent.press(await screen.findByText("Ingresar con Face ID"));
    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledTimes(1);
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
    await fireEvent.press(await screen.findByText("Crear cuenta con tu teléfono"));

    // Paso 1 — datos
    expect(await screen.findByText("Tus datos")).toBeTruthy();
    expect(screen.getByText("1 / 3")).toBeTruthy();
    await fireEvent.press(screen.getByText("Continuar"));
    expect(await screen.findByText("Ingresá tu nombre.")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Laura");
    await fireEvent.changeText(screen.getByLabelText("Apellido"), "Escobar");
    await fireEvent.changeText(screen.getByLabelText("DNI"), "30.111.222");
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), CUENTA_DEMO.email);
    await fireEvent.changeText(screen.getByLabelText("Teléfono"), "+54 11 4444 1234");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "segura123");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "otra1234");
    await fireEvent.press(screen.getByText("Continuar"));
    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "segura123");
    await fireEvent.press(screen.getByText("Continuar"));
    expect(await screen.findByText("Ya existe una cuenta con este correo.")).toBeTruthy();

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
    await fireEvent.changeText(screen.getByLabelText("Obra social / prepaga"), "OSDE 310");
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
    expect(screen.getByText("0 días · puesto 12")).toBeTruthy();

    // Lo elegido en el paso 2 aparece en Perfil.
    await fireEvent.press(screen.getByRole("tab", { name: "Perfil" }));
    expect(await screen.findByText("LE")).toBeTruthy();
    // «2» especialidades en espera (el otro «2» es el badge de Avisos).
    expect(screen.getAllByText("2")).toHaveLength(2);
    expect(screen.getByText("Tarde")).toBeTruthy();
    expect(screen.getByText("Activadas")).toBeTruthy();
  });

  it("la flecha del registro vuelve a la pantalla anterior", async () => {
    await montarApp({ sesion: false });
    await fireEvent.press(await screen.findByText("Crear cuenta con tu teléfono"));
    await fireEvent.changeText(await screen.findByLabelText("Nombre"), "Laura");
    await fireEvent.press(screen.getByLabelText("Volver"));
    expect(await screen.findByText("Crear cuenta con tu teléfono")).toBeTruthy();
  });
});
