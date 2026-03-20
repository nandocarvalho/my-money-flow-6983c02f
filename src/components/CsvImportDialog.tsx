import { useState, useRef } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getDiaFechamento } from '@/utils/fechamentoFatura';
import { Upload } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesRef: string;
}

interface CsvRow {
  descricao: string;
  valor: number;
  categoriaId: string;
  data: string;
}

export default function CsvImportDialog({ open, onOpenChange, mesRef }: Props) {
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
      // Skip header
      const dataLines = lines.slice(1);
      const diaFechamento = getDiaFechamento(dados.fechamentoFatura, mesRef);
      const dataFechamento = `${mesRef}-${String(diaFechamento).padStart(2, '0')}`;

      const parsed: CsvRow[] = dataLines.map(line => {
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

        const data = dataRaw || dataFechamento;

        return { descricao, valor: isNaN(valor) ? 0 : valor, categoriaId, data };
      }).filter(r => r.descricao && r.valor > 0);

      setRows(parsed);
      setStep('review');
    };
    reader.readAsText(file);
  };

  const updateRowCategoria = (index: number, catId: string) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, categoriaId: catId } : r));
  };

  const importar = () => {
    const semCategoria = rows.some(r => !r.categoriaId);
    if (semCategoria) {
      toast.error('Defina categoria para todos os lançamentos');
      return;
    }

    const novas = rows.map(r => ({
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar CSV - Fatura {mesRef}</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Formato: <code>nome, valor, categoria, data_compra</code><br />
              Categoria e data são opcionais. Se data não preenchida, será usada a data do fechamento da fatura.
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
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{rows.length} lançamentos encontrados. Defina categorias faltantes:</p>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.descricao}</p>
                    <p className="text-xs text-muted-foreground">R$ {r.valor.toFixed(2)} · {r.data}</p>
                  </div>
                  <Select value={r.categoriaId || '__none__'} onValueChange={v => updateRowCategoria(i, v === '__none__' ? '' : v)}>
                    <SelectTrigger className={`h-8 w-36 text-xs ${!r.categoriaId ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" disabled>Selecione</SelectItem>
                      {dados.categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); }} className="flex-1">Voltar</Button>
              <Button onClick={importar} className="flex-1">Importar {rows.length} lançamentos</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
