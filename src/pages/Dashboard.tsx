import { useFinance } from '@/contexts/FinanceContext';
import { calcularSaldoMes, calcularGastoPorCategoria, formatarMoeda } from '@/utils/financialCalculations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Wallet, MinusCircle, PlusCircle, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { dados } = useFinance();
  const mesAtual = format(new Date(), 'yyyy-MM');
  const resumo = calcularSaldoMes(dados.transacoes, mesAtual);
  const gastosPorCategoria = calcularGastoPorCategoria(dados.transacoes, mesAtual);
  const mesLabel = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm capitalize">{mesLabel}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Saldo do Mês</p>
                <p className={`text-2xl font-bold mt-1 ${resumo.saldo >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                  {formatarMoeda(resumo.saldo)}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${resumo.saldo >= 0 ? 'bg-[hsl(var(--success)/0.1)]' : 'bg-destructive/10'}`}>
                <Wallet className={`h-5 w-5 ${resumo.saldo >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Receitas</p>
                <p className="text-2xl font-bold mt-1 text-[hsl(var(--success))]">{formatarMoeda(resumo.receitas)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[hsl(var(--success)/0.1)]">
                <ArrowUpRight className="h-5 w-5 text-[hsl(var(--success))]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Despesas</p>
                <p className="text-2xl font-bold mt-1 text-destructive">{formatarMoeda(resumo.despesas)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <ArrowDownRight className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Patrimônio</p>
                <p className="text-2xl font-bold mt-1">{formatarMoeda(dados.investimento.saldo)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Orçamento por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dados.categorias.map(cat => {
            const gasto = gastosPorCategoria[cat.id] || 0;
            const pct = cat.limite > 0 ? Math.min((gasto / cat.limite) * 100, 100) : 0;
            const excedeu = gasto > cat.limite;

            return (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {cat.icone} {cat.nome}
                  </span>
                  <span className={excedeu ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                    {formatarMoeda(gasto)} / {formatarMoeda(cat.limite)}
                  </span>
                </div>
                <Progress
                  value={pct}
                  className="h-2"
                  style={{
                    '--progress-color': excedeu ? 'hsl(var(--destructive))' : `hsl(${cat.cor})`,
                  } as React.CSSProperties}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button asChild size="lg" className="h-auto py-4 flex-col gap-2">
          <Link to="/nova-despesa">
            <MinusCircle className="h-5 w-5" />
            Nova Despesa
          </Link>
        </Button>
        <Button asChild variant="secondary" size="lg" className="h-auto py-4 flex-col gap-2">
          <Link to="/nova-receita">
            <PlusCircle className="h-5 w-5" />
            Nova Receita
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-auto py-4 flex-col gap-2">
          <Link to="/lancamentos">
            <ArrowDownRight className="h-5 w-5" />
            Ver Lançamentos
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-auto py-4 flex-col gap-2">
          <Link to="/relatorios">
            <TrendingUp className="h-5 w-5" />
            Relatórios
          </Link>
        </Button>
      </div>

      {resumo.despesasPendentes > 0 && (
        <Card className="border-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.05)]">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-[hsl(var(--warning))]">
              ⚠️ Você tem {formatarMoeda(resumo.despesasPendentes)} em despesas pendentes este mês
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
