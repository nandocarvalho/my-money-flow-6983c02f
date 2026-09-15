import { useState, useRef, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { mesFaturaCartao, mesFaturaDe } from '@/utils/fechamentoFatura';
import { aplicarRegras, parseMesFatura, somarMeses, normalizar } from '@/utils/categorizacao';
import { Transacao, RegraCategorizacao, CATEGORIA_SEM_ID } from '@/types/finance';
import { Upload, AlertTriangle, CheckCircle2, Copy, Layers, Wand2, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CsvRow {
  descricao: string;
  valor: number; // valor da parcela (ou valor à vista)
  categoriaId: string;
  categoriaBb: string;
  data: string;
  dataOriginal: boolean;
  mesFatura: string; // YYYY-MM
  mesFaturaDoCsv: boolean;
  tipo: 'avista' | 'parcelado';
  parcelaAtual: number;
  parcelaTotal: number;
  valorTotal: number;
  autoCategorizado: boolean;
  duplicado: boolean;
  conciliarGrupoId: string | null;
  forcarImportar: boolean;
  salvarRegra: boolean;
  regraPalavra: string;
}

/** Parse a CSV line respecting quoted fields */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',' || ch === ';') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Smart date parser — tries many common formats */
function parseDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim().replace(/^"|"$/g, '');

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2099) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const match4 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (match4) {
    const d = Number(match4[1]), m = Number(match4[2]), y = Number(match4[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2099) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const match2 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
  if (match2) {
    const d = Number(match2[1]), m = Number(match2[2]);
    const y = Number(match2[3]) + 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const embedded = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (embedded) {
    const d = Number(embedded[1]), m = Number(embedded[2]);
    let y = Number(embedded[3]);
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2099) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return null;
}

function parseValor(raw: string): number {
  let v = (raw || '0').replace(/^"|"$/g, '').replace(/R\$\s*/i, '').trim();
  if (/^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(v)) {
    v = v.replace(/\./g, '').replace(',', '.');
  } else {
    v = v.replace(',', '.');
  }
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.abs(n);
}

/** "02/10" -> { atual: 2, total: 10 } */
function parseParcelamento(raw: string): { atual: number; total: number } | null {
  if (!raw) return null;
  const m = raw.replace(/^"|"$/g, '').match(/(\d{1,2})\s*(?:\/|de|x)\s*(\d{1,2})/i);
  if (!m) return null;
  const atual = Number(m[1]);
  const total = Number(m[2]);
  if (!atual || !total || atual > total) return null;
  return { atual, total };
}

/** Mapeia nome de coluna do header para índice */
function mapHeader(fields: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  fields.forEach((f, i) => {
    const k = normalizar(f).toLowerCase().replace(/\s+/g, '_');
    if (/^nome|descri/.test(k)) map.nome = i;
    else if (k === 'valor') map.valor = i;
    else if (k === 'categoria_bb' || k === 'categoriabb') map.categoria_bb = i;
    else if (/^categoria/.test(k)) map.categoria = i;
    else if (/^data/.test(k)) map.data_compra = i;
    else if (k === 'tipo') map.tipo = i;
    else if (/^parcel/.test(k)) map.parcelamento = i;
    else if (/^mes_fatura|^mes/.test(k)) map.mes_fatura = i;
  });
  return map;
}

const DEFAULT_ORDER: Record<string, number> = {
  nome: 0, valor: 1, categoria: 2, data_compra: 3, tipo: 4, parcelamento: 5, mes_fatura: 6, categoria_bb: 7,
};

export default function CsvImportDialog({ open, onOpenChange }: Props) {
  const { dados, atualizarDados } = useFinance();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [step, setStep] = useState<'upload' | 'review'>('upload');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(l => l.trim());
      if (lines.length === 0) { toast.error('Arquivo vazio'); return; }

      const firstFields = parseCsvLine(lines[0]);
      const hasHeader = /nome|descri|valor|categ|data|tipo|parcel|fatura/i.test(lines[0]) && !parseDate(firstFields[3] || '');
      const cols = hasHeader ? { ...DEFAULT_ORDER, ...mapHeader(firstFields) } : DEFAULT_ORDER;
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const currentDados = dados;
      const get = (parts: string[], key: string) => {
        const i = cols[key];
        return i === undefined ? '' : (parts[i] || '').replace(/^"|"$/g, '').trim();
      };

      const parsed: CsvRow[] = dataLines.map(line => {
        const parts = parseCsvLine(line);
        const descricao = get(parts, 'nome');
        const valor = parseValor(get(parts, 'valor'));
        const categoriaRaw = get(parts, 'categoria');
        const categoriaBb = get(parts, 'categoria_bb');
        const dataRaw = get(parts, 'data_compra');
        const tipoRaw = normalizar(get(parts, 'tipo')).toLowerCase();
        const parcelamentoRaw = get(parts, 'parcelamento');
        const mesFaturaRaw = get(parts, 'mes_fatura');

        // Categoria: 1) nome exato no CSV  2) regra de auto-categorização
        let categoriaId = '';
        let autoCategorizado = false;
        if (categoriaRaw) {
          const cat = currentDados.categorias.find(c => normalizar(c.nome) === normalizar(categoriaRaw));
          if (cat) categoriaId = cat.id;
        }
        if (!categoriaId) {
          const sugestao = aplicarRegras(descricao, currentDados.regrasCategorizacao || []);
          if (sugestao) { categoriaId = sugestao; autoCategorizado = true; }
        }

        const parsedDate = parseDate(dataRaw);
        const dataOriginal = !!parsedDate;
        const dataFinal = parsedDate || format(new Date(), 'yyyy-MM-dd');

        // Mês da fatura: sempre o do CSV quando existir
        const mesCsv = parseMesFatura(mesFaturaRaw);
        const mesFatura = mesCsv || mesFaturaCartao(dataFinal, currentDados.fechamentoFatura);

        const parc = parseParcelamento(parcelamentoRaw);
        const isParcelado = tipoRaw.includes('parcel') || !!parc;
        const parcelaAtual = parc?.atual ?? 1;
        const parcelaTotal = parc?.total ?? 1;
        const valorTotal = isParcelado ? valor * parcelaTotal : valor;

        // Duplicidade / conciliação
        let duplicado = false;
        let conciliarGrupoId: string | null = null;

        if (isParcelado && parcelaTotal > 1) {
          const existente = currentDados.transacoes.find(t =>
            t.tipo === 'despesa' && !!t.parcela &&
            normalizar(t.descricao) === normalizar(descricao) &&
            t.data === dataFinal
          );
          if (existente) {
            conciliarGrupoId = existente.parcela!.grupoId;
            duplicado = true;
          }
        } else {
          duplicado = currentDados.transacoes.some(t =>
            t.tipo === 'despesa' && !t.parcela &&
            normalizar(t.descricao) === normalizar(descricao) &&
            t.data === dataFinal &&
            mesFaturaDe(t, currentDados.fechamentoFatura) === mesFatura
          );
        }

        return {
          descricao,
          valor,
          categoriaId,
          categoriaBb,
          data: dataFinal,
          dataOriginal,
          mesFatura,
          mesFaturaDoCsv: !!mesCsv,
          tipo: isParcelado ? 'parcelado' as const : 'avista' as const,
          parcelaAtual,
          parcelaTotal,
          valorTotal,
          autoCategorizado,
          duplicado,
          conciliarGrupoId,
          forcarImportar: false,
          salvarRegra: false,
          regraPalavra: descricao,
        };
      }).filter(r => r.descricao && r.valor > 0);

      parsed.sort((a, b) => a.mesFatura.localeCompare(b.mesFatura) || a.data.localeCompare(b.data));

      setRows(parsed);
      setStep('review');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const patchRow = (index: number, patch: Partial<CsvRow>) =>
    setRows(prev => prev.map((r, i) => i === index ? { ...r, ...patch } : r));

  // Agrupamento EXCLUSIVO pelo mes_fatura
  const gruposPorMes = useMemo(() => {
    const groups: Record<string, { rows: CsvRow[]; indices: number[] }> = {};
    rows.forEach((r, i) => {
      if (!groups[r.mesFatura]) groups[r.mesFatura] = { rows: [], indices: [] };
      groups[r.mesFatura].rows.push(r);
      groups[r.mesFatura].indices.push(i);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const rowsNovas = rows.filter(r => !r.duplicado || r.forcarImportar);
  const rowsConciliar = rows.filter(r => r.duplicado && r.conciliarGrupoId && !r.forcarImportar);
  const semCategoria = rows.filter(r => !r.categoriaId).length;

  const importar = () => {
    const cartaoId = dados.cartoes[0]?.id;
    let transacoes: Transacao[] = [...dados.transacoes];
    const novasRegras: RegraCategorizacao[] = [];
    let criadas = 0;
    let conciliadas = 0;

    rows.forEach(r => {
      const categoriaId = r.categoriaId || CATEGORIA_SEM_ID;

      if (r.salvarRegra && r.regraPalavra.trim() && r.categoriaId) {
        const chave = r.regraPalavra.trim();
        const jaExiste = [...(dados.regrasCategorizacao || []), ...novasRegras]
          .some(x => normalizar(x.palavraChave) === normalizar(chave));
        if (!jaExiste) {
          novasRegras.push({ id: crypto.randomUUID(), palavraChave: chave, categoriaId: r.categoriaId });
        }
      }

      // Conciliação de parcelamento já existente
      if (r.conciliarGrupoId && !r.forcarImportar) {
        let achou = false;
        transacoes = transacoes.map(t => {
          if (achou || t.parcela?.grupoId !== r.conciliarGrupoId) return t;
          const mesmoMes = (t.mesFaturaOverride || mesFaturaDe(t, dados.fechamentoFatura)) === r.mesFatura
            || t.parcela!.atual === r.parcelaAtual;
          if (!mesmoMes) return t;
          achou = true;
          return { ...t, status: 'pago' as const, mesFaturaOverride: r.mesFatura, valor: r.valor };
        });
        if (achou) conciliadas++;
        return;
      }

      if (r.duplicado && !r.forcarImportar) return;

      if (r.tipo === 'parcelado' && r.parcelaTotal > 1) {
        const grupoId = crypto.randomUUID();
        for (let i = 1; i <= r.parcelaTotal; i++) {
          transacoes.push({
            id: crypto.randomUUID(),
            data: r.data,
            valor: r.valor,
            descricao: r.descricao,
            categoriaId,
            categoriaBb: r.categoriaBb || undefined,
            tipo: 'despesa',
            formaPagamento: 'cartao',
            cartaoId,
            status: i <= r.parcelaAtual ? 'pago' : 'pendente',
            // Mês fiel ao CSV: parcela atual = mes_fatura, seguintes consecutivas
            mesFaturaOverride: somarMeses(r.mesFatura, i - r.parcelaAtual),
            parcela: { atual: i, total: r.parcelaTotal, grupoId, valorTotal: r.valorTotal },
          });
        }
        criadas++;
      } else {
        transacoes.push({
          id: crypto.randomUUID(),
          data: r.data,
          valor: r.valor,
          descricao: r.descricao,
          categoriaId,
          categoriaBb: r.categoriaBb || undefined,
          tipo: 'despesa',
          formaPagamento: 'cartao',
          cartaoId,
          status: 'pendente',
          mesFaturaOverride: r.mesFatura,
        });
        criadas++;
      }
    });

    atualizarDados({
      ...dados,
      transacoes,
      regrasCategorizacao: [...(dados.regrasCategorizacao || []), ...novasRegras],
    });

    const partes = [`${criadas} lançamentos importados`];
    if (conciliadas) partes.push(`${conciliadas} parcelas conciliadas`);
    if (novasRegras.length) partes.push(`${novasRegras.length} regras salvas`);
    toast.success(partes.join(' · '));
    setStep('upload');
    setRows([]);
    onOpenChange(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) { setStep('upload'); setRows([]); }
    onOpenChange(v);
  };

  const formatMesLabel = (mes: string) => {
    try {
      return format(new Date(mes + '-01T12:00:00'), "MMMM 'de' yyyy", { locale: ptBR });
    } catch { return mes; }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === 'review' ? 'max-w-4xl max-h-[90vh] overflow-hidden flex flex-col' : 'max-w-lg'}>
        <DialogHeader>
          <DialogTitle>Importar Lançamentos do Cartão (CSV)</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Formato: <code>nome, valor, categoria, data_compra, tipo, parcelamento, mes_fatura, categoria_bb</code><br />
              <span className="text-xs">
                · <b>tipo</b>: "a vista" ou "parcelado" · <b>parcelamento</b>: 02/10 · <b>mes_fatura</b>: Agosto/2026<br />
                · Em compras parceladas, o valor é o da parcela — o total é calculado automaticamente.<br />
                · Categoria em branco recebe a categoria "Sem Categoria" ou a regra de auto-categorização.
              </span>
            </p>
            <div className="flex justify-center p-8 border-2 border-dashed rounded-lg">
              <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" /> Selecionar arquivo CSV
              </Button>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground flex-1">
                {rows.length} linhas · {rowsNovas.length} novas · {rowsConciliar.length} a conciliar
              </p>
              {semCategoria > 0 && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-400">
                  <AlertTriangle className="h-3 w-3" /> {semCategoria} sem categoria (irão como "Sem Categoria")
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {gruposPorMes.map(([mes, { rows: mesRows, indices }]) => (
                <div key={mes} className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-background py-1 z-10 border-b">
                    Fatura {formatMesLabel(mes)} · {mesRows.length} itens
                  </h3>
                  {mesRows.map((r, idx) => {
                    const globalIdx = indices[idx];
                    const isConciliar = !!r.conciliarGrupoId && !r.forcarImportar;
                    const isDuplicado = r.duplicado && !r.forcarImportar && !isConciliar;
                    const inativo = isDuplicado;
                    return (
                      <div
                        key={globalIdx}
                        className={`p-4 rounded-xl border-2 space-y-3 transition-all ${
                          inativo
                            ? 'border-muted bg-muted/30 opacity-60'
                            : isConciliar
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{r.descricao}</p>
                              {r.tipo === 'parcelado' && (
                                <Badge variant="secondary" className="gap-1 text-[10px]">
                                  <Layers className="h-3 w-3" /> {r.parcelaAtual}/{r.parcelaTotal}
                                </Badge>
                              )}
                              {r.autoCategorizado && (
                                <Badge variant="outline" className="gap-1 text-[10px] text-primary border-primary/40">
                                  <Wand2 className="h-3 w-3" /> Auto
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-sm font-semibold text-destructive font-mono">
                                R$ {r.valor.toFixed(2)}
                              </span>
                              {r.tipo === 'parcelado' && (
                                <span className="text-xs text-muted-foreground">
                                  total R$ {r.valorTotal.toFixed(2)}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                compra {format(new Date(r.data + 'T12:00:00'), 'dd/MM/yyyy')}
                              </span>
                              {r.categoriaBb && (
                                <span className="text-[10px] text-muted-foreground italic">({r.categoriaBb})</span>
                              )}
                              {!r.dataOriginal && (
                                <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-400">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Data não informada
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isConciliar && (
                              <Badge variant="outline" className="gap-1 text-xs text-primary border-primary/40">
                                <Link2 className="h-3 w-3" /> Conciliar parcela
                              </Badge>
                            )}
                            {isDuplicado && (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Copy className="h-3 w-3" /> Já importado
                              </Badge>
                            )}
                            {r.duplicado && (
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  checked={r.forcarImportar}
                                  onCheckedChange={() => patchRow(globalIdx, { forcarImportar: !r.forcarImportar })}
                                />
                                <span className="text-xs text-muted-foreground">Forçar</span>
                              </div>
                            )}
                            {!r.duplicado && r.categoriaId && (
                              <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
                            )}
                          </div>
                        </div>

                        {!inativo && (
                          <>
                            <div className="flex flex-wrap gap-1.5">
                              {dados.categorias.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => patchRow(globalIdx, { categoriaId: r.categoriaId === c.id ? '' : c.id, autoCategorizado: false })}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                                    r.categoriaId === c.id
                                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                      : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border'
                                  }`}
                                >
                                  {c.icone} {c.nome}
                                </button>
                              ))}
                            </div>

                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-fit">
                                <Checkbox
                                  checked={r.salvarRegra}
                                  disabled={!r.categoriaId}
                                  onCheckedChange={() => patchRow(globalIdx, { salvarRegra: !r.salvarRegra })}
                                />
                                Salvar regra de auto-categorização
                              </label>
                              {r.salvarRegra && (
                                <Input
                                  value={r.regraPalavra}
                                  onChange={e => patchRow(globalIdx, { regraPalavra: e.target.value })}
                                  placeholder="Palavra-chave (ex: PANI E PAO)"
                                  className="h-8 text-xs"
                                />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t shrink-0">
              <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); }} className="flex-1">Voltar</Button>
              <Button onClick={importar} className="flex-1">
                Importar {rowsNovas.length} lançamentos
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
