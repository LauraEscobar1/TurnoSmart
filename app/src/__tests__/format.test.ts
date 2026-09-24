import { dia, diaRelativo, fechaConDia, fechaCorta, haceCuanto, hora, mes, mmss } from "@/utils/format";

describe("utils/format", () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(2026, 8, 23, 9, 41) }); // 23 sep 2026, 09:41
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  const iso = (d: number, h = 15, m = 40, month = 8) => new Date(2026, month, d, h, m).toISOString();

  it("formatea la hora en 24 h con ceros", () => {
    expect(hora(iso(23, 15, 40))).toBe("15:40");
    expect(hora(iso(23, 9, 5))).toBe("09:05");
  });

  it("devuelve el día con dos dígitos y el mes abreviado", () => {
    expect(dia(iso(8, 11, 15, 9))).toBe("08");
    expect(mes(iso(8, 11, 15, 9))).toBe("oct");
    expect(fechaCorta(iso(8, 11, 15, 9))).toBe("8 oct");
  });

  it("usa Hoy / Mañana para fechas cercanas", () => {
    expect(diaRelativo(iso(23))).toBe("Hoy");
    expect(diaRelativo(iso(24))).toBe("Mañana");
    expect(diaRelativo(iso(30))).toBe("30 sep");
    expect(fechaConDia(iso(23))).toBe("Hoy, 23 sep");
    expect(fechaConDia(iso(30))).toBe("30 sep");
  });

  it("marca los avisos con tiempo relativo corto", () => {
    expect(haceCuanto(new Date(2026, 8, 23, 9, 41).toISOString())).toBe("ahora");
    expect(haceCuanto(new Date(2026, 8, 23, 9, 29).toISOString())).toBe("hace 12 min");
    expect(haceCuanto(new Date(2026, 8, 23, 7, 0).toISOString())).toBe("07:00");
    expect(haceCuanto(new Date(2026, 8, 22, 20, 0).toISOString())).toBe("ayer");
    expect(haceCuanto(new Date(2026, 8, 18, 10, 0).toISOString())).toBe("18 sep");
  });

  it("formatea el contador como mm:ss y nunca negativo", () => {
    expect(mmss(459)).toBe("07:39");
    expect(mmss(0)).toBe("00:00");
    expect(mmss(-5)).toBe("00:00");
  });
});
