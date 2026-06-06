// Cálculo do líquido de uma renda, com imposto, desconto e dízimo opcionais.
//
// Ordem (definida pela usuária):
//   1. imposto (%) sobre o bruto
//   2. desconto (R$ fixo) sobre o valor já com imposto descontado
//   3. dízimo (%) sobre o valor já com imposto E desconto
//
//   após imposto    = bruto − (imposto% × bruto)
//   após desconto   = após imposto − desconto
//   dízimo          = dízimo% × (após desconto)
//   líquido         = após desconto − dízimo

export interface IncomeBreakdown {
  gross: number
  tax: number
  discount: number
  tithe: number
  net: number
}

export function computeIncome(
  gross: number,
  taxPercent?: number,
  tithePercent?: number,
  discount?: number,
): IncomeBreakdown {
  const tax = gross * ((taxPercent ?? 0) / 100)
  const afterTax = gross - tax
  const disc = discount ?? 0
  const afterDiscount = afterTax - disc
  const tithe = afterDiscount * ((tithePercent ?? 0) / 100)
  const net = afterDiscount - tithe
  return { gross, tax, discount: disc, tithe, net }
}

/** True se a renda tem algum desconto configurado. */
export function hasDeductions(
  taxPercent?: number,
  tithePercent?: number,
  discount?: number,
): boolean {
  return Boolean(
    (taxPercent && taxPercent > 0) ||
      (tithePercent && tithePercent > 0) ||
      (discount && discount > 0),
  )
}
