import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda } from '@/utils/financialCalculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings, Banknote, TrendingUp } from 'lucide-react';

export default function Configuracoes() {
  const { dados, atualizarDados } = useFinance();
  const [salario, setSalario] = useState(dados.receitaConfig.valorBase.toString());
  const [taxa, setTaxa] = useState(dados.investimento.taxaRendimento.toString());

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
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            💡 As configurações de cartão de crédito (fechamento, vencimento, limite) foram movidas para a página <strong>Cartão de Crédito</strong> no menu lateral.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
