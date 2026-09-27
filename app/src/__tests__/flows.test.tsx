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

const AVISO_CUPO = "Ver oferta";

describe("Home", () => {
  it("tablero: saludo, oferta, próxima cita, lista de espera, avisos y una sola barra de navegación", async () => {
    await montarApp();
    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
    expect(screen.getByText("Tenés una oferta de cupo esperando respuesta.")).toBeTruthy();
    // Sin segunda barra de navegación arriba: ni accesos rápidos ni indicador de sección.
    expect(screen.queryByRole("button", { name: "Buscar especialista" })).toBeNull();
    expect(screen.queryByText(/\/ 5 · deslizá/)).toBeNull();
    expect(screen.getByText("Oferta para vos")).toBeTruthy();
    expect(screen.getByText("Ver oferta")).toBeTruthy();
    // Próxima cita: especialidad → fecha → especialista → consultorio → estado.
    expect(screen.getByText("Próxima cita")).toBeTruthy();
    expect(screen.getByText("Dermatología")).toBeTruthy();
    expect(screen.getByText("Dr. J. Peralta")).toBeTruthy();
    expect(screen.getByText("Confirmada")).toBeTruthy();
    // Lista de espera: puesto 3 → 2 personas antes.
    expect(screen.getByText("2 personas antes que vos. Te avisamos cuando se libere un cupo.")).toBeTruthy();
    // Notificaciones recientes: las 2 sin leer.
    expect(screen.getByText("Notificaciones recientes")).toBeTruthy();
    expect(screen.getByText("Recordatorio de cita")).toBeTruthy();

    for (const tab of ["Inicio", "Ofertas", "Mis citas", "Notificaciones", "Perfil"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeTruthy();
    }
    expect(screen.getByRole("tab", { name: "Inicio", selected: true })).toBeTruthy();
    // Badges: 1 oferta pendiente y 2 avisos sin leer.
    expect(screen.getByTestId("badge-Ofertas")).toHaveTextContent("2");
    expect(screen.getByTestId("badge-Notificaciones")).toHaveTextContent("2");
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

    // Mis citas abre en el día de la cita nueva (hoy), recuperada de un cupo.
    expect(await screen.findByText("Cardiología")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Mis citas", selected: true })).toBeTruthy();
    expect(screen.getByText("Cupo recuperado")).toBeTruthy();
    expect(screen.getAllByText("Confirmada")).toHaveLength(1);
  });

  it("Rechazar muestra el estado terminal en contorno y vuelve al inicio", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByText("Ver oferta"));
    await fireEvent.press(await screen.findByText("Rechazar"));

    expect(await screen.findByText("Oferta rechazada")).toBeTruthy();
    await fireEvent.press(screen.getByText("Volver al inicio"));

    // De vuelta en Inicio queda la otra oferta pendiente.
    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
    expect(screen.getByTestId("badge-Ofertas")).toHaveTextContent("1");
  });

  it("el aviso abre el detalle y el back va a Home", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Notificaciones" }));
    await fireEvent.press(await screen.findByText(AVISO_CUPO));
    expect(await screen.findByText("Tiempo para responder")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Volver"));
    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
  });
});

