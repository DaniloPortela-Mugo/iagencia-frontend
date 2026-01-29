export type UUID = string;

export function asUuid(value: unknown): UUID | "" {
  if (typeof value !== "string") return "";
  const v = value.trim();
  // validação básica (não perfeita, mas evita lixo)
  const ok = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  return ok ? (v as UUID) : "";
}
