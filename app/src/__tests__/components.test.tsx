import React from "react";
import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { Countdown, useCountdown } from "@/components/Countdown";
import { ExplainabilityPanel } from "@/components/ExplainabilityPanel";
import { AppointmentCard } from "@/components/AppointmentCard";
import { OfferCard } from "@/components/OfferCard";
import { OfertaPendienteCard } from "@/components/OfertaPendienteCard";
import { Cita, OfertaCupo } from "@/types/domain";
import { Text } from "react-native";

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("Countdown", () => {
  it("muestra mm:ss y la etiqueta normal por encima de 2 minutos", async () => {
    await render(<Countdown segundos={459} size={26} caption="para responder" />);
    expect(screen.getByText("07:39")).toBeTruthy();
    expect(screen.getByText("para responder")).toBeTruthy();
  });

  it("cambia a «expira pronto» por debajo de 02:00", async () => {
    await render(<Countdown segundos={119} size={26} caption="para responder" />);
    expect(screen.getByText("01:59")).toBeTruthy();
    expect(screen.getByText("expira pronto")).toBeTruthy();
    expect(screen.queryByText("para responder")).toBeNull();
  });

  it("useCountdown descuenta cada segundo hasta cero", async () => {
    const expira = new Date(Date.now() + 3000).toISOString();
    function Probe() {
      return <Text>{useCountdown(expira)}</Text>;
    }
    await render(<Probe />);
    expect(screen.getByText("3")).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText("2")).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(screen.getByText("0")).toBeTruthy();
  });
});

describe("ExplainabilityPanel", () => {
  it("muestra máximo 4 factores ordenados por peso, con el dato a la derecha", async () => {
    await render(
      <ExplainabilityPanel
        factores={[
          { etiqueta: "C", valor: "c", peso: 0.3 },
          { etiqueta: "A", valor: "a", peso: 1 },
          { etiqueta: "E", valor: "e", peso: 0.1 },
          { etiqueta: "B", valor: "b", peso: 0.6 },
          { etiqueta: "D", valor: "d", peso: 0.2 },
        ]}
      />
    );
    // Un factor desconocido se muestra tal cual: «Etiqueta: valor».
    const etiquetas = screen.getAllByText(/^[A-E]: [a-e]$/).map((n) => n.props.children);
    expect(etiquetas).toEqual(["A: a", "B: b", "C: c", "D: d"]);
    expect(screen.queryByText("E: e")).toBeNull();
    expect(screen.getByText("Por qué te lo ofrecemos")).toBeTruthy();
  });

  const FACTORES_REALES = [
    { etiqueta: "Tiempo en espera", valor: "34 días", peso: 0.92 },
    { etiqueta: "Tu especialidad", valor: "Cardiología", peso: 1 },
    { etiqueta: "Horario preferido", valor: "Tarde", peso: 0.64 },
    { etiqueta: "Disponibilidad", valor: "Alertas activas", peso: 0.8 },
  ];
  // 15:00 en Colombia: coincide con «Tarde».
  const CUPO_TARDE = "2026-12-01T20:00:00.000Z";

  it("con la IA: «Por qué la IA te recomienda este turno» y la explicación real en lenguaje cercano", async () => {
    await render(<ExplainabilityPanel factores={FACTORES_REALES} estrategia="ai" fechaHoraISO={CUPO_TARDE} />);
    expect(screen.getByText("Por qué la IA te recomienda este turno")).toBeTruthy();
    expect(screen.getByText("Llevas 34 días en la lista de espera.")).toBeTruthy();
    expect(screen.getByText("Es la especialidad que estás esperando: Cardiología.")).toBeTruthy();
    expect(screen.getByText("Es en la tarde, tu horario preferido.")).toBeTruthy();
    expect(screen.getByText("Tienes las alertas activas, así que puedes responder a tiempo.")).toBeTruthy();
    expect(screen.getByLabelText("Llevas 34 días en la lista de espera.")).toBeTruthy();
    expect(screen.getByText(/no toma decisiones médicas/)).toBeTruthy();
  });

  it("con el respaldo determinista no menciona la IA", async () => {
    await render(<ExplainabilityPanel factores={FACTORES_REALES} estrategia="fallback" fechaHoraISO="2026-12-01T13:00:00.000Z" />);
    expect(screen.getByText("Por qué te lo ofrecemos")).toBeTruthy();
    // 08:00 en Colombia: no coincide con «Tarde», y se dice sin inventar.
    expect(screen.getByText("Tu horario preferido es tarde; revisa si este te sirve.")).toBeTruthy();
    expect(screen.queryByText(/\bIA\b/)).toBeNull();
  });
});

const cita: Cita = {
  id: "c-1",
  especialidad: "Cardiología",
  profesional: "Dra. Elena Ruiz",
  consultorio: "Consultorio 4B",
  fechaHoraISO: new Date(2026, 8, 23, 15, 40).toISOString(),
  estado: "confirmada",
  origen: "reserva-directa",
};

