// Reanimated 4 necesita el hilo de UI nativo: en Jest, componentes de React Native
// y animaciones que terminan al instante (src/test-utils/reanimadoFalso.js).
jest.mock("react-native-reanimated", () => require("@/test-utils/reanimadoFalso"));

// Safe area con medidas fijas: en Jest no hay dispositivo real.
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

// Almacenamiento en memoria (el módulo trae su propio mock oficial).
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Pager nativo de la navegación deslizable: se renderiza solo la página
// visible y setPage avisa el cambio como lo haría el componente nativo.
jest.mock("react-native-pager-view", () => {
  const React = require("react");
  const { View } = require("react-native");
  class PagerView extends React.Component {
    constructor(props) {
      super(props);
      this.state = { page: props.initialPage ?? 0 };
    }
    setPage = (page) => {
      this.setState({ page });
      this.props.onPageSelected?.({ nativeEvent: { position: page } });
    };
    setPageWithoutAnimation = this.setPage;
    setScrollEnabled() {}
    render() {
      const pages = React.Children.toArray(this.props.children);
      return React.createElement(View, { style: this.props.style }, pages[this.state.page]);
    }
  }
  return { __esModule: true, default: PagerView, PagerView };
});

// Biometría y notificaciones: cada prueba puede ajustar las respuestas.
jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  // Por defecto, un iPhone con Face ID configurado.
  supportedAuthenticationTypesAsync: jest.fn(async () => [2]),
  getEnrolledLevelAsync: jest.fn(async () => 3),
  authenticateAsync: jest.fn(async () => ({ success: true })),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
}));

// Llavero del teléfono (SecureStore) en memoria; `__limpiar()` lo vacía entre pruebas.
jest.mock("expo-secure-store", () => {
  const llavero = new Map();
  return {
    getItemAsync: jest.fn(async (clave) => (llavero.has(clave) ? llavero.get(clave) : null)),
    setItemAsync: jest.fn(async (clave, valor) => void llavero.set(clave, valor)),
    deleteItemAsync: jest.fn(async (clave) => void llavero.delete(clave)),
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
    __contenido: () => Object.fromEntries(llavero),
    __limpiar: () => llavero.clear(),
  };
});
// Notificaciones locales: `__tocar(respuesta)` simula que el usuario toca una
// notificación (o uno de sus botones) con la app abierta.
jest.mock("expo-notifications", () => {
  const oyentes = new Set();
  return {
    AndroidImportance: { HIGH: 4 },
    DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
    // Por defecto el permiso ya está concedido; cada prueba puede cambiarlo.
    getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => null),
    setNotificationCategoryAsync: jest.fn(async () => null),
    scheduleNotificationAsync: jest.fn(async () => "aviso-local"),
    getLastNotificationResponseAsync: jest.fn(async () => null),
    clearLastNotificationResponse: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn((oyente) => {
      oyentes.add(oyente);
      return { remove: () => oyentes.delete(oyente) };
    }),
    __tocar: (respuesta) => oyentes.forEach((oyente) => oyente(respuesta)),
  };
});

// Supabase: cliente falso en memoria (Auth + INSERT en pacientes), sin red.
jest.mock("@/services/supabaseClient", () => require("@/test-utils/supabaseFalso"));

// Háptica: sin motor de vibración en Jest.
jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(async () => {}),
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

// Alertas del sistema: por defecto el usuario toca la opción «cancel» (p. ej.
// «Ahora no» al ofrecer Face ID); cada prueba puede responder otra cosa.
const { Alert } = require("react-native");
jest
  .spyOn(Alert, "alert")
  .mockImplementation((_titulo, _mensaje, botones) => botones?.find((b) => b.style === "cancel")?.onPress?.());
