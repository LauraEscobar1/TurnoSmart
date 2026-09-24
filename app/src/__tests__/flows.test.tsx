import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { RootNavigator } from "@/navigation/RootNavigator";
import { citasMock, notificacionesMock, ofertasMock } from "@/data/mockData";

/**
 * Flujos de punta a punta sobre el navegador real. Los mocks son mutables
 * (aceptar una oferta la cambia), así que se restauran antes de cada prueba.
 */
const inicial = JSON.stringify({ ofertasMock, citasMock, notificacionesMock });

function restaurarMocks() {
  const copia = JSON.parse(inicial);
  ofertasMock.splice(0, ofertasMock.length, ...copia.ofertasMock);
  citasMock.splice(0, citasMock.length, ...copia.citasMock);
  notificacionesMock.splice(0, notificacionesMock.length, ...copia.notificacionesMock);
}

function montarApp() {
  return render(<RootNavigator />);
}

beforeEach(() => {
  restaurarMocks();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("Home", () => {
  it("muestra saludo, oferta activa, próxima cita, lista de espera y la barra de 5 destinos", async () => {
    await montarApp();
    expect(await screen.findByText("Laura Escobar")).toBeTruthy();
    expect(screen.getByText("Oferta para vos")).toBeTruthy();
    expect(screen.getByText("Ver oferta")).toBeTruthy();
    expect(screen.getByText("Próxima cita confirmada")).toBeTruthy();
    expect(screen.getByText(/Dermatología · \d\d:\d\d/)).toBeTruthy();
    expect(screen.getByText("34 días · puesto 3")).toBeTruthy();

    for (const tab of ["Inicio", "Ofertas", "Mis citas", "Avisos", "Perfil"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeTruthy();
    }
    // Badges: 1 oferta pendiente y 1 aviso sin leer.
    expect(screen.getAllByText("1")).toHaveLength(2);
    // Sin emojis sueltos en la interfaz.
    expect(screen.queryByText(/👋|✅|👍/)).toBeNull();
  });
});

describe("Ruta crítica · 2 toques", () => {
  it("Ver oferta → Aceptar cupo → confirmación → Mis citas › Próximas con la cita nueva", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByText("Ver oferta")); // toque 1

    expect(await screen.findByText("Tiempo para responder")).toBeTruthy();
    expect(screen.getByText("Oferta de cupo")).toBeTruthy();
    expect(screen.getByText("Por qué te lo ofrecemos")).toBeTruthy();
    expect(screen.getByText("Tiempo en espera")).toBeTruthy();
    expect(screen.queryByText(/0[.,]87/)).toBeNull(); // nunca el score

    await fireEvent.press(screen.getByText("Aceptar cupo")); // toque 2 — sin «¿seguro?»

    expect(await screen.findByText("Cupo confirmado")).toBeTruthy();
    expect(screen.getByText("Volviendo a Mis citas en 2 s")).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    expect(await screen.findByText(/Odontología · \d\d:\d\d/)).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Mis citas", selected: true })).toBeTruthy();
    expect(screen.getAllByText("Confirmada").length).toBeGreaterThanOrEqual(2);
  });

  it("Rechazar muestra el estado terminal en contorno y vuelve al inicio", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByText("Ver oferta"));
    await fireEvent.press(await screen.findByText("Rechazar"));

    expect(await screen.findByText("Oferta rechazada")).toBeTruthy();
    await fireEvent.press(screen.getByText("Volver al inicio"));

    expect(await screen.findByText("Sin ofertas por ahora")).toBeTruthy();
  });

  it("el back del detalle va a Home", async () => {
    await montarApp();
    await fireEvent.press(screen.getByRole("tab", { name: "Avisos" }));
    await fireEvent.press(await screen.findByText("Odontología hoy"));
    expect(await screen.findByText("Tiempo para responder")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Volver"));
    expect(await screen.findByText("Laura Escobar")).toBeTruthy();
  });
});

describe("Secciones", () => {
  it("Ofertas: pendiente con acciones y historial vacío", async () => {
    await montarApp();
    await fireEvent.press(screen.getByRole("tab", { name: "Ofertas" }));
    expect(await screen.findByText("Aceptar cupo")).toBeTruthy();
    await fireEvent.press(screen.getByText("Historial"));
    expect(await screen.findByText("Todavía no tenés historial de ofertas")).toBeTruthy();
  });

  it("Mis citas: próximas, pasadas y detalle", async () => {
    await montarApp();
    await fireEvent.press(screen.getByRole("tab", { name: "Mis citas" }));
    await fireEvent.press(await screen.findByText(/Dermatología · \d\d:\d\d/));
    expect(await screen.findByText("Detalle de cita")).toBeTruthy();
    expect(screen.getByText("Reserva directa")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Volver"));
    await fireEvent.press(await screen.findByText("Pasadas"));
    expect(await screen.findByText("No asistió")).toBeTruthy();
  });

  it("Avisos: lista con tipo y tiempo relativo", async () => {
    await montarApp();
    await fireEvent.press(screen.getByRole("tab", { name: "Avisos" }));
    expect(await screen.findByText("Notificaciones")).toBeTruthy();
    expect(screen.getByText("Cupo disponible")).toBeTruthy();
    expect(screen.getByText("ahora")).toBeTruthy();
    expect(screen.getByText("Recordatorio")).toBeTruthy();
  });

  it("Perfil: datos personales y preferencias", async () => {
    await montarApp();
    await fireEvent.press(screen.getByRole("tab", { name: "Perfil" }));
    await fireEvent.press(await screen.findByText("Datos personales"));
    expect(await screen.findByText("laura@example.com")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Volver"));
    await fireEvent.press(await screen.findByText("Preferencias"));
    expect(await screen.findByText("10 km")).toBeTruthy();
    expect(screen.getByText("Odontología")).toBeTruthy();
  });
});

describe("Regresiones", () => {
  it("tras aceptar, el aviso queda resuelto: sin badge y con el mensaje correcto", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByText("Ver oferta"));
    await fireEvent.press(await screen.findByText("Aceptar cupo"));
    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    // Ni Ofertas ni Avisos tienen badge.
    expect(screen.queryByText("1")).toBeNull();

    await fireEvent.press(screen.getByRole("tab", { name: "Avisos" }));
    await fireEvent.press(await screen.findByText("Odontología hoy"));
    expect(await screen.findByText("Ya aceptaste esta oferta")).toBeTruthy();
    expect(screen.queryByText("Este cupo ya se ofreció a otro paciente.")).toBeNull();
  });

  it("el badge de Avisos baja al leer el aviso", async () => {
    await montarApp();
    await fireEvent.press(screen.getByRole("tab", { name: "Avisos" }));
    expect(screen.getAllByText("1")).toHaveLength(2);

    await fireEvent.press(await screen.findByText("Odontología hoy"));
    await fireEvent.press(screen.getByLabelText("Volver"));

    expect(await screen.findByText("Laura Escobar")).toBeTruthy();
    // Queda solo el badge de Ofertas (la oferta sigue pendiente).
    expect(screen.getAllByText("1")).toHaveLength(1);
  });
});
