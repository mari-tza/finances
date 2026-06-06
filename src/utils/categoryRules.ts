// Categorização de lançamentos: aprendizado > regras por estabelecimento >
// categoria do Itaú > Outros. O mapa aprendido persiste no navegador
// (localStorage) e cresce conforme você recategoriza manualmente.

const LEARN_KEY = 'merchantCategoryMap.v1'

/** Mapa das categorias genéricas do Itaú para as nossas. */
const ITAU_MAP: [RegExp, string][] = [
  [/ve[ií]culos/i, 'cat-transporte'],
  [/turismo e entret/i, 'cat-lazer'],
  [/hobby/i, 'cat-esporte'],
  [/vestu[áa]rio/i, 'cat-vestuario'],
  [/sa[úu]de/i, 'cat-saude'],
  [/alimenta[çc][ãa]o/i, 'cat-restaurante'],
  [/diversos/i, 'cat-outros'],
]

/** Regras por nome do estabelecimento (mais específico que a categoria Itaú). */
const MERCHANT_RULES: [RegExp, string][] = [
  // Restaurantes & Delivery
  [/ifd\*|ifood|rappi|zig\b|restaur|lanch|pizz|burger|mc ?donald|bk\b|outback|subway|cacau|starbucks|padaria|cafe|caf[ée]|bar\b/i, 'cat-restaurante'],
  // Mercado
  [/supermerc|udimerc|dville|d'?ville|hortifr|mercad[oãa]|atacad|carrefour|p[ãa]o de a[çc]|assa[ií]|big\b|extra\b|sam'?s/i, 'cat-mercado'],
  // Transporte
  [/uber|99 ?app|99\*|posto|combust|gasolin|ipiranga|shell|petrob|tagitau|tag itau|pedagio|ped[áa]gio|estacion|metr[ôo]|cabify/i, 'cat-transporte'],
  // Viagens
  [/hoteis|hot[ée]is|hotels?\.|booking|airbnb|decolar|hurb|gol\b|latam|azul\b|tap\b|cvc|maxmilhas|123 ?milhas|expedia|trivago/i, 'cat-viagens'],
  // Assinaturas
  [/claude|anthropic|openai|chatgpt|jetbrains|github|netflix|spotify|disney|hbo|max\b|paramount|prime\b|amazon ?prime|youtube ?prem|ifood ?club|f1 ?tv|deezer|icloud|google ?one|notion|figma|canva|microsoft ?365|office ?365/i, 'cat-assinaturas'],
  // Lazer & Entretenimento
  [/cinema|cinemark|kinoplex|uci\b|ingress|eventim|sympla|ticket|show|teatro|game|steam|playstation|xbox|nintendo/i, 'cat-lazer'],
  // Esporte & Hobby
  [/academia|smartfit|smart fit|fight|luta|jiu|crossfit|gym\b|decathlon|centauro|netshoes|esporte/i, 'cat-esporte'],
  // Vestuário
  [/vestu|roupa|moda|zara|renner|c&a|cea\b|riachuelo|hering|nike|adidas|reserva|farm\b|shoulder|youcom|shein/i, 'cat-vestuario'],
  // Saúde & Beleza
  [/farm|drog|drogaria|hospital|cl[íi]nic|laborat|consult|odonto|dentist|barbearia|barber|sal[ãa]o|cabelei|est[ée]tica|manicure|spa\b|sephora|boticario|natura|avon/i, 'cat-saude'],
  // Pets
  [/petz|cobasi|petlove|petshop|pet ?shop|veterin|pet\b/i, 'cat-pets'],
  // Casa & Utilidades
  [/iptu|condom|energia|enel|cemig|light\b|sabesp|copasa|[áa]gua|g[áa]s\b|internet|vivo\b|claro\b|tim\b|oi\b|leroy|telhanorte|magazine|americanas|casas bahia|eletro/i, 'cat-casa'],
  // Seguros
  [/seguro|porto seguro|seguradora|prudential|metlife|allianz/i, 'cat-seguros'],
  // Doações
  [/doa[çc][ãa]o|d[íi]zimo|d[íi]zimo|igreja|paroquia|ong\b|vakinha/i, 'cat-doacoes'],
  // Tarifas & Encargos
  [/iof|juros|anuidade|tarifa|encargo|multa|mora\b/i, 'cat-tarifas'],
]

/** Remove sufixo de parcela (NN/MM), cidade e ruídos — base p/ aprendizado. */
export function cleanMerchantName(raw: string): string {
  return raw
    .replace(/\s*\d{2}\/\d{2}\s*$/, '') // sufixo de parcela "05/12"
    .replace(/\s*\.[A-ZÀ-Ý ]+$/i, '') // " .CIDADE"
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function normKey(name: string): string {
  return cleanMerchantName(name).toUpperCase()
}

function loadLearned(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LEARN_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** Registra que um estabelecimento pertence a uma categoria (aprendizado). */
export function learnMerchant(name: string, categoryId: string): void {
  const map = loadLearned()
  map[normKey(name)] = categoryId
  try {
    localStorage.setItem(LEARN_KEY, JSON.stringify(map))
  } catch {
    /* ignora se localStorage indisponível */
  }
}

/**
 * Decide a categoria de um lançamento.
 * Ordem: aprendido → regra de estabelecimento → categoria do Itaú → Outros.
 */
export function categorize(
  merchant: string,
  itauCategory: string | undefined,
  validIds: Set<string>,
): string {
  const learned = loadLearned()[normKey(merchant)]
  if (learned && validIds.has(learned)) return learned

  for (const [re, id] of MERCHANT_RULES) {
    if (re.test(merchant) && validIds.has(id)) return id
  }
  if (itauCategory) {
    for (const [re, id] of ITAU_MAP) {
      if (re.test(itauCategory) && validIds.has(id)) return id
    }
  }
  return validIds.has('cat-outros') ? 'cat-outros' : [...validIds][0]
}