describe("Secciones", () => {
  it("Ofertas: lo pendiente como protagonista, historial compacto con filtros y ayuda colapsable", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Ofertas" }));
    expect(await screen.findByText("Ofertas para vos")).toBeTruthy();
    expect(screen.getByText("2 ofertas requieren tu respuesta")).toBeTruthy();
    // Cada pendiente: especialidad, fecha, hora, especialista, consultorio, estado y acciones.
    expect(screen.getAllByText("Esperando tu respuesta")).toHaveLength(2);
    expect(screen.getByText("Dra. Lucía Méndez")).toBeTruthy();
    expect(screen.getByText("Consultorio 1C")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Aceptar cupo" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Ver detalles" })).toHaveLength(2);

    // Historial: todas, y filtrado por estado.
    expect(screen.getByText("Clínica médica")).toBeTruthy();
    expect(screen.getByText("Traumatología")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Canceladas" }));
    expect(screen.getByText("Traumatología")).toBeTruthy();
    expect(screen.queryByText("Clínica médica")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Expiradas" }));
    expect(screen.getByText("Clínica médica")).toBeTruthy();
    expect(screen.queryByText("Traumatología")).toBeNull();

    // Ayuda colapsable.
    expect(screen.queryByText(/Cuando alguien cancela una cita/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: /¿Cómo funcionan las ofertas\?/ }));
    expect(screen.getByText(/Cuando alguien cancela una cita/)).toBeTruthy();

    // «Ver detalles» abre el detalle con el contador.
    await fireEvent.press(screen.getAllByRole("button", { name: "Ver detalles" })[0]);
    expect(await screen.findByText("Tiempo para responder")).toBeTruthy();
  });

  it("Ofertas: «Aceptar cupo» desde la lista confirma en un toque y, sin pendientes, muestra el vacío", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Ofertas" }));
    await fireEvent.press((await screen.findAllByRole("button", { name: "Aceptar cupo" }))[0]);
    expect(await screen.findByText("Cupo confirmado")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    await fireEvent.press(screen.getByRole("tab", { name: "Ofertas" }));
    expect(await screen.findByText("1 oferta requiere tu respuesta")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Ver detalles" }));
    await fireEvent.press(await screen.findByText("Rechazar"));
    await fireEvent.press(await screen.findByText("Volver al inicio"));

    await fireEvent.press(await screen.findByRole("tab", { name: "Ofertas" }));
    expect(await screen.findByText("No hay nuevas ofertas por ahora")).toBeTruthy();
    expect(screen.getByText("Te avisaremos cuando encontremos un cupo que pueda interesarte.")).toBeTruthy();
  });

  it("Mis citas: calendario, citas del día elegido, Próximas / Pasadas y detalle", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Mis citas" }));

    // Abre en el primer día con citas.
    expect(await screen.findByText("Dermatología")).toBeTruthy();
    expect(screen.getByText("1 cita")).toBeTruthy();

    // Un día sin citas muestra el vacío y lleva a la cita más cercana.
    const hoy = screen.getAllByRole("button").find((b) => b.props.accessibilityState?.selected === false)!;
    await fireEvent.press(hoy);
    expect(await screen.findByText("Sin citas")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Ir a ese día" }));
    expect(await screen.findByText("Dermatología")).toBeTruthy();

    await fireEvent.press(screen.getByText("Dermatología"));
    expect(await screen.findByText("Detalle de cita")).toBeTruthy();
    expect(screen.getByText("Reserva directa")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Volver"));
    await fireEvent.press(await screen.findByRole("radio", { name: "Pasadas" }));
    expect(await screen.findByText("Asistida")).toBeTruthy();
  });

  it("Notificaciones: bandeja cronológica con un solo filtro y mensajes breves", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Notificaciones" }));
    expect(await screen.findByText("Marcar todo como leído")).toBeTruthy();
    // Solo el filtro «Todas»: sin categorías.
    expect(screen.getByText("Todas")).toBeTruthy();
    expect(screen.queryByText("Citas")).toBeNull();
    // Grupos cronológicos.
    for (const grupo of ["Hoy", "Ayer", "Esta semana", "Anteriores"]) expect(screen.getByText(grupo)).toBeTruthy();
    // La notificación es un mensaje, no la ficha del destino.
    expect(screen.getByText("Recordatorio de cita")).toBeTruthy();
    expect(
      screen.getByText(/^Hola, Martín\. Te recordamos que el .+ tienes una cita de Dermatología a las \d\d:\d\d con el Dr\. J\. Peralta, en el consultorio 1C\.$/)
    ).toBeTruthy();
    expect(screen.getByText(/^Hola, Martín\. Tenemos un cupo disponible que podría interesarte en Cardiología\./)).toBeTruthy();
    expect(screen.getByText(/^Ayer · \d\d:\d\d$/)).toBeTruthy();
    expect(screen.queryByText("Tiempo para responder")).toBeNull();

    // Tocar el cupo solo lo marca como leído; el destino se abre con «Ver oferta».
    await fireEvent.press(screen.getByText("Cupo disponible"));
    expect(screen.queryByText("Tiempo para responder")).toBeNull();
    expect(await screen.findAllByLabelText(/^Sin leer\./)).toHaveLength(1);

    // Marcar todo como leído.
    await fireEvent.press(screen.getByText("Marcar todo como leído"));
    await screen.findAllByLabelText(/^Cupo disponible\./);
    expect(screen.queryAllByLabelText(/^Sin leer\./)).toHaveLength(0);
    expect(screen.queryByText("Marcar todo como leído")).toBeNull();
  });

  it("Notificaciones: el recordatorio abre el detalle de la cita", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Notificaciones" }));
    await fireEvent.press(await screen.findByText("Recordatorio de cita"));
    expect(await screen.findByText("Especialista")).toBeTruthy();
    expect(screen.getByText("Cons. 1C")).toBeTruthy();
  });

  it("Perfil: datos, preferencias editables y cerrar sesión", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Perfil" }));
    expect(await screen.findByText("MA", { includeHiddenElements: true })).toBeTruthy();
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
    expect(await screen.findByRole("button", { name: "Empezar" })).toBeTruthy();
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

    // Ofertas baja de 2 a 1; Avisos baja de 2 a 1 (queda el recordatorio).
    expect(screen.getByTestId("badge-Ofertas")).toHaveTextContent("1");
    expect(screen.getByTestId("badge-Notificaciones")).toHaveTextContent("1");

    await fireEvent.press(screen.getByRole("tab", { name: "Notificaciones" }));
    await fireEvent.press(await screen.findByText(AVISO_CUPO));
    expect(await screen.findByText("Ya aceptaste esta oferta")).toBeTruthy();
    expect(screen.queryByText("Este cupo ya se ofreció a otro paciente.")).toBeNull();
  });

  it("el badge de Avisos baja al leer el aviso", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Notificaciones" }));
    expect(screen.getByTestId("badge-Notificaciones")).toHaveTextContent("2");

    await fireEvent.press(await screen.findByText(AVISO_CUPO));
    await fireEvent.press(screen.getByLabelText("Volver"));

    expect(await screen.findByText("Martín Ávila")).toBeTruthy();
    expect(screen.getByTestId("badge-Ofertas")).toHaveTextContent("2");
    expect(screen.getByTestId("badge-Notificaciones")).toHaveTextContent("1");
  });
});

