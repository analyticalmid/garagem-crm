export function normalizeLeadPhone(value: string | null | undefined): string {
  if (!value) return "";

  const withoutSuffix = value.split("@")[0] ?? "";
  return withoutSuffix.replace(/\D/g, "");
}