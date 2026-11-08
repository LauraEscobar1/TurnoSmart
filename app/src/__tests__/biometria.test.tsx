import { Alert, AlertButton } from "react-native";
import { isRunningInExpoGo } from "expo";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as auth from "@/services/authService";
import * as bio from "@/services/biometriaService";
import { CUENTA_DEMO } from "@/data/mockData";
import { irALogin, montarApp, reiniciarDatos } from "@/test-utils/app";
import { getSupabase, olvidarSesionLocalFalsa, vencerRefreshTokensFalsos } from "@/test-utils/supabaseFalso";

// jest-expo se presenta como Expo Go: por defecto, un development build (Face ID real).
jest.mock("expo", () => ({ ...jest.requireActual("expo"), isRunningInExpoGo: jest.fn(() => false) }));

const llavero = () => (SecureStore as unknown as { __contenido: () => Record<string, string> }).__contenido();
const tokenDeLaSesion = async () => (await getSupabase().auth.getSession()).data.session?.refresh_token;

/** La próxima alerta del sistema se responde tocando el botón `texto`. */
function responderAlerta(texto: string) {
  jest.mocked(Alert.alert).mockImplementationOnce((_t, _m, botones?: AlertButton[]) => {
    botones?.find((b) => b.text === texto)?.onPress?.();
  });
}

async function ingresarConCorreo() {
  await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), CUENTA_DEMO.email);
  await fireEvent.changeText(screen.getByLabelText("Contraseña"), CUENTA_DEMO.password);
  await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
}

beforeEach(async () => {
  await reiniciarDatos();
  jest.clearAllMocks();
});

describe("biometriaService", () => {
  it("activar guarda el refresh token de la sesión y el correo, nunca la contraseña", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    expect(await bio.activar()).toBe(true);

    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ disableDeviceFallback: false })
    );
    expect(llavero()).toEqual({
      "ts.biometria.refreshToken": await tokenDeLaSesion(),
      "ts.biometria.correo": CUENTA_DEMO.email,
    });
    expect(await bio.estaActivada()).toBe(true);
    const todo = JSON.stringify([llavero(), await AsyncStorage.multiGet(await AsyncStorage.getAllKeys())]);
    expect(todo).not.toContain(CUENTA_DEMO.password);
  });

  it("si cancela la biometría al activar, no guarda nada", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValueOnce({ success: false, error: "user_cancel" });
    expect(await bio.activar()).toBe(false);
    expect(llavero()).toEqual({});
  });

  it("ingresar autentica y restaura la sesión con el refresh token (y guarda el nuevo)", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    await bio.activar();
    const anterior = llavero()["ts.biometria.refreshToken"];
    olvidarSesionLocalFalsa(); // el teléfono ya no tiene la sesión abierta

    const sesion = await auth.iniciarSesionBiometricaApp();
    expect(sesion.paciente?.email).toBe(CUENTA_DEMO.email);
    // Supabase rota el token: queda guardado el nuevo, que es el de la sesión.
    expect(llavero()["ts.biometria.refreshToken"]).not.toBe(anterior);
    expect(llavero()["ts.biometria.refreshToken"]).toBe(await tokenDeLaSesion());
  });

  it("biometría cancelada: no inicia sesión ni borra lo guardado", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    await bio.activar();
    olvidarSesionLocalFalsa();
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValueOnce({ success: false, error: "user_cancel" });

    await expect(bio.ingresar()).rejects.toBeInstanceOf(bio.BiometriaCancelada);
    expect(await bio.estaActivada()).toBe(true);
  });

  it("token vencido: lo borra y pide correo y contraseña", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    await bio.activar();
    olvidarSesionLocalFalsa();
    vencerRefreshTokensFalsos();

    await expect(bio.ingresar()).rejects.toMatchObject({
      message: "Tu ingreso rápido venció. Ingresa con tu correo y contraseña; después puedes volver a activarlo en Perfil.",
    });
    expect(await bio.estaActivada()).toBe(false);
    expect(llavero()).toEqual({});
  });

  it("desactivar y cerrar sesión borran lo guardado", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    await bio.activar();
    await bio.desactivar();
    expect(await bio.estaActivada()).toBe(false);

    await bio.activar();
    await auth.cerrarSesion();
    expect(llavero()).toEqual({});
  });

  it("si ingresa otra cuenta con correo, deja de valer el ingreso biométrico de la anterior", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    await bio.activar();
    await bio.alIngresarConCorreo("otra@correo.com");
    expect(await bio.estaActivada()).toBe(false);
  });

  it("pregunta una sola vez por dispositivo", async () => {
    expect(await bio.debePreguntar()).toBe(true);
    await bio.marcarPreguntado();
    expect(await bio.debePreguntar()).toBe(false);
  });

  it("elige la etiqueta según el hardware", async () => {
    expect(await bio.metodoDisponible()).toBe("faceId");

    jest.mocked(LocalAuthentication.supportedAuthenticationTypesAsync).mockResolvedValueOnce([
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    ]);
    expect(await bio.metodoDisponible()).toBe("touchId");

    // Sin biometría configurada pero con código: el código del teléfono.
    jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValueOnce(false);
    jest.mocked(LocalAuthentication.getEnrolledLevelAsync).mockResolvedValueOnce(LocalAuthentication.SecurityLevel.SECRET);
    expect(await bio.metodoDisponible()).toBe("codigo");

    // Expo Go en iOS no tiene permiso de Face ID: pide el código del teléfono.
    jest.mocked(isRunningInExpoGo).mockReturnValueOnce(true);
    expect(await bio.metodoDisponible()).toBe("codigo");

    // Ni biometría ni código: no se ofrece.
    jest.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValueOnce(false);
    jest.mocked(LocalAuthentication.getEnrolledLevelAsync).mockResolvedValueOnce(LocalAuthentication.SecurityLevel.NONE);
    expect(await bio.metodoDisponible()).toBeNull();
  });
});

