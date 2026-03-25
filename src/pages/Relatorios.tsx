import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { calcularSaldoMes, calcularGastoPorCategoria, formatarMoeda } from '@/utils/financialCalculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorios() {
  const { dados } = useFinance();
  const hoje = new Date();
  const mesAtual = format(hoje, 'yyyy-MM');

  const gastosCat = calcularGastoPorCategoria(dados.transacoes, mesAtual, dados);
  const pieData = dados.categorias.map(c => ({ name: c.nome, value: gastosCat[c.id] || 0, cor: `hsl(${c.cor})` })).filter(d => d.value > 0);

  const meses6 = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(hoje, 5 - i);
    return { date: d, mes: format(d, 'yyyy-MM'), label: format(d, 'MMM', { locale: ptBR }) };
  });

  const barData = meses6.map(m => {
    const resumo = calcularSaldoMes(dados.transacoes, m.mes, dados);
    return { mes: m.label, receitas: resumo.receitas, despesas: resumo.despesas };
  });

  const categoryTrendData = useMemo(() => meses6.map(m => {
    const gastos = calcularGastoPorCategoria(dados.transacoes, m.mes, dados);
    const entry: Record<string, any> = { mes: m.label };
    dados.categorias.forEach(c => { entry[c.nome] = gastos[c.id] || 0; });
    return entry;
  }), [dados, meses6]);

  const categoryColors = dados.categorias.map(c => ({ nome: c.nome, cor: `hsl(${c.cor})` }));

  const chartConfig: Record<string, { label: string; color: string }> = {
    receitas: { label: 'Receitas', color: 'hsl(var(--chart-2))' },
    despesas: { label: 'Despesas', color: 'hsl(var(--chart-5))' },
  };
  dados.categorias.forEach(c => { chartConfig[c.nome] = { label: c.nome, color: `hsl(${c.cor})` }; });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Análise visual das finanças</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Gastos por Categoria — {format(hoje, "MMMM", { locale: ptBR })}</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">Sem despesas</p>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ChartContainer config={chartConfig} className="w-56 h-56">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} strokeWidth={2}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.cor} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-1.5 w-full">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.cor }} />
                      <span className="flex-1">{d.name}</span>
                      <span className="text-muted-foreground font-mono">{formatarMoeda(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Receita vs Despesa — 6 Meses</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-[10px]" />
                <YAxis className="text-[10px]" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="receitas" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="despesas" fill="hsl(var(--chart-5))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução por Categoria — 6 Meses</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-72">
            <LineChart data={categoryTrendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" className="text-[10px]" />
              <YAxis className="text-[10px]" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {categoryColors.map(c => <Line key={c.nome} type="monotone" dataKey={c.nome} stroke={c.cor} strokeWidth={2} dot={{ r: 2.5 }} />)}
            </LineChart>
          </ChartContainer>
          <div className="flex flex-wrap gap-3 mt-3">
            {categoryColors.map(c => (
              <div key={c.nome} className="flex items-center gap-1 text-[10px]">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.cor }} />
                <span>{c.nome}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