describe("AppointmentCard", () => {
  it("la versión compacta de Home ancla la fecha a la izquierda", async () => {
    await render(<AppointmentCard cita={cita} compact />);
    expect(screen.getByText("23")).toBeTruthy();
    expect(screen.getByText("sep")).toBeTruthy();
    expect(screen.getByText("Cardiología · 15:40")).toBeTruthy();
  });

  it("ancla la fecha a la izquierda y muestra el estado", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<AppointmentCard cita={cita} onPress={onPress} />);
    // Jerarquía: especialidad + hora → profesional → consultorio → estado.
    expect(screen.getByText("Cardiología")).toBeTruthy();
    expect(screen.getByText("15:40")).toBeTruthy();
    expect(screen.getByText("Dra. Elena Ruiz")).toBeTruthy();
    expect(screen.getByText("Consultorio 4B")).toBeTruthy();
    expect(screen.getByText("Confirmada")).toBeTruthy();
    await user.press(screen.getByText("Cardiología"));
    expect(onPress).toHaveBeenCalled();
  });

  it("las pasadas pierden la acción", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<AppointmentCard cita={cita} onPress={onPress} past />);
    // userEvent simula un toque real: solo responde un elemento tocable.
    await user.press(screen.getByText("Cardiología"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("OfferCard", () => {
  // Se arma dentro de cada prueba, ya con el reloj falso andando: así el
  // contador arranca exacto en 07:39 aunque el archivo tarde en cargar.
  let oferta: OfertaCupo;
  beforeEach(() => {
    oferta = {
      id: "of-1",
      citaOrigenId: "c-0",
      especialidad: "Cardiología",
      profesional: "Dra. Elena Ruiz",
      consultorio: "Consultorio 4B",
      fechaHoraISO: new Date(Date.now() + 3_600_000).toISOString(),
      estado: "pendiente",
      expiraEnISO: new Date(Date.now() + 459_000).toISOString(),
      factores: [],
      estrategia: "ai",
    };
  });

  it("versión completa: aceptar y rechazar en un toque, sin mostrar el score", async () => {
    const onAceptar = jest.fn();
    const onRechazar = jest.fn();
    await render(<OfferCard oferta={oferta} onAceptar={onAceptar} onRechazar={onRechazar} />);
    expect(screen.getByText("Recomendado por IA")).toBeTruthy();
    expect(screen.getByLabelText("Recomendado por la inteligencia artificial de TurnoSmart")).toBeTruthy();
    expect(screen.getByText("07:39")).toBeTruthy();
    await fireEvent.press(screen.getByText("Aceptar cupo"));
    await fireEvent.press(screen.getByText("Rechazar"));
    expect(onAceptar).toHaveBeenCalledTimes(1);
    expect(onRechazar).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/0[.,]87|87/)).toBeNull();
  });

  it("versión Home: abre el detalle con «Ver oferta» y abrevia al profesional", async () => {
    const onPress = jest.fn();
    await render(<OfferCard variant="home" oferta={oferta} onPress={onPress} />);
    expect(screen.getByText(/Dra\. E\. Ruiz/)).toBeTruthy();
    await fireEvent.press(screen.getByText("Ver oferta"));
    expect(onPress).toHaveBeenCalled();
  });

  it("priorizada con el respaldo: «Recomendado por TurnoSmart», sin mencionar la IA", async () => {
    await render(<OfferCard variant="home" oferta={{ ...oferta, estrategia: "fallback" }} onPress={jest.fn()} />);
    expect(screen.getByText("Recomendado por TurnoSmart")).toBeTruthy();
    expect(screen.queryByText(/\bIA\b/)).toBeNull();
  });

  it("pendiente en Ofertas: insignia y análisis del asistente solo con la IA", async () => {
    await render(<OfertaPendienteCard oferta={oferta} onAceptar={jest.fn()} onVerDetalles={jest.fn()} />);
    expect(screen.getByText("Recomendado por IA")).toBeTruthy();
    expect(
      screen.getByText("Tu asistente TurnoSmart analizó tu disponibilidad, especialidad y tiempo de espera, y encontró este turno para ti.")
    ).toBeTruthy();

    await render(<OfertaPendienteCard oferta={{ ...oferta, estrategia: "fallback" }} onAceptar={jest.fn()} onVerDetalles={jest.fn()} />);
    expect(screen.getByText("Recomendado por TurnoSmart")).toBeTruthy();
    expect(screen.getByText(/^TurnoSmart revisó tu disponibilidad/)).toBeTruthy();
    expect(screen.queryByText(/\bIA\b|asistente/)).toBeNull();
  });

  it("al llegar a cero se marca como expirada y deshabilita las acciones", async () => {
    const onAceptar = jest.fn();
    await render(<OfferCard oferta={{ ...oferta, expiraEnISO: new Date(Date.now() + 1000).toISOString() }} onAceptar={onAceptar} />);
    await act(async () => { jest.advanceTimersByTime(2000); });
    expect(screen.getByText("Oferta expirada")).toBeTruthy();
    await fireEvent.press(screen.getByText("Aceptar cupo"));
    expect(onAceptar).not.toHaveBeenCalled();
  });
});
