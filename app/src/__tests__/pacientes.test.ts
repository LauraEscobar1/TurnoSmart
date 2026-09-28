import AsyncStorage from "@react-native-async-storage/async-storage";
import * as auth from "@/services/authService";
import {
  actualizarPacienteRemoto,
  filaDesdeCambios,
  getPacienteRemoto,
  pacienteDesdeFila,
  FilaPaciente,
} from "@/services/pacientesService";
import { CUENTA_DEMO } from "@/data/mockData";
import { reiniciarDatos } from "@/test-utils/app";
import {
  abrirSesionFalsa,
  filaPacienteFalsa,
  idUsuarioFalso,
  insertsIntentados,
  registrarUsuarioFalso,
  idEspecialidadFalsa,
  simularPacientesCaido,
  tablaFalsa,
} from "@/test-utils/supabaseFalso";

beforeEach(async () => {
  await reiniciarDatos();
  jest.restoreAllMocks();
});

const filaCompleta: FilaPaciente = {
  nombre: "Laura",
  apellido: "Castro",
  cedula: "1020304050",
  telefono: "+57 300 123 4567",
  franja_preferida: "Tarde",
  distancia_max_km: 10,
  notificaciones_activas: true,
  registrado_en: "2026-08-24T15:30:00+00:00",
  fecha_nacimiento: "1994-03-07",
  ciudad: "Medellín",
  eps: "Sanitas",
  contacto_emergencia_nombre: "Ana Castro",
  contacto_emergencia_telefono: "+57 311 000 1111",
};

/** Demo con sesión abierta; devuelve su id. */
function entrarComoDemo() {
  abrirSesionFalsa(CUENTA_DEMO.email);
  return idUsuarioFalso(CUENTA_DEMO.email)!;
}

describe("pacientesService — conversiones", () => {
  it("convierte una fila de Supabase en los campos de Paciente", () => {
    expect(pacienteDesdeFila(filaCompleta)).toEqual({
      nombre: "Laura",
      apellido: "Castro",
      cedula: "1020304050",
      telefono: "+57 300 123 4567",
      franjaPreferida: "Tarde",
      distanciaMaxKm: 10,
      notificacionesActivas: true,
      registradoEnISO: "2026-08-24T15:30:00.000Z",
      fechaNacimiento: "1994-03-07",
      ciudad: "Medellín",
      eps: "Sanitas",
      contactoEmergencia: { nombre: "Ana Castro", telefono: "+57 311 000 1111" },
    });
  });

  it("los campos opcionales NULL pasan a undefined", () => {
    const p = pacienteDesdeFila({
      ...filaCompleta,
      distancia_max_km: null,
      fecha_nacimiento: null,
      ciudad: null,
      eps: null,
      contacto_emergencia_nombre: null,
      contacto_emergencia_telefono: null,
    });
    expect(p.distanciaMaxKm).toBeNull(); // «Sin límite», como en la app
    expect(p.fechaNacimiento).toBeUndefined();
    expect(p.ciudad).toBeUndefined();
    expect(p.eps).toBeUndefined();
    expect(p.contactoEmergencia).toBeUndefined();
  });

  it("al actualizar pasa de camelCase a snake_case solo las columnas permitidas", () => {
    expect(
      filaDesdeCambios({
        franjaPreferida: "Mañana",
        distanciaMaxKm: 3,
        notificacionesActivas: false,
        fechaNacimiento: "1994-03-07",
        ciudad: "Cali",
        eps: undefined, // vaciado en el formulario → NULL
        contactoEmergencia: { nombre: "Ana", telefono: "+57 311" },
        // Nada de esto va a `pacientes`:
        id: "otro",
        nombre: "X",
        apellido: "Y",
        cedula: "1",
        email: "x@x.com",
        telefono: "1",
        registradoEnISO: "2020-01-01T00:00:00.000Z",
        fotoUri: "file:///foto.jpg",
        especialidadesInteres: ["Pediatría"],
        puestoEspera: 1,
      })
    ).toEqual({
      franja_preferida: "Mañana",
      distancia_max_km: 3,
      notificaciones_activas: false,
      fecha_nacimiento: "1994-03-07",
      ciudad: "Cali",
      eps: null,
      contacto_emergencia_nombre: "Ana",
      contacto_emergencia_telefono: "+57 311",
    });
    expect(filaDesdeCambios({ contactoEmergencia: undefined })).toEqual({
      contacto_emergencia_nombre: null,
      contacto_emergencia_telefono: null,
    });
  });
});

