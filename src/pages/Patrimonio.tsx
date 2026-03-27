import { useState, useMemo, useEffect, useRef } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda } from '@/utils/financialCalculations';
import { HistoricoInvestimento } from '@/types/finance';
import { Card, CardContent } from '@/components/ui/card';
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
  const [taxaDialog, setTaxaDialog] = useState<{ mes: string; taxa: string } | null>(null);
  const [aplicarFuturos, setAplicarFuturos] = useState(false);
  const [editingSaldo, setEditingSaldo] = useState<string | null>(null);
  const [editSaldoValue, setEditSaldoValue] = useState('');
  const currentRowRef = useRef<HTMLTableRowElement>(null);

  const hoje = format(new Date(), 'yyyy-MM');

  // Sort newest first
  const sorted = useMemo(() => {
    const copy = [...historico];
    // Auto-fix: mark past months as fechado
    const mesAtual = hoje;
    copy.forEach(h => {
      if (h.mes < mesAtual && !h.fechado) {
        h.fechado = true;
      }
    });
    return copy.sort((a, b) => b.mes.localeCompare(a.mes));
  }, [historico, hoje]);

  // Ensure current month exists
  useEffect(() => {
    if (!historico.some(h => h.mes === hoje)) {
      const lastSorted = [...historico].sort((a, b) => b.mes.localeCompare(a.mes));
      const last = lastSorted[0];
      const saldo = last ? last.saldo : dados.investimento.saldo;
      const taxa = dados.investimento.taxaRendimento;
      const rendimento = Math.round(saldo * (taxa / 100) * 100) / 100;
      atualizarDados({
        ...dados,
        investimento: {
          ...dados.investimento,
          historicoMensal: [...historico, { mes: hoje, saldo, taxa, rendimento }],
          saldo,
        },
      });
    }
  }, []);

  // Scroll to current month
  useEffect(() => {
    if (currentRowRef.current) {
      currentRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [sorted]);

  // For updating, we need to find the item by mes in the original array
  const updateByMes = (mes: string, updates: Partial<HistoricoInvestimento>) => {
    const copy = historico.map(h => {
      if (h.mes !== mes) return h;
      const updated = { ...h, ...updates };
      updated.rendimento = Math.round(updated.saldo * (updated.taxa / 100) * 100) / 100;
      return updated;
    });
    const newest = [...copy].sort((a, b) => b.mes.localeCompare(a.mes));
    atualizarDados({ ...dados, investimento: { ...dados.investimento, historicoMensal: copy, saldo: newest[0]?.saldo || dados.investimento.saldo } });
  };

  const confirmarTaxa = () => {
    if (!taxaDialog) return;
    const taxa = parseFloat(taxaDialog.taxa.replace(',', '.'));
    if (isNaN(taxa)) { toast.error('Taxa inválida'); return; }
    const copy = historico.map(h => {
      if (aplicarFuturos ? h.mes >= taxaDialog.mes : h.mes === taxaDialog.mes) {
        return { ...h, taxa, rendimento: Math.round(h.saldo * (taxa / 100) * 100) / 100 };
      }
      return h;
    });
    const newest = [...copy].sort((a, b) => b.mes.localeCompare(a.mes));
    atualizarDados({ ...dados, investimento: { ...dados.investimento, historicoMensal: copy, taxaRendimento: taxa, saldo: newest[0]?.saldo || dados.investimento.saldo } });
    toast.success(aplicarFuturos ? 'Taxa aplicada aos próximos' : 'Taxa atualizada');
    setTaxaDialog(null);
  };

  const adicionarMes = () => {
    const saldo = parseFloat(addSaldo.replace(',', '.'));
    const taxa = parseFloat(addTaxa.replace(',', '.'));
    if (!addMes || isNaN(saldo) || isNaN(taxa)) { toast.error('Preencha tudo'); return; }
    if (historico.some(h => h.mes === addMes)) { toast.error('Mês já existe'); return; }
    const rendimento = Math.round(saldo * (taxa / 100) * 100) / 100;
    atualizarDados({ ...dados, investimento: { ...dados.investimento, historicoMensal: [...historico, { mes: addMes, saldo, taxa, rendimento, fechado: addFechado }], saldo, taxaRendimento: taxa } });
    toast.success('Mês adicionado!');
    setAddDialog(false);
  };

  const sugerirProximoMes = () => {
    if (sorted.length === 0) return format(new Date(), 'yyyy-MM');
    const newest = sorted[0]; // already sorted newest first
    return format(addMonths(new Date(newest.mes + '-01'), 1), 'yyyy-MM');
  };

  const saveSaldoEdit = (mes: string) => {
    const val = parseFloat(editSaldoValue.replace(',', '.'));
    if (isNaN(val)) { toast.error('Valor inválido'); return; }
    updateByMes(mes, { saldo: val });
    setEditingSaldo(null);
    toast.success('Saldo atualizado');
  };

  const saldoAtual = sorted.length > 0 ? sorted[0].saldo : dados.investimento.saldo;

  // Get sorted by asc for differential calculation
  const sortedAsc = useMemo(() => [...sorted].reverse(), [sorted]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Patrimônio</h1>
          <p className="text-sm text-muted-foreground">Controle mensal da poupança</p>
        </div>
        <Button onClick={() => { setAddMes(sugerirProximoMes()); setAddSaldo(''); setAddTaxa(dados.investimento.taxaRendimento.toString()); setAddFechado(false); setAddDialog(true); }} size="sm" className="gap-1.5 h-8 text-xs">
          <Plus className="h-3.5 w-3.5" /> Adicionar Mês
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10"><Wallet className="h-4 w-4 text-primary" /></div>
            <div><p className="text-[10px] text-muted-foreground">Saldo Atual</p><p className="text-lg font-bold font-mono">{formatarMoeda(saldoAtual)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="h-4 w-4 text-success" /></div>
            <div><p className="text-[10px] text-muted-foreground">Taxa Atual</p><p className="text-lg font-bold font-mono">{dados.investimento.taxaRendimento}%</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Mês</TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
                <TableHead className="text-right text-[11px]">Saldo</TableHead>
                <TableHead className="text-right text-[11px]">Diferencial</TableHead>
                <TableHead className="text-right text-[11px]">Rendimento</TableHead>
                <TableHead className="text-right text-[11px]">Taxa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((h) => {
                const ascIdx = sortedAsc.findIndex(x => x.mes === h.mes);
                const anterior = ascIdx > 0 ? sortedAsc[ascIdx - 1] : null;
                const diferencial = anterior ? h.saldo - anterior.saldo : 0;
                const isFechado = h.fechado || h.mes < hoje;
                const isAtual = h.mes === hoje;
                return (
                  <TableRow
                    key={h.mes}
                    ref={isAtual ? currentRowRef : undefined}
                    className={isAtual ? 'bg-primary/5 ring-1 ring-primary/20' : ''}
                  >
                    <TableCell className="capitalize text-xs font-medium">
                      {format(new Date(h.mes + '-01'), "MMM/yy", { locale: ptBR })}
                      {isAtual && <Badge className="ml-1.5 text-[8px] h-3.5 bg-primary">Atual</Badge>}
                    </TableCell>
                    <TableCell>
                      {isFechado
                        ? <Badge variant="secondary" className="text-[9px] h-4 gap-0.5"><Lock className="h-2.5 w-2.5" />Fechado</Badge>
                        : <Badge variant="outline" className="text-[9px] h-4 gap-0.5"><Clock className="h-2.5 w-2.5" />Projeção</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingSaldo === h.mes ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            className="h-6 w-24 text-right text-xs font-mono"
                            value={editSaldoValue}
                            onChange={e => setEditSaldoValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveSaldoEdit(h.mes); if (e.key === 'Escape') setEditingSaldo(null); }}
                            autoFocus
                            inputMode="decimal"
                          />
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => saveSaldoEdit(h.mes)}>✓</Button>
                        </div>
                      ) : (
                        <button
                          className="text-xs font-mono font-medium hover:text-primary hover:underline cursor-pointer"
                          onClick={() => { setEditingSaldo(h.mes); setEditSaldoValue(h.saldo.toString()); }}
                        >
                          {formatarMoeda(h.saldo)}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {anterior && (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium font-mono ${diferencial >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {diferencial >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatarMoeda(Math.abs(diferencial))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-success font-mono">+{formatarMoeda(h.rendimento)}</TableCell>
                    <TableCell className="text-right">
                      <button
                        className="text-xs text-primary hover:underline font-mono"
                        onClick={() => { setTaxaDialog({ mes: h.mes, taxa: h.taxa.toString() }); setAplicarFuturos(false); }}
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

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Adicionar Mês</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Mês (YYYY-MM)</Label><Input value={addMes} onChange={e => setAddMes(e.target.value)} placeholder="2026-04" className="h-8" /></div>
            <div className="space-y-1"><Label className="text-xs">Valor Poupança (R$)</Label><Input value={addSaldo} onChange={e => setAddSaldo(e.target.value)} inputMode="decimal" className="h-8" /></div>
            <div className="space-y-1"><Label className="text-xs">Taxa (%)</Label><Input value={addTaxa} onChange={e => setAddTaxa(e.target.value)} inputMode="decimal" className="h-8" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" id="fech" checked={addFechado} onChange={e => setAddFechado(e.target.checked)} className="rounded" /><Label htmlFor="fech" className="text-xs">Já fechado</Label></div>
            <Button onClick={adicionarMes} className="w-full h-8 text-sm">Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!taxaDialog} onOpenChange={() => setTaxaDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Alterar Taxa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Nova taxa (%)</Label><Input value={taxaDialog?.taxa || ''} onChange={e => setTaxaDialog(p => p ? { ...p, taxa: e.target.value } : null)} inputMode="decimal" className="h-8" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" id="af" checked={aplicarFuturos} onChange={e => setAplicarFuturos(e.target.checked)} className="rounded" /><Label htmlFor="af" className="text-xs">Aplicar para próximos meses</Label></div>
            <Button onClick={confirmarTaxa} className="w-full h-8 text-sm">Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
