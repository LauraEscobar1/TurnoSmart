import { act, fireEvent, screen } from "@testing-library/react-native";
import { montarApp, reiniciarDatos } from "@/test-utils/app";

/**
 * Flujos de punta a punta sobre el navegador real, con la sesión de la
 * cuenta demo (Martín Ávila) ya abierta.
 */

beforeEach(async () => {
  await reiniciarDatos();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

const AVISO_CUPO = /^Cardiología hoy \d\d:\d\d$/;

describe("Home", () => {
  it("muestra saludo, oferta activa, próxima cita, lista de espera y la barra de 5 destinos", async () => {
    await montarApp();
    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
    expect(screen.getByText("Oferta para vos")).toBeTruthy();
    expect(screen.getByText("Ver oferta")).toBeTruthy();
    expect(screen.getByText("Próxima cita confirmada")).toBeTruthy();
    expect(screen.getByText(/Dermatología · \d\d:\d\d/)).toBeTruthy();
    expect(screen.getByText("34 días · puesto 3")).toBeTruthy();

    for (const tab of ["Inicio", "Ofertas", "Mis citas", "Avisos", "Perfil"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeTruthy();
    }
    expect(screen.getByRole("tab", { name: "Inicio", selected: true })).toBeTruthy();
    // Badges: 1 oferta pendiente y 2 avisos sin leer.
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
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

    expect(await screen.findByText(/Cardiología · \d\d:\d\d/)).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Mis citas", selected: true })).toBeTruthy();
    expect(screen.getAllByText("Confirmada")).toHaveLength(2);
  });

  it("Rechazar muestra el estado terminal en contorno y vuelve al inicio", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByText("Ver oferta"));
    await fireEvent.press(await screen.findByText("Rechazar"));

    expect(await screen.findByText("Oferta rechazada")).toBeTruthy();
    await fireEvent.press(screen.getByText("Volver al inicio"));

    expect(await screen.findByText("Sin ofertas por ahora")).toBeTruthy();
  });

  it("el aviso abre el detalle y el back va a Home", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Avisos" }));
    await fireEvent.press(await screen.findByText(AVISO_CUPO));
    expect(await screen.findByText("Tiempo para responder")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Volver"));
    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
  });
});

describe("Secciones", () => {
  it("Ofertas: pendiente de respuesta arriba e historial atenuado", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Ofertas" }));
    expect(await screen.findByText("Pendiente de respuesta · 1")).toBeTruthy();
    expect(screen.getByText("2 / 5 · deslizá")).toBeTruthy();
    expect(screen.getByText("Clínica médica")).toBeTruthy();
    expect(screen.getByText("Expirada")).toBeTruthy();
    expect(screen.getByText("Aceptada")).toBeTruthy();

    await fireEvent.press(screen.getByText("Cardiología"));
    expect(await screen.findByText("Tiempo para responder")).toBeTruthy();
  });

  it("Mis citas: control segmentado Próximas / Pasadas y detalle", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Mis citas" }));
    await fireEvent.press(await screen.findByText(/Dermatología · \d\d:\d\d/));
    expect(await screen.findByText("Detalle de cita")).toBeTruthy();
    expect(screen.getByText("Reserva directa")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Volver"));
    await fireEvent.press(await screen.findByRole("radio", { name: "Pasadas" }));
    expect(await screen.findByText("Asistida")).toBeTruthy();
  });

  it("Avisos: lista con tipo y tiempo relativo", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Avisos" }));
    expect(await screen.findByText("Notificaciones")).toBeTruthy();
    expect(screen.getByText("Cupo disponible")).toBeTruthy();
    expect(screen.getByText("ahora")).toBeTruthy();
    expect(screen.getByText("Recordatorio")).toBeTruthy();
    expect(screen.getByText("ayer")).toBeTruthy();
    expect(screen.getByText("Cupo aceptado · Nutrición")).toBeTruthy();
  });

  it("Perfil: datos, preferencias editables y cerrar sesión", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Perfil" }));
    expect(await screen.findByText("MA")).toBeTruthy();
    expect(screen.getByText("Tarde")).toBeTruthy();
    expect(screen.getByText("Activadas")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Datos personales"));
    expect(await screen.findByText("35.482.910")).toBeTruthy();
    expect(screen.getByText("OSDE 310")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Volver"));

    await fireEvent.press(await screen.findByText("Franja preferida"));
    await fireEvent.press(await screen.findByRole("radio", { name: "Mañana" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Nutrición" }));
    await fireEvent.press(screen.getByText("Guardar"));
    expect(await screen.findByText("Mañana")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy(); // especialidades en espera

    await fireEvent.press(screen.getByText("Cerrar sesión"));
    expect(await screen.findByText("Bienvenido\nde nuevo")).toBeTruthy();
  });
});

describe("Regresiones", () => {
  it("tras aceptar, el aviso queda resuelto: badges al día y mensaje correcto", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByText("Ver oferta"));
    await fireEvent.press(await screen.findByText("Aceptar cupo"));
    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    // Ofertas ya no tiene badge; Avisos baja de 2 a 1 (queda el recordatorio).
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.queryByText("2")).toBeNull();

    await fireEvent.press(screen.getByRole("tab", { name: "Avisos" }));
    await fireEvent.press(await screen.findByText(AVISO_CUPO));
    expect(await screen.findByText("Ya aceptaste esta oferta")).toBeTruthy();
    expect(screen.queryByText("Este cupo ya se ofreció a otro paciente.")).toBeNull();
  });

  it("el badge de Avisos baja al leer el aviso", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Avisos" }));
    expect(screen.getByText("2")).toBeTruthy();

    await fireEvent.press(await screen.findByText(AVISO_CUPO));
    await fireEvent.press(screen.getByLabelText("Volver"));

    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
    expect(screen.queryByText("2")).toBeNull();
    expect(screen.getAllByText("1")).toHaveLength(2); // Ofertas 1 y Avisos 1
  });
});
