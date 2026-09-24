import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as auth from "@/services/authService";
import { CUENTA_DEMO } from "@/data/mockData";
import { SplashScreen } from "@/screens/Auth/SplashScreen";
import { irALogin, montarApp, reiniciarDatos } from "@/test-utils/app";

beforeEach(async () => {
  await reiniciarDatos();
});

describe("Splash", () => {
  it("muestra la marca y la bajada sobre el campo sólido", async () => {
    await render(<SplashScreen />);
    expect(screen.getByText("TurnoSmart")).toBeTruthy();
    expect(screen.getByText("Cupos médicos de último minuto")).toBeTruthy();
  });
});

describe("Intro", () => {
  it("la primera vez muestra 3 pasos y al terminar queda en Bienvenida", async () => {
    await montarApp({ sesion: false, intro: true });
    expect(await screen.findByText("Cupos que se liberan")).toBeTruthy();
    expect(screen.getByLabelText("Paso 1 de 3")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByLabelText("Paso 2 de 3")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByLabelText("Paso 3 de 3")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Empezar" }));
    expect(await screen.findByRole("button", { name: "Empezar" })).toBeTruthy();
    expect(await AsyncStorage.getItem("ts.introVista")).toBe("1");
  });

  it("«Omitir» salta la intro y no vuelve a aparecer", async () => {
    await montarApp({ sesion: false, intro: true });
    await fireEvent.press(await screen.findByRole("button", { name: "Omitir" }));
    expect(await screen.findByRole("button", { name: "Empezar" })).toBeTruthy();
    expect(await auth.introVista()).toBe(true);
  });
});

describe("Restablecer contraseña — servicio", () => {
  it("cambia la contraseña solo con el código correcto y una contraseña válida", async () => {
    await expect(auth.solicitarRestablecimiento("no-es-correo")).rejects.toMatchObject({ campo: "email" });

    const codigo = await auth.solicitarRestablecimiento(CUENTA_DEMO.email);
    const incorrecto = codigo === "000000" ? "111111" : "000000";
    await expect(auth.restablecerPassword(CUENTA_DEMO.email, codigo, "corta")).rejects.toMatchObject({ campo: "password" });
    await expect(auth.restablecerPassword(CUENTA_DEMO.email, incorrecto, "nueva1234")).rejects.toMatchObject({ campo: "codigo" });

    await auth.restablecerPassword(CUENTA_DEMO.email, codigo, "nueva1234");
    await expect(auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password)).rejects.toMatchObject({ campo: "password" });
    await expect(auth.iniciarSesion(CUENTA_DEMO.email, "nueva1234")).resolves.toMatchObject({ nombre: "Martín" });
  });

  it("no revela si el correo existe, pero no permite restablecer una cuenta inexistente", async () => {
    const codigo = await auth.solicitarRestablecimiento("nadie@correo.com");
    await expect(auth.restablecerPassword("nadie@correo.com", codigo, "nueva1234")).rejects.toMatchObject({ campo: "codigo" });
  });
});

describe("Restablecer contraseña — pantalla", () => {
  it("login → ¿Olvidaste tu contraseña? → código → contraseña nueva → vuelve al login con aviso", async () => {
    const enviar = jest.spyOn(auth, "solicitarRestablecimiento");
    await montarApp({ sesion: false });
    await irALogin();
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), CUENTA_DEMO.email);
    await fireEvent.press(screen.getByText("¿Olvidaste tu contraseña?"));

    // El correo escrito en el login viaja a la pantalla nueva.
    expect(await screen.findByText("Restablecer contraseña")).toBeTruthy();
    expect(screen.getByDisplayValue(CUENTA_DEMO.email)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Enviar código" }));

    expect(await screen.findByText(`Enviamos un código de 6 dígitos a ${CUENTA_DEMO.email}.`)).toBeTruthy();
    expect(screen.getByText("Reenviar código en 1:00")).toBeTruthy();
    const codigo = await enviar.mock.results[0].value;

    const cambiar = () => screen.getByRole("button", { name: "Cambiar contraseña" });
    expect(cambiar()).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId("codigo-input"), codigo);
    await fireEvent.changeText(screen.getByLabelText("Contraseña nueva"), "nueva1234");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "otra1234");
    await fireEvent.press(cambiar());
    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "nueva1234");
    await fireEvent.press(cambiar());
    expect(await screen.findByText("Listo: ya podés ingresar con tu contraseña nueva.")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "nueva1234");
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
  });
});

describe("Campo de contraseña", () => {
  it("el ojo muestra y oculta la contraseña", async () => {
    await montarApp({ sesion: false });
    await irALogin();
    const campo = screen.getByLabelText("Contraseña");
    expect(campo.props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByLabelText("Mostrar contraseña"));
    expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByLabelText("Ocultar contraseña"));
    expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(true);
  });
});
