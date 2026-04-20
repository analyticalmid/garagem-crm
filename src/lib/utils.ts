import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Remove o sufixo @s.whatsapp.net do número de telefone
 */
export function cleanWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/@s\.whatsapp\.net$/i, "");
}

/**
 * Formata número brasileiro para exibição: +55 (67) 99313-1377
 */
export function formatBrazilianPhone(phone: string | null | undefined): string {
  const cleaned = cleanWhatsAppNumber(phone);
  if (!cleaned) return "";
  
  // Remover caracteres não numéricos
  const digits = cleaned.replace(/\D/g, "");
  
  // Formato brasileiro: 55 + DDD (2) + número (8 ou 9 dígitos)
  if (digits.length === 13) {
    // 55 67 9 9313 1377
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 5)}${digits.slice(5, 9)}-${digits.slice(9)}`;
  } else if (digits.length === 12) {
    // 55 67 9313 1377 (sem o 9 extra)
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  } else if (digits.length === 11) {
    // Sem código do país: 67 9 9313 1377
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}${digits.slice(3, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    // Sem código do país e sem 9: 67 9313 1377
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  // Retornar número limpo se não conseguir formatar
  return cleaned;
}

export function getSafeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}
