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
    if (isNaN(valor) || valor < 0) {
      toast.error('Informe um valor válido');
      return;
    }
    atualizarDados({
      ...dados,
      receitaConfig: {
        ...dados.receitaConfig,
        valorBase: valor,
        dataAlteracao: new Date().toISOString().slice(0, 10),
      },
    });
    toast.success('Salário líquido atualizado!');
  };

  const handleSalvarTaxa = () => {
    const valor = parseFloat(taxa.replace(',', '.'));
    if (isNaN(valor) || valor < 0) {
      toast.error('Informe uma taxa válida');
      return;
    }
    atualizarDados({
      ...dados,
      investimento: {
        ...dados.investimento,
        taxaRendimento: valor,
      },
    });
    toast.success('Taxa de rendimento atualizada!');
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
          <CardTitle className="flex items-center gap-2 text-lg">
            <Banknote className="h-5 w-5" /> Salário Líquido Padrão
          </CardTitle>
          <CardDescription>
            Este valor será lançado automaticamente como receita em cada mês. Você pode alterar o valor de meses específicos na tela de lançamentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>Valor mensal (R$)</Label>
              <Input
                value={salario}
                onChange={e => setSalario(e.target.value)}
                placeholder="0,00"
                type="text"
                inputMode="decimal"
              />
            </div>
            <Button onClick={handleSalvarSalario}>Salvar</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Valor atual: <span className="font-semibold text-foreground">{formatarMoeda(dados.receitaConfig.valorBase)}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" /> Taxa de Rendimento da Poupança
          </CardTitle>
          <CardDescription>
            Percentual mensal de rendimento. O rendimento é calculado automaticamente sobre o saldo do mês anterior e lançado como receita.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>Taxa mensal (%)</Label>
              <Input
                value={taxa}
                onChange={e => setTaxa(e.target.value)}
                placeholder="0,5"
                type="text"
                inputMode="decimal"
              />
            </div>
            <Button onClick={handleSalvarTaxa}>Salvar</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Taxa atual: <span className="font-semibold text-foreground">{dados.investimento.taxaRendimento}% ao mês</span>
            {' · '}Saldo atual: <span className="font-semibold text-foreground">{formatarMoeda(dados.investimento.saldo)}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
