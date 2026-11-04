import { Alert } from "react-native";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as staffService from "@/services/staffService";
import { irALogin, montarApp, reiniciarDatos } from "@/test-utils/app";
import { abrirSesionFalsa, registrarStaffFalso, rpcLlamadas } from "@/test-utils/supabaseFalso";
import { getOfertasPendientes } from "@/services/offersService";
import { getNotificaciones } from "@/services/notificationsService";
import { getCitasProximas } from "@/services/appointmentsService";
import { CitaAgenda, CupoStaff, MetricasStaff, PerfilStaff } from "@/types/staff";

/**
 * Panel del staff: navegación por rol, métricas, agenda con riesgo,
 * acciones (registrar cancelación / inasistencia / actualizar riesgo), cupos y estados de
 * carga, error y vacío. El servicio del staff (RPC y Edge Function) se
 * reemplaza por dobles: la seguridad de esas RPC la prueba
 * supabase/pruebas/rls_staff.sql contra la base real.
 */
jest.mock("@/services/staffService");
const servicio = jest.mocked(staffService);

const STAFF = { email: "staff@clinica.test", password: "segura123" };
const HORA = 3_600_000;
const en = (horas: number) => new Date(Date.now() + horas * HORA).toISOString();

const perfil: PerfilStaff = { nombre: "Marta", email: STAFF.email, consultorios: [{ id: "c1", nombre: "Consultorio 4B" }] };
const metricas: MetricasStaff = {
  dias: 30,
  cancelaciones: 3,
  inasistencias: 1,
  cuposLiberados: 3,
  cuposRecuperados: 2,
  tasaRecuperacion: 2 / 3,
};
const citaConRiesgo: CitaAgenda = {
  id: "cita-alto",
  fechaHoraISO: en(30),
  especialidad: "Cardiología",
  profesional: "Dra. Ruiz",
  consultorio: "Consultorio 4B",
  origen: "reserva-directa",
  paciente: { iniciales: "CT", codigo: "P-1A2B3C" },
  riesgo: {
    nivel: "alto",
    puntaje: 0.7,
    estrategia: "ai",
    explicacion: { es: "Tres inasistencias en cinco citas previas.", en: "Three no-shows in five previous appointments." },
    calculadoEnISO: new Date().toISOString(),
  },
  asistenciaConfirmadaISO: null,
};
const citaSinRiesgo: CitaAgenda = {
  ...citaConRiesgo,
  id: "cita-nueva",
  fechaHoraISO: en(50),
  paciente: { iniciales: "JP", codigo: "P-9F8E7D" },
  riesgo: null,
};
const citaPasada: CitaAgenda = { ...citaSinRiesgo, id: "cita-pasada", fechaHoraISO: en(-2), paciente: { iniciales: "VR", codigo: "P-0C0C0C" } };
const cupos: CupoStaff[] = [
  {
    id: "cupo-1",
    fechaHoraISO: en(72),
    especialidad: "Cardiología",
    profesional: "Dra. Ruiz",
    motivo: "cancelacion",
    estado: "ofrecido",
    ofertas: [
      { estado: "expirada", creadaEnISO: en(-1), paciente: { iniciales: "DC", codigo: "P-111111" } },
      { estado: "pendiente", creadaEnISO: en(0), paciente: { iniciales: "JP", codigo: "P-9F8E7D" } },
    ],
  },
  { id: "cupo-2", fechaHoraISO: en(-48), especialidad: "Cardiología", profesional: "Dra. Ruiz", motivo: "cancelacion", estado: "tomado", ofertas: [] },
];

beforeEach(async () => {
  await reiniciarDatos();
  jest.clearAllMocks();
  servicio.getPerfilStaff.mockResolvedValue(perfil);
  servicio.getMetricas.mockResolvedValue(metricas);
  servicio.getAgenda.mockResolvedValue([citaConRiesgo, citaSinRiesgo, citaPasada]);
  servicio.getCupos.mockResolvedValue(cupos);
  servicio.calcularRiesgo.mockResolvedValue({ calculadas: 2, ai: 1, fallback: 1 });
  servicio.cancelarCitaStaff.mockResolvedValue(null);
  servicio.registrarInasistencia.mockResolvedValue();
  registrarStaffFalso(STAFF.email, STAFF.password);
});