describe("Inicio: acciones de cada sección", () => {
  it("«Sumar especialidad» abre la búsqueda y suma una especialidad a la lista de espera", async () => {
    await montarApp();
    await fireEvent.press(await screen.findByRole("button", { name: "Sumar especialidad" }));
    await fireEvent.changeText(await screen.findByLabelText("Especialidad"), "PEDIA");
    expect(screen.getByText("Pediatría")).toBeTruthy();
    expect(screen.queryByText("Cardiología")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Sumarme a Pediatría" }));
    expect(await screen.findByText("En tu lista de espera")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Volver"));
    await fireEvent.press(await screen.findByRole("tab", { name: "Perfil" }));
    // Especialidades en espera: 2 → 3.
    expect(await screen.findByText("3")).toBeTruthy();
  });

  it("sin oferta ni avisos nuevos muestra «Sin ofertas por ahora» y «Todo al día»", async () => {
    await montarApp();
    // Hay dos ofertas pendientes: se rechazan las dos.
    for (let i = 0; i < 2; i++) {
      await fireEvent.press(await screen.findByText("Ver oferta"));
      await fireEvent.press(await screen.findByText("Rechazar"));
      await fireEvent.press(await screen.findByText("Volver al inicio"));
    }

    expect(await screen.findByText("Sin ofertas por ahora")).toBeTruthy();
    expect(screen.getByText(/Alertas activas · 2 especialidades/)).toBeTruthy();
    // Queda el recordatorio sin leer; al leerlo, el Inicio queda «Todo al día».
    await fireEvent.press(screen.getByText("Recordatorio de cita"));
    // En la bandeja, tocar el recordatorio lo lee y abre la cita.
    await fireEvent.press(await screen.findByText("Recordatorio de cita"));
    await screen.findByText("Especialista");
    await fireEvent.press(screen.getByRole("tab", { name: "Inicio" }));
    expect(await screen.findByText("Todo al día")).toBeTruthy();
    expect(screen.getByText("No tenés notificaciones nuevas.")).toBeTruthy();
  });
});

describe("Detalle de cita", () => {
  async function abrirDetalle() {
    await montarApp();
    await fireEvent.press(await screen.findByRole("tab", { name: "Mis citas" }));
    await fireEvent.press(await screen.findByText("Dermatología"));
    await screen.findByText("Detalle de cita");
  }

  it("es una ficha completa: especialidad, fecha, hora, estado, especialista, lugar y reserva", async () => {
    await abrirDetalle();
    expect(screen.getByText("Especialista")).toBeTruthy();
    expect(screen.getByText("Dr. J. Peralta")).toBeTruthy();
    expect(screen.getByText("JP")).toBeTruthy(); // avatar con iniciales, sin inventar foto
    expect(screen.getByText("Lugar")).toBeTruthy();
    expect(screen.getByText("Cons. 1C")).toBeTruthy();
    expect(screen.getByText("Información de la reserva")).toBeTruthy();
    expect(screen.getByText("Reserva directa")).toBeTruthy();
    expect(screen.getByText("Confirmada")).toBeTruthy();
    expect(screen.getByText(/^[A-Z][a-zé]+, \d{1,2} de [a-z]+$/)).toBeTruthy(); // «Domingo, 11 de octubre»
    expect(screen.getByRole("button", { name: "Reprogramar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar cita" })).toBeTruthy();
  });

  it("Reprogramar: elegir un horario disponible actualiza la cita", async () => {
    await abrirDetalle();
    await fireEvent.press(screen.getByRole("button", { name: "Reprogramar" }));
    expect(await screen.findByText("Elegí un nuevo horario")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirmar nuevo horario" })).toBeDisabled();

    const horario = screen.getAllByRole("button").find((b) => /, 09:00$/.test(b.props.accessibilityLabel ?? ""))!;
    await fireEvent.press(horario);
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar nuevo horario" }));

    expect(await screen.findByText(/^Listo: tu cita quedó para el .+ a las 09:00\.$/)).toBeTruthy();
    expect(screen.getByText("09:00")).toBeTruthy();
  });

  it("Cancelar cita pide confirmación; al confirmar queda cancelada y sin acciones", async () => {
    await abrirDetalle();
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar cita" }));
    expect(await screen.findByText("¿Cancelar esta cita?")).toBeTruthy();

    // «Mantener cita» no cambia nada.
    await fireEvent.press(screen.getByRole("button", { name: "Mantener cita" }));
    expect(screen.getByText("Confirmada")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Cancelar cita" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Sí, cancelar cita" }));
    expect(await screen.findByText("Cancelada")).toBeTruthy();
    expect(screen.getByText(/Cancelaste esta cita/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reprogramar" })).toBeNull();
  });
});
