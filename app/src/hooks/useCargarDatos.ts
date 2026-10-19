import { useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { alCambiarDatos } from "@/services/cambiosService";

/**
 * Carga los datos de una sección al montarse y los refresca cada vez que
 * recibe el foco. Con la navegación deslizable las secciones vecinas se
 * ven mientras se arrastra, antes de tener el foco: sin la carga inicial
 * aparecerían vacías durante el gesto. También recarga cuando el servidor
 * avisa un cambio (oferta nueva, vencimiento...) o la app vuelve a primer
 * plano (cambiosService).
 */
export function useCargarDatos(cargar: () => void) {
  useEffect(() => {
    cargar();
    return alCambiarDatos(cargar);
  }, [cargar]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );
}
