// Safe area con medidas fijas: en Jest no hay dispositivo real.
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
