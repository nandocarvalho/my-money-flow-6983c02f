import { RegraCategorizacao } from '@/types/finance';

/** Normaliza texto: sem acentos, maiúsculas, espaços colapsados */
export function normalizar(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Retorna o categoriaId da primeira regra cuja palavra-chave está contida na descrição */
export function aplicarRegras(descricao: string, regras: RegraCategorizacao[]): string {
  const alvo = normalizar(descricao);
  if (!alvo) return '';
  // Regras mais específicas (palavra-chave maior) têm prioridade
  const ordenadas = [...regras].sort((a, b) => b.palavraChave.length - a.palavraChave.length);
  for (const r of ordenadas) {
    const chave = normalizar(r.palavraChave);
    if (chave && alvo.includes(chave)) return r.categoriaId;
  }
  return '';
}

const MESES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * Converte o valor da coluna mes_fatura em YYYY-MM.
 * Aceita "Agosto/2026", "ago/2026", "08/2026", "2026-08", "08-2026".
 */
export function parseMesFatura(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^"|"$/g, '');
  if (!s) return null;

  // 2026-08
  let m = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${String(Number(m[2])).padStart(2, '0')}`;

  // 08/2026
  m = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[2]}-${String(Number(m[1])).padStart(2, '0')}`;

  // Agosto/2026 · ago-2026 · agosto de 2026
  m = s.match(/^([a-zA-ZçÇáéíóúãõâêô]+)\s*(?:\/|-|\s+de\s+|\s+)\s*(\d{2,4})$/);
  if (m) {
    const nome = normalizar(m[1]).toLowerCase();
    const idx = MESES_PT.findIndex(mes => {
      const n = normalizar(mes).toLowerCase();
      return n === nome || n.startsWith(nome.slice(0, 3));
    });
    if (idx >= 0) {
      let ano = Number(m[2]);
      if (ano < 100) ano += 2000;
      return `${ano}-${String(idx + 1).padStart(2, '0')}`;
    }
  }
  return null;
}

/** Soma meses a um mês no formato YYYY-MM */
export function somarMeses(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ano = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${ano}-${String(mm).padStart(2, '0')}`;
}