async function abrirPanel() {
  abrirSesionFalsa(STAFF.email);
  await montarApp({ sesion: false });
  await screen.findByText("Panel del consultorio");
  await screen.findByText("Tasa de recuperación");
}

/** Pulsa el botón «Confirmar» del diálogo nativo de confirmación. */
async function confirmarDialogo(alerta: jest.SpyInstance) {
  const botones = alerta.mock.calls[alerta.mock.calls.length - 1][2] as { text: string; onPress?: () => void }[];
  await act(async () => {
    botones.find((b) => b.text === "Confirmar")?.onPress?.();
  });
}

describe("Navegación por rol", () => {
  it("el staff que inicia sesión ve el panel del consultorio, no la app del paciente", async () => {
    await montarApp({ sesion: false });
    await irALogin();
    await fireEvent.changeText(screen.getByLabelText("Correo electrónico"), STAFF.email);
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), STAFF.password);
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("Panel del consultorio")).toBeTruthy();
    expect(screen.getByText("Hola, Marta")).toBeTruthy();
    expect(screen.getByText("Consultorio 4B")).toBeTruthy();
    expect(screen.queryByText("Mis citas")).toBeNull();
    expect(servicio.getPerfilStaff).toHaveBeenCalledWith(STAFF.email);
  });

  it("con sesión de staff no se llama ninguna RPC del paciente (sin «paciente_inexistente»)", async () => {
    const aviso = jest.spyOn(console, "warn");
    await abrirPanel();
    // Aunque algo pida datos del paciente, los servicios ven que no hay paciente y no llaman a la base.
    expect(await getOfertasPendientes()).toEqual([]);
    expect(await getNotificaciones("")).toEqual([]);
    expect(await getCitasProximas()).toEqual([]);
    expect(rpcLlamadas).not.toContain("expirar_mis_ofertas");
    expect(aviso.mock.calls.flat().join(" ")).not.toMatch(/paciente_inexistente/);
  });

  it("sin consultorio asignado muestra el aviso y no pide datos", async () => {
    servicio.getPerfilStaff.mockResolvedValue(null);
    abrirSesionFalsa(STAFF.email);
    await montarApp({ sesion: false });
    expect(await screen.findByText("Tu usuario no tiene un consultorio asignado")).toBeTruthy();
    expect(servicio.getAgenda).not.toHaveBeenCalled();
  });

  it("cerrar sesión vuelve al acceso", async () => {
    await abrirPanel();
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
  });
});

