import { useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Carga los datos de una sección al montarse y los refresca cada vez que
 * recibe el foco. Con la navegación deslizable las secciones vecinas se
 * ven mientras se arrastra, antes de tener el foco: sin la carga inicial
 * aparecerían vacías durante el gesto.
 */
export function useCargarDatos(cargar: () => void) {
  useEffect(() => {
    cargar();
  }, [cargar]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );
}
