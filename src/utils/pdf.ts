// Extrai o texto de um PDF (fatura) no próprio navegador, agrupando os
// pedaços por linha (posição vertical) para reconstruir os lançamentos.
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

interface TextItem {
  str: string
  transform: number[]
}

export async function extractPdfText(file: File): Promise<string> {
  const data = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const lines: string[] = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()

    // Agrupa por coordenada Y (arredondada) para montar linhas.
    const rows = new Map<number, { x: number; str: string }[]>()
    for (const raw of content.items as TextItem[]) {
      if (!('str' in raw) || raw.str === '') continue
      const x = raw.transform[4]
      const y = Math.round(raw.transform[5])
      if (!rows.has(y)) rows.set(y, [])
      rows.get(y)!.push({ x, str: raw.str })
    }

    // PDF: Y cresce de baixo para cima → ordena do topo para o fim.
    const ys = [...rows.keys()].sort((a, b) => b - a)
    for (const y of ys) {
      const line = rows
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
      if (line) lines.push(line)
    }
  }

  return lines.join('\n')
}
