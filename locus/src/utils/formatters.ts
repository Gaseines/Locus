// Centavos → string formatada para o input: 35000000 → "350.000,00"
export function centavosParaInputStr(centavos: number): string {
  if (!centavos || centavos <= 0) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

// Aplica máscara enquanto o usuário digita: "35000000" → "350.000,00"
export function aplicarMascaraPreco(valor: string): string {
  const nums = valor.replace(/\D/g, "");
  if (!nums) return "";
  const centavos = parseInt(nums, 10);
  if (isNaN(centavos)) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

// String formatada → centavos: "350.000,00" → 35000000
export function inputStrParaCentavos(str: string): number | null {
  const nums = str.replace(/\D/g, "");
  if (!nums) return null;
  const val = parseInt(nums, 10);
  return isNaN(val) || val <= 0 ? null : val;
}