describe("pacientesService — Supabase (RLS)", () => {
  it("lee y actualiza la fila propia", async () => {
    const id = entrarComoDemo();
    expect(await getPacienteRemoto(id)).toMatchObject({ nombre: "Martín", ciudad: "Bogotá", eps: "Sura EPS" });

    await actualizarPacienteRemoto(id, { ciudad: "Cali", distanciaMaxKm: 3, nombre: "Otro", fotoUri: "file:///f.jpg" });
    expect(filaPacienteFalsa(id)).toMatchObject({ ciudad: "Cali", distancia_max_km: 3, nombre: "Martín" });
    expect(filaPacienteFalsa(id)).not.toHaveProperty("foto_path");
    expect(insertsIntentados).toEqual([]);
  });

  it("un paciente no puede leer ni actualizar la fila de otro", async () => {
    const otro = registrarUsuarioFalso("otra@correo.com", "segura123", {
      nombre: "Otra",
      apellido: "Persona",
      cedula: "999888777",
      telefono: "+57 300",
      franjaPreferida: "Mañana",
      notificacionesActivas: false,
    })!;
    entrarComoDemo();

    expect(await getPacienteRemoto(otro)).toBeNull();
    await actualizarPacienteRemoto(otro, { ciudad: "Pasto" });
    expect(filaPacienteFalsa(otro)?.ciudad).toBeUndefined();

    // Sin sesión, tampoco la propia.
    await auth.cerrarSesion();
    expect(await getPacienteRemoto(idUsuarioFalso(CUENTA_DEMO.email)!)).toBeNull();
  });

  it("propaga los errores de Supabase", async () => {
    const id = entrarComoDemo();
    simularPacientesCaido(true);
    await expect(getPacienteRemoto(id)).rejects.toThrow("Network request failed");
    await expect(actualizarPacienteRemoto(id, { ciudad: "Cali" })).rejects.toThrow("Network request failed");
  });
});

describe("Perfil del paciente: metadata → local → pacientes", () => {
  it("la fila de pacientes gana en las columnas que tiene", async () => {
    const id = idUsuarioFalso(CUENTA_DEMO.email)!;
    // En la base: otra ciudad y un teléfono actualizado; la EPS vaciada.
    Object.assign(filaPacienteFalsa(id)!, { ciudad: "Medellín", telefono: "+57 310 000 0000", eps: null });

    const p = await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    expect(p).toMatchObject({ ciudad: "Medellín", telefono: "+57 310 000 0000", nombre: "Martín" });
    expect(p.eps).toBeUndefined(); // NULL en la base borra el valor de metadata/local
    expect(p.id).toBe(id);
    expect(p.email).toBe(CUENTA_DEMO.email);
  });

  it("la foto queda local; especialidades y puesto vienen de la lista de espera real; lo demás, de pacientes", async () => {
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    const id = idUsuarioFalso(CUENTA_DEMO.email)!;
    await auth.actualizarPaciente(CUENTA_DEMO.email, {
      fotoUri: "file:///foto.jpg",
      especialidadesInteres: ["Cardiología", "Pediatría"],
      puestoEspera: 5,
      ciudad: "Cali",
      franjaPreferida: "Mañana",
      notificacionesActivas: false,
    });

    const fila = filaPacienteFalsa(id)!;
    expect(fila).toMatchObject({ ciudad: "Cali", franja_preferida: "Mañana", notificaciones_activas: false });
    // Las especialidades van a solicitudes_espera: Pediatría entra, Dermatología queda retirada (historial).
    const solicitudes = tablaFalsa("solicitudes_espera").filter((s) => s.paciente_id === id);
    expect(solicitudes.filter((s) => s.estado === "activa").map((s) => s.especialidad_id).sort()).toEqual(
      [idEspecialidadFalsa("Cardiología"), idEspecialidadFalsa("Pediatría")].sort()
    );
    expect(solicitudes.find((s) => s.especialidad_id === idEspecialidadFalsa("Dermatología"))).toMatchObject({
      estado: "retirada",
    });
    expect(Object.keys(fila)).not.toEqual(expect.arrayContaining(["foto_path"]));
    expect(JSON.stringify(fila)).not.toContain("file:///foto.jpg");
    expect(JSON.stringify(fila)).not.toContain("Pediatría");

    // Al volver a entrar, la foto sigue local y lo demás viene de la base. El
    // puesto (5, pedido desde la app) se ignora: en Pediatría no espera nadie → 1.
    await auth.cerrarSesion();
    const p = await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    expect(p).toMatchObject({
      fotoUri: "file:///foto.jpg",
      especialidadesInteres: ["Cardiología", "Pediatría"],
      puestoEspera: 1,
      ciudad: "Cali",
      franjaPreferida: "Mañana",
      notificacionesActivas: false,
    });
  });

  it("si Supabase falla, el ingreso y la edición siguen con el perfil local", async () => {
    const aviso = jest.spyOn(console, "warn").mockImplementation(() => {});
    await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    const id = idUsuarioFalso(CUENTA_DEMO.email)!;
    simularPacientesCaido(true);

    // Editar no rompe: el cambio queda en el teléfono.
    await expect(auth.actualizarPaciente(CUENTA_DEMO.email, { ciudad: "Pasto" })).resolves.toMatchObject({ ciudad: "Pasto" });
    expect(filaPacienteFalsa(id)?.ciudad).toBe("Bogotá");

    // Reingresar sin la base: metadata + perfil local.
    await auth.cerrarSesion();
    const p = await auth.iniciarSesion(CUENTA_DEMO.email, CUENTA_DEMO.password);
    expect(p).toMatchObject({ nombre: "Martín", ciudad: "Pasto" });
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("[pacientes]"));
    expect(await AsyncStorage.getItem("ts.perfiles")).toContain("Pasto");
  });
});
