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
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function gerarMeses12() {
  const hoje = new Date();
  const meses: { value: string; label: string }[] = [];
  for (let i = -3; i <= 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    meses.push({ value: format(d, 'yyyy-MM'), label: format(d, "MMM yyyy", { locale: ptBR }) });
  }
  return meses;
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
    if (isNaN(valor) || valor < 0) { toast.error('Informe um valor válido'); return; }
    atualizarDados({
      ...dados,
      receitaConfig: { ...dados.receitaConfig, valorBase: valor, dataAlteracao: new Date().toISOString().slice(0, 10) },
    });
    toast.success('Salário líquido atualizado!');
  };

  const handleSalvarTaxa = () => {
    const valor = parseFloat(taxa.replace(',', '.'));
    if (isNaN(valor) || valor < 0) { toast.error('Informe uma taxa válida'); return; }
    atualizarDados({ ...dados, investimento: { ...dados.investimento, taxaRendimento: valor } });
    toast.success('Taxa de rendimento atualizada!');
  };

  const handleSalvarFechamento = () => {
    const dia = parseInt(diaFechamento);
    const venc = parseInt(diaVencimento);
    if (isNaN(dia) || dia < 1 || dia > 28 || isNaN(venc) || venc < 1 || venc > 28) {
      toast.error('Dias devem ser entre 1 e 28'); return;
    }
    atualizarDados({
      ...dados,
      fechamentoFatura: { ...dados.fechamentoFatura, diaPadrao: dia, diaVencimento: venc },
    });
    toast.success('Configuração de fatura atualizada!');
  };

  const abrirOverrideMes = (mes: string) => {
    const atual = getDiaFechamento(dados.fechamentoFatura, mes);
    setOverrideDia(dados.fechamentoFatura.overridesMes[mes]?.toString() || '');
    setOverrideDialog(mes);
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
    atualizarDados({
      ...dados,
      fechamentoFatura: { ...dados.fechamentoFatura, overridesMes: newOverrides },
    });
    toast.success('Fechamento do mês atualizado!');
    setOverrideDialog(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" /> Configurações
        </h1>
        <p className="text-muted-foreground text-sm">Configure valores padrão do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Banknote className="h-5 w-5" /> Salário Líquido Padrão</CardTitle>
          <CardDescription>Valor lançado automaticamente como receita mensal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>Valor mensal (R$)</Label>
              <Input value={salario} onChange={e => setSalario(e.target.value)} placeholder="0,00" inputMode="decimal" />
            </div>
            <Button onClick={handleSalvarSalario}>Salvar</Button>
          </div>
          <p className="text-sm text-muted-foreground">Valor atual: <span className="font-semibold text-foreground">{formatarMoeda(dados.receitaConfig.valorBase)}</span></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5" /> Taxa de Rendimento da Poupança</CardTitle>
          <CardDescription>Percentual mensal de rendimento calculado automaticamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>Taxa mensal (%)</Label>
              <Input value={taxa} onChange={e => setTaxa(e.target.value)} placeholder="0,5" inputMode="decimal" />
            </div>
            <Button onClick={handleSalvarTaxa}>Salvar</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Taxa atual: <span className="font-semibold text-foreground">{dados.investimento.taxaRendimento}% ao mês</span>
            {' · '}Saldo atual: <span className="font-semibold text-foreground">{formatarMoeda(dados.investimento.saldo)}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5" /> Fechamento da Fatura</CardTitle>
          <CardDescription>
            O dia de fechamento determina em qual mês uma compra no cartão será cobrada. Compras após o fechamento vão para a fatura do mês seguinte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Dia de Fechamento Padrão</Label>
              <Input type="number" min={1} max={28} value={diaFechamento} onChange={e => setDiaFechamento(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dia de Vencimento Padrão</Label>
              <Input type="number" min={1} max={28} value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSalvarFechamento}>Salvar</Button>

          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2 flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Fechamento por mês</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {meses12.map(m => {
                const diaEfetivo = getDiaFechamento(dados.fechamentoFatura, m.value);
                const temOverride = dados.fechamentoFatura.overridesMes[m.value] !== undefined;
                return (
                  <button
                    key={m.value}
                    onClick={() => abrirOverrideMes(m.value)}
                    className={`text-xs p-2 rounded-lg border text-left transition-colors hover:bg-accent ${temOverride ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <span className="font-medium capitalize">{m.label}</span>
                    <br />
                    <span className="text-muted-foreground">Fecha dia {diaEfetivo}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!overrideDialog} onOpenChange={() => setOverrideDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Fechamento - {overrideDialog}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Dia de fechamento (vazio = padrão: {dados.fechamentoFatura.diaPadrao})</Label>
              <Input type="number" min={1} max={28} value={overrideDia} onChange={e => setOverrideDia(e.target.value)} placeholder={`Padrão: ${dados.fechamentoFatura.diaPadrao}`} />
            </div>
            <Button onClick={salvarOverrideMes} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
