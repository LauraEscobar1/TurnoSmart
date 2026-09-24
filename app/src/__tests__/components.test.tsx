import React from "react";
import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { Countdown, useCountdown } from "@/components/Countdown";
import { ExplainabilityPanel } from "@/components/ExplainabilityPanel";
import { AppointmentCard } from "@/components/AppointmentCard";
import { OfferCard } from "@/components/OfferCard";
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
    const etiquetas = screen.getAllByText(/^[A-E]$/).map((n) => n.props.children);
    expect(etiquetas).toEqual(["A", "B", "C", "D"]);
    expect(screen.queryByText("E")).toBeNull();
    expect(screen.getByText("Por qué te lo ofrecemos")).toBeTruthy();
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
  it("ancla la fecha a la izquierda y muestra el estado", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<AppointmentCard cita={cita} onPress={onPress} />);
    expect(screen.getByText("23")).toBeTruthy();
    expect(screen.getByText("sep")).toBeTruthy();
    expect(screen.getByText("Cardiología · 15:40")).toBeTruthy();
    expect(screen.getByText("Confirmada")).toBeTruthy();
    await user.press(screen.getByText("Cardiología · 15:40"));
    expect(onPress).toHaveBeenCalled();
  });

  it("las pasadas pierden la acción", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<AppointmentCard cita={cita} onPress={onPress} past />);
    // userEvent simula un toque real: solo responde un elemento tocable.
    await user.press(screen.getByText("Cardiología · 15:40"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("OfferCard", () => {
  const oferta: OfertaCupo = {
    id: "of-1",
    citaOrigenId: "c-0",
    especialidad: "Cardiología",
    profesional: "Dra. Elena Ruiz",
    consultorio: "Consultorio 4B",
    fechaHoraISO: new Date(Date.now() + 3_600_000).toISOString(),
    estado: "pendiente",
    expiraEnISO: new Date(Date.now() + 459_000).toISOString(),
    scorePrioridad: 0.87,
    factores: [],
  };

  it("versión completa: aceptar y rechazar en un toque, sin mostrar el score", async () => {
    const onAceptar = jest.fn();
    const onRechazar = jest.fn();
    await render(<OfferCard oferta={oferta} onAceptar={onAceptar} onRechazar={onRechazar} />);
    expect(screen.getByText("Oferta para vos")).toBeTruthy();
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

  it("al llegar a cero se marca como expirada y deshabilita las acciones", async () => {
    const onAceptar = jest.fn();
    await render(<OfferCard oferta={{ ...oferta, expiraEnISO: new Date(Date.now() + 1000).toISOString() }} onAceptar={onAceptar} />);
    await act(async () => { jest.advanceTimersByTime(2000); });
    expect(screen.getByText("Oferta expirada")).toBeTruthy();
    await fireEvent.press(screen.getByText("Aceptar cupo"));
    expect(onAceptar).not.toHaveBeenCalled();
  });
});
