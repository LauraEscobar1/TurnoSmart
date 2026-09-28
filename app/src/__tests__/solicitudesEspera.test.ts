import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSolicitudesActivas, SolicitudesEsperaError } from "@/services/solicitudesEsperaService";
import { CUENTA_DEMO } from "@/data/mockData";
import { reiniciarDatos } from "@/test-utils/app";
import {
  abrirSesionFalsa,
  agregarSolicitudFalsa,
  idEspecialidadFalsa,
  idUsuarioFalso,
  registrarUsuarioFalso,
  simularSolicitudesCaido,
  vaciarListasEspera,
} from "@/test-utils/supabaseFalso";

beforeEach(async () => {
  await reiniciarDatos();
  // Cada prueba arma su propia lista de espera desde cero.
  vaciarListasEspera();
});

/** Demo con sesión abierta; devuelve su id. */
function entrarComoDemo() {
  abrirSesionFalsa(CUENTA_DEMO.email);
  return idUsuarioFalso(CUENTA_DEMO.email)!;
}

function otroPaciente() {
  return registrarUsuarioFalso("otra@correo.com", "segura123", {
    nombre: "Otra",
    apellido: "Persona",
    cedula: "999888777",
    telefono: "+57 300",
    franjaPreferida: "Mañana",
    notificacionesActivas: false,
  })!;
}

describe("solicitudesEsperaService.getSolicitudesActivas", () => {
  it("devuelve las solicitudes activas del paciente actual, con el nombre de la especialidad", async () => {
    const id = entrarComoDemo();
    const cardio = agregarSolicitudFalsa({ pacienteId: id, especialidad: "Cardiología", creadaEn: "2026-08-24T10:00:00+00:00" });
    const derma = agregarSolicitudFalsa({ pacienteId: id, especialidad: "Dermatología", creadaEn: "2026-09-01T12:30:00+00:00" });

    expect(await getSolicitudesActivas(id)).toEqual([
      {
        id: cardio,
        especialidadId: idEspecialidadFalsa("Cardiología"),
        especialidad: "Cardiología",
        creadaEnISO: "2026-08-24T10:00:00.000Z",
      },
      {
        id: derma,
        especialidadId: idEspecialidadFalsa("Dermatología"),
        especialidad: "Dermatología",
        creadaEnISO: "2026-09-01T12:30:00.000Z",
      },
    ]);
  });

  it("convierte creada_en (con zona horaria) a creadaEnISO en UTC", async () => {
    const id = entrarComoDemo();
    agregarSolicitudFalsa({ pacienteId: id, especialidad: "Nutrición", creadaEn: "2026-09-10T08:15:00-05:00" });
    const [s] = await getSolicitudesActivas(id);
    expect(s.creadaEnISO).toBe("2026-09-10T13:15:00.000Z");
  });

  it("no devuelve solicitudes de otro paciente", async () => {
    const otro = otroPaciente();
    agregarSolicitudFalsa({ pacienteId: otro, especialidad: "Pediatría" });
    const id = entrarComoDemo();
    agregarSolicitudFalsa({ pacienteId: id, especialidad: "Cardiología" });

    // Ni pidiendo las propias aparecen las ajenas…
    expect((await getSolicitudesActivas(id)).map((s) => s.especialidad)).toEqual(["Cardiología"]);
    // …ni pidiendo directamente las del otro (RLS: paciente_id = auth.uid()).
    expect(await getSolicitudesActivas(otro)).toEqual([]);
  });

  it("ignora las solicitudes que ya no están activas", async () => {
    const id = entrarComoDemo();
    agregarSolicitudFalsa({ pacienteId: id, especialidad: "Cardiología", estado: "retirada" });
    agregarSolicitudFalsa({ pacienteId: id, especialidad: "Dermatología", estado: "atendida" });
    agregarSolicitudFalsa({ pacienteId: id, especialidad: "Nutrición" });

    expect((await getSolicitudesActivas(id)).map((s) => s.especialidad)).toEqual(["Nutrición"]);
  });

  it("paciente sin solicitudes: lista vacía", async () => {
    const id = entrarComoDemo();
    expect(await getSolicitudesActivas(id)).toEqual([]);
  });

  it("sin conexión propaga el error de Supabase", async () => {
    const id = entrarComoDemo();
    agregarSolicitudFalsa({ pacienteId: id, especialidad: "Cardiología" });
    simularSolicitudesCaido(true);

    const lectura = getSolicitudesActivas(id);
    await expect(lectura).rejects.toBeInstanceOf(SolicitudesEsperaError);
    await expect(lectura).rejects.toThrow("Network request failed");
  });

  it("no guarda nada en el teléfono", async () => {
    const id = entrarComoDemo();
    agregarSolicitudFalsa({ pacienteId: id, especialidad: "Cardiología" });
    await getSolicitudesActivas(id);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });
});
