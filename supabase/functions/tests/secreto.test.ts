/**
 * Pruebas de Deno del secreto compartido entre la base y las Edge Functions.
 *   cd supabase/functions && deno test tests/
 */
import { assert, assertFalse } from "jsr:@std/assert@1";
import { mismoSecreto } from "../_shared/secreto.ts";

Deno.test("mismoSecreto: solo acepta el mismo valor completo", () => {
  assert(mismoSecreto("abc123", "abc123"));
  assertFalse(mismoSecreto("abc124", "abc123"));
  assertFalse(mismoSecreto("abc12", "abc123"));
  assertFalse(mismoSecreto("abc1234", "abc123"));
});

Deno.test("mismoSecreto: sin secreto recibido o sin secreto configurado, rechaza", () => {
  assertFalse(mismoSecreto(null, "abc123"));
  assertFalse(mismoSecreto("", "abc123"));
  assertFalse(mismoSecreto("abc123", undefined));
  assertFalse(mismoSecreto("", ""));
});
