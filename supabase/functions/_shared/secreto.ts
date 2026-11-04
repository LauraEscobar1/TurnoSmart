/**
 * TurnoSmart · Comparación del secreto compartido entre la base y las Edge
 * Functions (encabezado de las llamadas que hace pg_net). Recorre siempre
 * ambos valores completos: el tiempo no revela dónde está la diferencia.
 */
export function mismoSecreto(recibido: string | null, esperado: string | undefined): boolean {
  if (!recibido || !esperado) return false;
  const a = new TextEncoder().encode(recibido);
  const b = new TextEncoder().encode(esperado);
  let diferencia = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diferencia |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diferencia === 0;
}
