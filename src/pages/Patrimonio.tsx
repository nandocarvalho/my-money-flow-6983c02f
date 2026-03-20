import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { projetarInvestimentos, formatarMoeda } from '@/utils/financialCalculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { TrendingUp, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Patrimonio() {
  const { dados, atualizarDados } = useFinance();
  const [novoSaldo, setNovoSaldo] = useState(dados.investimento.saldo.toString());
  const [novaTaxa, setNovaTaxa] = useState(dados.investimento.taxaRendimento.toString());

  const projecao = projetarInvestimentos(dados.investimento, 12);

  const atualizar = () => {
    const saldo = parseFloat(novoSaldo);
    const taxa = parseFloat(novaTaxa);
    if (isNaN(saldo) || isNaN(taxa)) {
      toast.error('Valores inválidos');
      return;
    }
    const mesAtual = format(new Date(), 'yyyy-MM');
    const historico = dados.investimento.historicoMensal.map(h =>
      h.mes === mesAtual ? { ...h, saldo, taxa } : h
    );
    atualizarDados({
      ...dados,
      investimento: { saldo, taxaRendimento: taxa, historicoMensal: historico },
    });
    toast.success('Patrimônio atualizado!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patrimônio</h1>
        <p className="text-muted-foreground text-sm">Investimentos e projeções</p>
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
                <p className="text-2xl font-bold">{formatarMoeda(dados.investimento.saldo)}</p>
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
                <p className="text-xs text-muted-foreground">Taxa Mensal</p>
                <p className="text-2xl font-bold">{dados.investimento.taxaRendimento}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Atualizar Patrimônio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Saldo Atual (R$)</Label>
              <Input value={novoSaldo} onChange={e => setNovoSaldo(e.target.value)} type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Taxa de Rendimento (% ao mês)</Label>
              <Input value={novaTaxa} onChange={e => setNovaTaxa(e.target.value)} type="number" step="0.01" />
            </div>
          </div>
          <Button onClick={atualizar}>Salvar Alterações</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Projeção 12 Meses (Juros Compostos)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Rendimento</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projecao.map(h => (
                <TableRow key={h.mes}>
                  <TableCell className="capitalize">
                    {format(new Date(h.mes + '-01'), "MMM 'de' yy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatarMoeda(h.saldo)}</TableCell>
                  <TableCell className="text-right text-[hsl(var(--success))]">+{formatarMoeda(h.rendimento)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{h.taxa}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
