import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { calcularSaldoMes, calcularGastoPorCategoria, formatarMoeda } from '@/utils/financialCalculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, Legend } from 'recharts';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorios() {
  const { dados } = useFinance();
  const hoje = new Date();
  const mesAtual = format(hoje, 'yyyy-MM');

  const gastosCat = calcularGastoPorCategoria(dados.transacoes, mesAtual, dados);
  const pieData = dados.categorias
    .map(c => ({ name: c.nome, value: gastosCat[c.id] || 0, cor: `hsl(${c.cor})` }))
    .filter(d => d.value > 0);

  const meses6 = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(hoje, 5 - i);
    return { date: d, mes: format(d, 'yyyy-MM'), label: format(d, 'MMM', { locale: ptBR }) };
  });

  const barData = meses6.map(m => {
    const resumo = calcularSaldoMes(dados.transacoes, m.mes, dados);
    return { mes: m.label, receitas: resumo.receitas, despesas: resumo.despesas };
  });

  // Category trend: line chart with each category as a line over 6 months
  const categoryTrendData = useMemo(() => {
    return meses6.map(m => {
      const gastos = calcularGastoPorCategoria(dados.transacoes, m.mes, dados);
      const entry: Record<string, any> = { mes: m.label };
      dados.categorias.forEach(c => {
        entry[c.nome] = gastos[c.id] || 0;
      });
      return entry;
    });
  }, [dados, meses6]);

  const categoryColors = dados.categorias.map(c => ({ nome: c.nome, cor: `hsl(${c.cor})` }));

  const chartConfig: Record<string, { label: string; color: string }> = {
    receitas: { label: 'Receitas', color: 'hsl(142 71% 45%)' },
    despesas: { label: 'Despesas', color: 'hsl(0 72% 51%)' },
  };
  dados.categorias.forEach(c => {
    chartConfig[c.nome] = { label: c.nome, color: `hsl(${c.cor})` };
  });

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
          <CardTitle className="text-lg">Evolução por Categoria — Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-80">
            <LineChart data={categoryTrendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {categoryColors.map(c => (
                <Line key={c.nome} type="monotone" dataKey={c.nome} stroke={c.cor} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ChartContainer>
          <div className="flex flex-wrap gap-3 mt-3">
            {categoryColors.map(c => (
              <div key={c.nome} className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.cor }} />
                <span>{c.nome}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
