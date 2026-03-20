import { useState, useRef, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { mesFaturaCartao, getDiaFechamento } from '@/utils/fechamentoFatura';
import { Upload, AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CsvRow {
  descricao: string;
  valor: number;
  categoriaId: string;
  data: string;
  dataOriginal: boolean; // true if date came from CSV
  mesFatura: string;
  duplicado: boolean;
  forcarImportar: boolean;
}

// Smart date parser - tries multiple formats
function parseDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return s;
  }

  // dd/MM/yyyy or dd-MM-yyyy or dd.MM.yyyy
  const match1 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (match1) {
    const [, dd, mm, yyyy] = match1;
    const d = Number(dd), m = Number(mm), y = Number(yyyy);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2020 && y <= 2030) {
      return `${yyyy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // dd/MM/yy or dd-MM-yy
  const match2 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
  if (match2) {
    const [, dd, mm, yy] = match2;
    const d = Number(dd), m = Number(mm);
    const y = Number(yy) + 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // MM/dd/yyyy (fallback if day > 12, assume dd/MM)
  // Already handled above

  return null;
}

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
      const lines = text.trim().split('\n');
      const dataLines = lines.slice(1);

      const parsed: CsvRow[] = dataLines.map(line => {
        // Handle both comma and semicolon separators, respecting quotes
        const parts = line.split(/[,;]/).map(s => s.trim().replace(/^"|"$/g, ''));
        const descricao = parts[0] || '';
        const valor = parseFloat((parts[1] || '0').replace(',', '.'));
        const categoriaRaw = parts[2] || '';
        const dataRaw = parts[3] || '';

        // Try to match category by name
        let categoriaId = '';
        if (categoriaRaw) {
          const cat = dados.categorias.find(c => c.nome.toLowerCase() === categoriaRaw.toLowerCase());
          if (cat) categoriaId = cat.id;
        }

        const parsedDate = parseDate(dataRaw);
        const dataOriginal = !!parsedDate;

        // If no date, use current date as fallback (will show warning)
        const dataFinal = parsedDate || format(new Date(), 'yyyy-MM-dd');
        const mesFatura = mesFaturaCartao(dataFinal, dados.fechamentoFatura);

        // Check for duplicates
        const duplicado = dados.transacoes.some(
          t => t.data === dataFinal && t.descricao.toLowerCase() === descricao.toLowerCase() && t.tipo === 'despesa'
        );

        return {
          descricao,
          valor: isNaN(valor) ? 0 : valor,
          categoriaId,
          data: dataFinal,
          dataOriginal,
          mesFatura,
          duplicado,
          forcarImportar: false,
        };
      }).filter(r => r.descricao && r.valor > 0);

      // Sort by date descending
      parsed.sort((a, b) => b.data.localeCompare(a.data));

      setRows(parsed);
      setStep('review');
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const updateRowCategoria = (index: number, catId: string) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, categoriaId: catId } : r));
  };

  const toggleForcarImportar = (index: number) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, forcarImportar: !r.forcarImportar } : r));
  };

  // Group rows by mesFatura
  const gruposPorMes = useMemo(() => {
    const groups: Record<string, { rows: CsvRow[]; indices: number[] }> = {};
    rows.forEach((r, i) => {
      if (!groups[r.mesFatura]) groups[r.mesFatura] = { rows: [], indices: [] };
      groups[r.mesFatura].rows.push(r);
      groups[r.mesFatura].indices.push(i);
    });
    // Sort months
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const rowsParaImportar = rows.filter(r => !r.duplicado || r.forcarImportar);
  const semCategoria = rowsParaImportar.some(r => !r.categoriaId);

  const importar = () => {
    if (semCategoria) {
      toast.error('Defina categoria para todos os lançamentos');
      return;
    }

    const novas = rowsParaImportar.map(r => ({
      id: crypto.randomUUID(),
      data: r.data,
      valor: r.valor,
      descricao: r.descricao,
      categoriaId: r.categoriaId,
      tipo: 'despesa' as const,
      formaPagamento: 'cartao' as const,
      status: 'pendente' as const,
    }));

    atualizarDados({ ...dados, transacoes: [...dados.transacoes, ...novas] });
    toast.success(`${novas.length} lançamentos importados!`);
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
      return format(new Date(mes + '-01'), "MMMM 'de' yyyy", { locale: ptBR });
    } catch { return mes; }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === 'review' ? 'max-w-4xl max-h-[90vh] overflow-hidden flex flex-col' : 'max-w-lg'}>
        <DialogHeader>
          <DialogTitle>Importar Lançamentos Crédito à Vista</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Formato: <code>nome, valor, categoria, data_compra</code><br />
              Categoria e data são opcionais. Datas aceitas: dd/MM/yyyy, dd-MM-yyyy, yyyy-MM-dd.<br />
              Lançamentos sem data serão sinalizados.
            </p>
            <div className="flex justify-center p-8 border-2 border-dashed rounded-lg">
              <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" /> Selecionar arquivo CSV
              </Button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {rows.length} lançamentos encontrados · {rowsParaImportar.length} serão importados
              </p>
              {semCategoria && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Categorias pendentes
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {gruposPorMes.map(([mes, { rows: mesRows, indices }]) => (
                <div key={mes} className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 bg-background py-1 z-10 border-b">
                    Fatura {formatMesLabel(mes)}
                  </h3>
                  {mesRows.map((r, idx) => {
                    const globalIdx = indices[idx];
                    const isDuplicado = r.duplicado && !r.forcarImportar;
                    return (
                      <div
                        key={globalIdx}
                        className={`p-4 rounded-xl border-2 space-y-3 transition-all ${
                          isDuplicado
                            ? 'border-muted bg-muted/30 opacity-60'
                            : !r.categoriaId
                              ? 'border-destructive/50 bg-destructive/5'
                              : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${!r.categoriaId && !isDuplicado ? 'text-destructive' : ''}`}>
                              {r.descricao}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-semibold text-destructive">
                                R$ {r.valor.toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(r.data + 'T12:00:00'), 'dd/MM/yyyy')}
                              </span>
                              {!r.dataOriginal && (
                                <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-400">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Data não informada no CSV
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isDuplicado && (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Copy className="h-3 w-3" /> Já importado
                              </Badge>
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  checked={r.forcarImportar}
                                  onCheckedChange={() => toggleForcarImportar(globalIdx)}
                                />
                                <span className="text-xs text-muted-foreground">Forçar</span>
                              </div>
                            </div>
                          )}
                          {!isDuplicado && r.categoriaId && (
                            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))] shrink-0" />
                          )}
                        </div>

                        {/* Category selection chips */}
                        {!isDuplicado && (
                          <div className="flex flex-wrap gap-1.5">
                            {dados.categorias.map(c => (
                              <button
                                key={c.id}
                                onClick={() => updateRowCategoria(globalIdx, c.id)}
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
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t shrink-0">
              <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); }} className="flex-1">Voltar</Button>
              <Button onClick={importar} className="flex-1" disabled={semCategoria}>
                Importar {rowsParaImportar.length} lançamentos
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
