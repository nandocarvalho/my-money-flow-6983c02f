import { useFinance } from '@/contexts/FinanceContext';
import { calcularSaldoMes, calcularGastoPorCategoria, projetarInvestimentos, formatarMoeda } from '@/utils/financialCalculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorios() {
  const { dados } = useFinance();
  const hoje = new Date();
  const mesAtual = format(hoje, 'yyyy-MM');

  const gastosCat = calcularGastoPorCategoria(dados.transacoes, mesAtual);
  const pieData = dados.categorias
    .map(c => ({ name: c.nome, value: gastosCat[c.id] || 0, cor: `hsl(${c.cor})` }))
    .filter(d => d.value > 0);

  const barData = Array.from({ length: 6 }, (_, i) => {
    const mes = format(subMonths(hoje, 5 - i), 'yyyy-MM');
    const resumo = calcularSaldoMes(dados.transacoes, mes);
    return {
      mes: format(subMonths(hoje, 5 - i), 'MMM', { locale: ptBR }),
      receitas: resumo.receitas,
      despesas: resumo.despesas,
    };
  });

  const projecao = projetarInvestimentos(dados.investimento, 12);
  const lineData = projecao.map(h => ({
    mes: format(new Date(h.mes + '-01'), 'MMM/yy', { locale: ptBR }),
    saldo: h.saldo,
  }));

  const chartConfig = {
    receitas: { label: 'Receitas', color: 'hsl(142 71% 45%)' },
    despesas: { label: 'Despesas', color: 'hsl(0 72% 51%)' },
    saldo: { label: 'Saldo', color: 'hsl(217 91% 50%)' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Análise visual das suas finanças</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Gastos por Categoria — {format(hoje, "MMMM", { locale: ptBR })}</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Sem despesas neste mês</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-64 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50}>
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={d.cor} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.cor }} />
                    <span>{d.name}</span>
                    <span className="text-muted-foreground ml-auto">{formatarMoeda(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Receita vs Despesa — Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-72">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="receitas" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Projeção de Patrimônio</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-72">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="saldo" stroke="hsl(217 91% 50%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
