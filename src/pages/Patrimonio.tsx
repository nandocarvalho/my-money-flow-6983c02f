import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda } from '@/utils/financialCalculations';
import { HistoricoInvestimento } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Wallet, Plus, Lock, Clock } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Patrimonio() {
  const { dados, atualizarDados } = useFinance();
  const historico = dados.investimento.historicoMensal;

  const [addDialog, setAddDialog] = useState(false);
  const [addMes, setAddMes] = useState('');
  const [addSaldo, setAddSaldo] = useState('');
  const [addTaxa, setAddTaxa] = useState(dados.investimento.taxaRendimento.toString());
  const [addFechado, setAddFechado] = useState(false);

  const [taxaDialog, setTaxaDialog] = useState<{ index: number; taxa: string } | null>(null);
  const [aplicarFuturos, setAplicarFuturos] = useState(false);

  const hoje = format(new Date(), 'yyyy-MM');

  // Sort historico by mes
  const sorted = useMemo(() =>
    [...historico].sort((a, b) => a.mes.localeCompare(b.mes)),
    [historico]
  );

  const updateHistoricoItem = (index: number, updates: Partial<HistoricoInvestimento>) => {
    const sortedCopy = [...sorted];
    sortedCopy[index] = { ...sortedCopy[index], ...updates };

    // Recalculate rendimento if saldo or taxa changed
    const item = sortedCopy[index];
    item.rendimento = Math.round(item.saldo * (item.taxa / 100) * 100) / 100;

    atualizarDados({
      ...dados,
      investimento: {
        ...dados.investimento,
        historicoMensal: sortedCopy,
        saldo: sortedCopy[sortedCopy.length - 1]?.saldo || dados.investimento.saldo,
      },
    });
  };

  const handleTaxaChange = (index: number, novaTaxa: string) => {
    setTaxaDialog({ index, taxa: novaTaxa });
    setAplicarFuturos(false);
  };

  const confirmarTaxa = () => {
    if (!taxaDialog) return;
    const taxa = parseFloat(taxaDialog.taxa.replace(',', '.'));
    if (isNaN(taxa)) { toast.error('Taxa inválida'); return; }

    const sortedCopy = [...sorted];
    if (aplicarFuturos) {
      for (let i = taxaDialog.index; i < sortedCopy.length; i++) {
        sortedCopy[i] = {
          ...sortedCopy[i],
          taxa,
          rendimento: Math.round(sortedCopy[i].saldo * (taxa / 100) * 100) / 100,
        };
      }
    } else {
      sortedCopy[taxaDialog.index] = {
        ...sortedCopy[taxaDialog.index],
        taxa,
        rendimento: Math.round(sortedCopy[taxaDialog.index].saldo * (taxa / 100) * 100) / 100,
      };
    }

    atualizarDados({
      ...dados,
      investimento: {
        ...dados.investimento,
        historicoMensal: sortedCopy,
        taxaRendimento: taxa,
        saldo: sortedCopy[sortedCopy.length - 1]?.saldo || dados.investimento.saldo,
      },
    });
    toast.success(aplicarFuturos ? 'Taxa aplicada a todos os próximos meses' : 'Taxa atualizada');
    setTaxaDialog(null);
  };

  const adicionarMes = () => {
    const saldo = parseFloat(addSaldo.replace(',', '.'));
    const taxa = parseFloat(addTaxa.replace(',', '.'));
    if (!addMes || isNaN(saldo) || isNaN(taxa)) { toast.error('Preencha todos os campos'); return; }
    if (historico.some(h => h.mes === addMes)) { toast.error('Mês já existe'); return; }

    const rendimento = Math.round(saldo * (taxa / 100) * 100) / 100;
    const novo: HistoricoInvestimento = { mes: addMes, saldo, taxa, rendimento, fechado: addFechado };

    atualizarDados({
      ...dados,
      investimento: {
        ...dados.investimento,
        historicoMensal: [...historico, novo],
        saldo,
        taxaRendimento: taxa,
      },
    });
    toast.success('Mês adicionado!');
    setAddDialog(false);
  };

  const sugerirProximoMes = () => {
    if (sorted.length === 0) return format(new Date(), 'yyyy-MM');
    const ultimo = sorted[sorted.length - 1];
    return format(addMonths(new Date(ultimo.mes + '-01'), 1), 'yyyy-MM');
  };

  const saldoAtual = sorted.length > 0 ? sorted[sorted.length - 1].saldo : dados.investimento.saldo;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patrimônio</h1>
          <p className="text-muted-foreground text-sm">Controle mensal da poupança e investimentos</p>
        </div>
        <Button onClick={() => { setAddMes(sugerirProximoMes()); setAddSaldo(''); setAddTaxa(dados.investimento.taxaRendimento.toString()); setAddFechado(false); setAddDialog(true); }} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Adicionar Mês
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Atual</p>
                <p className="text-2xl font-bold">{formatarMoeda(saldoAtual)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[hsl(var(--success)/0.1)]">
                <TrendingUp className="h-5 w-5 text-[hsl(var(--success))]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa Atual</p>
                <p className="text-2xl font-bold">{dados.investimento.taxaRendimento}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Histórico Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Diferencial</TableHead>
                <TableHead className="text-right">Rendimento</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((h, idx) => {
                const anterior = idx > 0 ? sorted[idx - 1] : null;
                const diferencial = anterior ? h.saldo - anterior.saldo : 0;
                const isFechado = h.fechado || h.mes < hoje;
                const isProjecao = !isFechado;

                return (
                  <TableRow key={h.mes}>
                    <TableCell className="capitalize font-medium">
                      {format(new Date(h.mes + '-01'), "MMM 'de' yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {isFechado ? (
                        <Badge variant="secondary" className="text-[10px] gap-1"><Lock className="h-3 w-3" /> Fechado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1"><Clock className="h-3 w-3" /> Projeção</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        className="h-7 w-28 text-right text-sm ml-auto"
                        value={h.saldo}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) updateHistoricoItem(idx, { saldo: val });
                        }}
                        type="number"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {idx > 0 && (
                        <span className={`inline-flex items-center gap-1 font-medium ${diferencial >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                          {diferencial >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {formatarMoeda(Math.abs(diferencial))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-[hsl(var(--success))]">+{formatarMoeda(h.rendimento)}</TableCell>
                    <TableCell className="text-right">
                      <button
                        className="text-sm text-primary underline-offset-2 hover:underline cursor-pointer"
                        onClick={() => handleTaxaChange(idx, h.taxa.toString())}
                      >
                        {h.taxa}%
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add month dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Mês</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mês (YYYY-MM)</Label>
              <Input value={addMes} onChange={e => setAddMes(e.target.value)} placeholder="2026-04" />
            </div>
            <div className="space-y-2">
              <Label>Valor da Poupança (R$)</Label>
              <Input value={addSaldo} onChange={e => setAddSaldo(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>Taxa (%)</Label>
              <Input value={addTaxa} onChange={e => setAddTaxa(e.target.value)} inputMode="decimal" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="fechado" checked={addFechado} onChange={e => setAddFechado(e.target.checked)} className="rounded" />
              <Label htmlFor="fechado">Mês já fechado</Label>
            </div>
            <Button onClick={adicionarMes} className="w-full">Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Taxa change dialog */}
      <Dialog open={!!taxaDialog} onOpenChange={() => setTaxaDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Taxa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova taxa (% ao mês)</Label>
              <Input value={taxaDialog?.taxa || ''} onChange={e => setTaxaDialog(prev => prev ? { ...prev, taxa: e.target.value } : null)} inputMode="decimal" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="aplicar-futuros" checked={aplicarFuturos} onChange={e => setAplicarFuturos(e.target.checked)} className="rounded" />
              <Label htmlFor="aplicar-futuros">Aplicar para todos os próximos meses</Label>
            </div>
            <Button onClick={confirmarTaxa} className="w-full">Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