describe("Métricas y agenda", () => {
  it("muestra las cuatro métricas de los últimos 30 días", async () => {
    await abrirPanel();
    expect(screen.getByText("Últimos 30 días")).toBeTruthy();
    expect(screen.getByLabelText("Cancelaciones: 3")).toBeTruthy();
    expect(screen.getByLabelText("Cupos liberados: 3")).toBeTruthy();
    expect(screen.getByLabelText("Cupos recuperados: 2")).toBeTruthy();
    expect(screen.getByLabelText("Tasa de recuperación: 67 %")).toBeTruthy();
  });

  it("cada cita muestra al paciente solo con iniciales y código, y su riesgo", async () => {
    await abrirPanel();
    expect(screen.getByText("Paciente CT · P-1A2B3C")).toBeTruthy();
    expect(screen.getByText("Riesgo alto")).toBeTruthy();
    expect(screen.getAllByText("Riesgo sin calcular")).toHaveLength(2);
    // Solo la cita cuya hora ya pasó permite marcar inasistencia; las futuras, registrar la cancelación.
    expect(screen.getAllByRole("button", { name: "Marcar inasistencia" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Registrar cancelación" })).toHaveLength(2);
    expect(screen.getAllByText("El paciente avisó por teléfono o en recepción")).toHaveLength(2);
    // El riesgo se calcula solo (pg_cron) y el panel lo explica.
    expect(screen.getByText(/El riesgo se calcula solo, cada 30 minutos, para las citas de los próximos 3 días/)).toBeTruthy();
  });

  it("al tocar el badge de riesgo se ve la explicación de la IA, y se oculta al tocarlo otra vez", async () => {
    await abrirPanel();
    expect(screen.queryByText("Tres inasistencias en cinco citas previas.")).toBeNull();
    const badge = screen.getByRole("button", { name: "Riesgo alto" });
    await fireEvent.press(badge);
    expect(screen.getByText("Tres inasistencias en cinco citas previas.")).toBeTruthy();
    expect(screen.getByText("Estimado con IA · Calculado ahora")).toBeTruthy();
    await fireEvent.press(badge);
    expect(screen.queryByText("Tres inasistencias en cinco citas previas.")).toBeNull();
  });

  it("muestra cuándo el paciente confirmó su asistencia", async () => {
    servicio.getAgenda.mockResolvedValue([{ ...citaConRiesgo, asistenciaConfirmadaISO: new Date().toISOString() }]);
    await abrirPanel();
    expect(screen.getByText("Confirmó asistencia")).toBeTruthy();
  });

  it("«Actualizar riesgo de la agenda» recalcula toda la agenda, informa IA/reglas y recarga", async () => {
    await abrirPanel();
    const llamadasAgenda = servicio.getAgenda.mock.calls.length;
    await fireEvent.press(screen.getByRole("button", { name: "Actualizar riesgo de la agenda" }));
    expect(await screen.findByText("Riesgo calculado para 2 citas: 1 con IA y 1 con reglas.")).toBeTruthy();
    expect(servicio.calcularRiesgo).toHaveBeenCalledWith(undefined);
    expect(servicio.getAgenda.mock.calls.length).toBeGreaterThan(llamadasAgenda);
  });

  it("«Actualizar riesgo» de una cita recalcula solo esa cita", async () => {
    servicio.calcularRiesgo.mockResolvedValue({ calculadas: 1, ai: 1, fallback: 0 });
    await abrirPanel();
    await fireEvent.press(screen.getAllByRole("button", { name: "Actualizar riesgo" })[0]);
    expect(await screen.findByText("Riesgo calculado para 1 cita: 1 con IA y 0 con reglas.")).toBeTruthy();
    expect(servicio.calcularRiesgo).toHaveBeenCalledWith("cita-alto");
  });

  it("si el cálculo falla avisa sin romper el panel", async () => {
    servicio.calcularRiesgo.mockRejectedValue(new Error("FunctionsHttpError"));
    await abrirPanel();
    await fireEvent.press(screen.getByRole("button", { name: "Actualizar riesgo de la agenda" }));
    expect(await screen.findByText("No se pudo actualizar el riesgo. Inténtalo de nuevo.")).toBeTruthy();
    expect(screen.getByText("Paciente CT · P-1A2B3C")).toBeTruthy();
  });

  it("«Registrar cancelación» pide confirmación, libera el cupo y muestra a quién se ofreció con IA", async () => {
    const alerta = jest.spyOn(Alert, "alert");
    servicio.cancelarCitaStaff.mockResolvedValue("cupo-1");
    await abrirPanel();
    await fireEvent.press(screen.getAllByRole("button", { name: "Registrar cancelación" })[0]);
    expect(alerta).toHaveBeenCalledWith("¿Registrar la cancelación?", expect.stringMatching(/por teléfono o en recepción/), expect.any(Array));
    expect(servicio.cancelarCitaStaff).not.toHaveBeenCalled();
    await confirmarDialogo(alerta);
    expect(
      await screen.findByText("Cancelación registrada. El cupo se liberó y se está ofreciendo con IA a la lista de espera…")
    ).toBeTruthy();
    expect(servicio.cancelarCitaStaff).toHaveBeenCalledWith("cita-alto");
    // El servidor ofrece el cupo unos segundos después: el panel lo sigue y muestra a quién.
    expect(
      await screen.findByText(
        "Cancelación registrada. El cupo se liberó y se ofreció a JP · P-9F8E7D de la lista de espera.",
        {},
        { timeout: 5000 }
      )
    ).toBeTruthy();
  });

  it("si nadie espera ese horario, avisa que el cupo quedó cerrado", async () => {
    const alerta = jest.spyOn(Alert, "alert");
    servicio.cancelarCitaStaff.mockResolvedValue("cupo-3");
    servicio.getCupos.mockResolvedValue([
      { id: "cupo-3", fechaHoraISO: en(30), especialidad: "Cardiología", profesional: "Dra. Ruiz", motivo: "cancelacion", estado: "expirado", ofertas: [] },
    ]);
    await abrirPanel();
    await fireEvent.press(screen.getAllByRole("button", { name: "Registrar cancelación" })[0]);
    await confirmarDialogo(alerta);
    expect(
      await screen.findByText(
        "Cancelación registrada. No hay pacientes en lista de espera para ese horario: el cupo quedó cerrado.",
        {},
        { timeout: 5000 }
      )
    ).toBeTruthy();
  });

  it("marcar inasistencia usa registrar_inasistencia; si falla, avisa", async () => {
    const alerta = jest.spyOn(Alert, "alert");
    await abrirPanel();
    await fireEvent.press(screen.getByRole("button", { name: "Marcar inasistencia" }));
    await confirmarDialogo(alerta);
    expect(await screen.findByText("Inasistencia registrada.")).toBeTruthy();
    expect(servicio.registrarInasistencia).toHaveBeenCalledWith("cita-pasada");

    servicio.registrarInasistencia.mockRejectedValueOnce(new Error("inasistencia_no_registrable"));
    await fireEvent.press(screen.getByRole("button", { name: "Marcar inasistencia" }));
    await confirmarDialogo(alerta);
    expect(await screen.findByText("No se pudo completar la acción. Inténtalo de nuevo.")).toBeTruthy();
  });
});

describe("Cupos", () => {
  it("lista los cupos con su estado y el de cada oferta", async () => {
    await abrirPanel();
    await fireEvent.press(screen.getByRole("radio", { name: "Cupos" }));
    expect(await screen.findByText("Oferta enviada")).toBeTruthy();
    expect(screen.getByText("Recuperado")).toBeTruthy();
    expect(screen.getByText("1. DC · P-111111")).toBeTruthy();
    expect(screen.getByText("Expirada")).toBeTruthy();
    expect(screen.getByText("Pendiente")).toBeTruthy();
    expect(screen.getByText("Sin ofertas todavía")).toBeTruthy();
  });

  it("sin cupos muestra el estado vacío", async () => {
    servicio.getCupos.mockResolvedValue([]);
    await abrirPanel();
    await fireEvent.press(screen.getByRole("radio", { name: "Cupos" }));
    expect(await screen.findByText("Todavía no hay cupos liberados")).toBeTruthy();
  });
});

describe("Carga, error y vacío", () => {
  it("muestra el error de carga y se recupera con «Reintentar»", async () => {
    servicio.getMetricas.mockRejectedValueOnce(new Error("Network request failed"));
    abrirSesionFalsa(STAFF.email);
    await montarApp({ sesion: false });
    expect(await screen.findByText("No pudimos cargar el panel.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Paciente CT · P-1A2B3C")).toBeTruthy();
  });

  it("sin citas próximas muestra el estado vacío y no permite actualizar el riesgo", async () => {
    servicio.getAgenda.mockResolvedValue([]);
    await abrirPanel();
    expect(screen.getByText("No hay citas próximas")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Actualizar riesgo de la agenda" })).toBeDisabled();
  });

  it("muestra el panel en inglés al cambiar el idioma", async () => {
    await abrirPanel();
    await fireEvent.press(screen.getByRole("button", { name: "Ajustes" }));
    await fireEvent.press(await screen.findByRole("radio", { name: "English" }));
    await waitFor(() => expect(screen.getByText("Clinic dashboard")).toBeTruthy());
    await fireEvent.press(screen.getByRole("button", { name: "High risk" }));
    expect(screen.getByText("Three no-shows in five previous appointments.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Record cancellation" })).toHaveLength(2);
    expect(screen.getByText("Recovery rate")).toBeTruthy();
  });
});
