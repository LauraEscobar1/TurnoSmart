/**
 * Reanimated en Jest: sin hilo de UI. Los componentes animados son los de
 * React Native, los valores compartidos son objetos simples y las
 * animaciones devuelven su valor final al instante. Solo cubre la API que
 * usa la app (src/components/Animaciones.tsx y las listas animadas).
 */
const React = require("react");
const RN = require("react-native");

/** Constructor de animación encadenable (FadeInDown.delay(…).duration(…)…). */
const constructor = () => {
  const b = new Proxy(function () {}, {
    get: (_, prop) => (prop === "build" ? () => () => ({ initialValues: {}, animations: {} }) : () => b),
  });
  return b;
};

const sinPropsAnimadas = (Componente) =>
  React.forwardRef(function Animado({ entering, exiting, layout, ...props }, ref) {
    return React.createElement(Componente, { ...props, ref });
  });

const Animated = {
  View: sinPropsAnimadas(RN.View),
  Text: sinPropsAnimadas(RN.Text),
  ScrollView: sinPropsAnimadas(RN.ScrollView),
  FlatList: sinPropsAnimadas(RN.FlatList),
  createAnimatedComponent: sinPropsAnimadas,
};

const interpolate = (x, entrada, salida) => {
  if (x <= entrada[0]) return salida[0];
  for (let i = 1; i < entrada.length; i++) {
    if (x <= entrada[i]) {
      const t = (x - entrada[i - 1]) / (entrada[i] - entrada[i - 1]);
      return salida[i - 1] + t * (salida[i] - salida[i - 1]);
    }
  }
  return salida[salida.length - 1];
};

const identidad = (v) => v;
const Easing = new Proxy({}, { get: () => () => identidad });

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  useSharedValue: (inicial) => React.useRef({ value: inicial }).current,
  useAnimatedStyle: (f) => f(),
  useAnimatedProps: (f) => f(),
  useAnimatedScrollHandler: () => () => {},
  useReducedMotion: () => false,
  withTiming: (v) => v,
  withSpring: (v) => v,
  withDelay: (_, v) => v,
  withRepeat: (v) => v,
  withSequence: (...vs) => vs[vs.length - 1],
  cancelAnimation: () => {},
  runOnJS: (f) => f,
  interpolate,
  Extrapolation: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
  Easing,
  ReduceMotion: { System: "system", Always: "always", Never: "never" },
  FadeIn: constructor(),
  FadeInDown: constructor(),
  FadeOut: constructor(),
  ZoomOut: constructor(),
  ZoomIn: constructor(),
  LinearTransition: constructor(),
};
