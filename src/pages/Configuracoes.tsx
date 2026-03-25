import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda } from '@/utils/financialCalculations';
import { getDiaFechamento } from '@/utils/fechamentoFatura';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Settings, Banknote, TrendingUp, CreditCard, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function gerarMeses12() {
  const hoje = new Date();
  return Array.from({ length: 16 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i - 3, 1);
    return { value: format(d, 'yyyy-MM'), label: format(d, "MMM yyyy", { locale: ptBR }) };
  });
}

export default function Configuracoes() {
  const { dados, atualizarDados } = useFinance();
  const [salario, setSalario] = useState(dados.receitaConfig.valorBase.toString());
  const [taxa, setTaxa] = useState(dados.investimento.taxaRendimento.toString());
  const [diaFechamento, setDiaFechamento] = useState(dados.fechamentoFatura.diaPadrao.toString());
  const [diaVencimento, setDiaVencimento] = useState(dados.fechamentoFatura.diaVencimento.toString());
  const [overrideDialog, setOverrideDialog] = useState<string | null>(null);
  const [overrideDia, setOverrideDia] = useState('');
  const meses12 = gerarMeses12();

  const handleSalvarSalario = () => {
    const valor = parseFloat(salario.replace(',', '.'));
    if (isNaN(valor) || valor < 0) { toast.error('Valor inválido'); return; }
    atualizarDados({ ...dados, receitaConfig: { ...dados.receitaConfig, valorBase: valor, dataAlteracao: new Date().toISOString().slice(0, 10) } });
    toast.success('Salário atualizado!');
  };

  const handleSalvarTaxa = () => {
    const valor = parseFloat(taxa.replace(',', '.'));
    if (isNaN(valor) || valor < 0) { toast.error('Taxa inválida'); return; }
    atualizarDados({ ...dados, investimento: { ...dados.investimento, taxaRendimento: valor } });
    toast.success('Taxa atualizada!');
  };

  const handleSalvarFechamento = () => {
    const dia = parseInt(diaFechamento);
    const venc = parseInt(diaVencimento);
    if (isNaN(dia) || dia < 1 || dia > 28 || isNaN(venc) || venc < 1 || venc > 28) { toast.error('Dias: 1-28'); return; }
    atualizarDados({ ...dados, fechamentoFatura: { ...dados.fechamentoFatura, diaPadrao: dia, diaVencimento: venc } });
    toast.success('Fatura configurada!');
  };

  const salvarOverrideMes = () => {
    if (!overrideDialog) return;
    const newOverrides = { ...dados.fechamentoFatura.overridesMes };
    if (overrideDia) {
      const d = parseInt(overrideDia);
      if (isNaN(d) || d < 1 || d > 28) { toast.error('Dia inválido'); return; }
      newOverrides[overrideDialog] = d;
    } else {
      delete newOverrides[overrideDialog];
    }
    atualizarDados({ ...dados, fechamentoFatura: { ...dados.fechamentoFatura, overridesMes: newOverrides } });
    toast.success('Fechamento atualizado!');
    setOverrideDialog(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="h-5 w-5" /> Configurações</h1>
        <p className="text-sm text-muted-foreground">Valores padrão do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5"><Banknote className="h-4 w-4" /> Salário Líquido</CardTitle>
            <CardDescription className="text-xs">Lançado como receita mensal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1"><Label className="text-xs">Valor (R$)</Label><Input value={salario} onChange={e => setSalario(e.target.value)} className="h-8" inputMode="decimal" /></div>
              <Button onClick={handleSalvarSalario} size="sm" className="h-8">Salvar</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Atual: <span className="font-semibold text-foreground font-mono">{formatarMoeda(dados.receitaConfig.valorBase)}</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Taxa Rendimento</CardTitle>
            <CardDescription className="text-xs">Percentual mensal da poupança</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1"><Label className="text-xs">Taxa (%)</Label><Input value={taxa} onChange={e => setTaxa(e.target.value)} className="h-8" inputMode="decimal" /></div>
              <Button onClick={handleSalvarTaxa} size="sm" className="h-8">Salvar</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Taxa: <span className="font-semibold text-foreground font-mono">{dados.investimento.taxaRendimento}%</span> · Saldo: <span className="font-semibold text-foreground font-mono">{formatarMoeda(dados.investimento.saldo)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Fechamento da Fatura</CardTitle>
          <CardDescription className="text-xs">Compras após o fechamento vão para a fatura seguinte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Dia Fechamento</Label><Input type="number" min={1} max={28} value={diaFechamento} onChange={e => setDiaFechamento(e.target.value)} className="h-8" /></div>
            <div className="space-y-1"><Label className="text-xs">Dia Vencimento</Label><Input type="number" min={1} max={28} value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)} className="h-8" /></div>
          </div>
          <Button onClick={handleSalvarFechamento} size="sm" className="h-8">Salvar</Button>

          <div className="pt-2 border-t">
            <p className="text-xs font-medium mb-2 flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Por mês</p>
            <div className="grid grid-cols-4 gap-1.5">
              {meses12.map(m => {
                const diaEfetivo = getDiaFechamento(dados.fechamentoFatura, m.value);
                const temOverride = dados.fechamentoFatura.overridesMes[m.value] !== undefined;
                return (
                  <button key={m.value} onClick={() => { setOverrideDia(dados.fechamentoFatura.overridesMes[m.value]?.toString() || ''); setOverrideDialog(m.value); }}
                    className={`text-[10px] p-1.5 rounded-md border text-left transition-colors hover:bg-accent ${temOverride ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <span className="font-medium capitalize">{m.label}</span><br />
                    <span className="text-muted-foreground">Dia {diaEfetivo}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!overrideDialog} onOpenChange={() => setOverrideDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Fechamento — {overrideDialog}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Dia (vazio = padrão: {dados.fechamentoFatura.diaPadrao})</Label><Input type="number" min={1} max={28} value={overrideDia} onChange={e => setOverrideDia(e.target.value)} placeholder={`${dados.fechamentoFatura.diaPadrao}`} className="h-8" /></div>
            <Button onClick={salvarOverrideMes} className="w-full h-8 text-sm">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