describe("Ingreso con Face ID en pantalla", () => {
  it("sin activarlo, Iniciar sesión no muestra el botón", async () => {
    await montarApp({ sesion: false });
    await irALogin();
    expect(screen.queryByText("Ingresar con Face ID")).toBeNull();
  });

  it("tras el primer ingreso pregunta una vez; si acepta, la próxima vez entra con Face ID", async () => {
    await montarApp({ sesion: false });
    await irALogin();
    responderAlerta("Sí, activar");
    await ingresarConCorreo();
    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
    expect(Alert.alert).toHaveBeenCalledWith(
      "¿Quieres ingresar con Face ID la próxima vez?",
      expect.any(String),
      expect.any(Array),
      expect.anything()
    );
    expect(await bio.estaActivada()).toBe(true);

    // Se vuelve a abrir la app: no entra sola, pide Face ID en Iniciar sesión.
    screen.unmount();
    await montarApp({ sesion: false });
    expect(await screen.findByText("Ingresa a tu cuenta")).toBeTruthy();
    expect(screen.queryByText("Martín Ávila")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Ingresar con Face ID" }));
    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
  });

  it("si responde «Ahora no», no vuelve a preguntar", async () => {
    await montarApp({ sesion: false });
    await irALogin();
    await ingresarConCorreo(); // por defecto, la alerta se responde «Ahora no»
    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(await bio.estaActivada()).toBe(false);

    await fireEvent.press(await screen.findByRole("tab", { name: "Perfil" }));
    await fireEvent.press(await screen.findByText("Cerrar sesión"));
    await irALogin();
    await ingresarConCorreo();
    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it("con el token vencido avisa, borra lo guardado y pide correo y contraseña", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    await bio.activar();
    olvidarSesionLocalFalsa();
    vencerRefreshTokensFalsos();
    await montarApp({ sesion: false });

    await fireEvent.press(await screen.findByRole("button", { name: "Ingresar con Face ID" }));
    expect(await screen.findByText(/Tu ingreso rápido venció/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ingresar con Face ID" })).toBeNull();
    expect(llavero()).toEqual({});
  });

  it("Face ID cancelado no inicia sesión", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    await bio.activar();
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValueOnce({ success: false, error: "user_cancel" });
    await montarApp({ sesion: false });

    await fireEvent.press(await screen.findByRole("button", { name: "Ingresar con Face ID" }));
    expect(screen.getByText("Ingresa a tu cuenta")).toBeTruthy();
    expect(screen.queryByText("Martín Ávila")).toBeNull();
  });

  it("en Perfil se activa y desactiva con el interruptor, y se mantiene al día cuando Supabase rota el token", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Perfil" }));
    const interruptor = await screen.findByLabelText("Ingresar con Face ID");
    expect(interruptor.props.value).toBe(false);

    await fireEvent(interruptor, "valueChange", true);
    await waitFor(() => expect(screen.getByLabelText("Ingresar con Face ID").props.value).toBe(true));
    expect(llavero()["ts.biometria.refreshToken"]).toBe(await tokenDeLaSesion());

    // Supabase renueva la sesión sola (autoRefreshToken): el token guardado se actualiza.
    await act(async () => {
      await getSupabase().auth.refreshSession();
    });
    const renovado = await tokenDeLaSesion();
    await waitFor(() => expect(llavero()["ts.biometria.refreshToken"]).toBe(renovado));

    await fireEvent(screen.getByLabelText("Ingresar con Face ID"), "valueChange", false);
    await waitFor(() => expect(screen.getByLabelText("Ingresar con Face ID").props.value).toBe(false));
    expect(llavero()).toEqual({});
  });
});
