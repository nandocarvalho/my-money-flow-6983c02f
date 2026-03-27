import { useState, useMemo, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { calcularSaldoMes, calcularGastoPorCategoria, formatarMoeda } from '@/utils/financialCalculations';
import { mesFaturaCartao } from '@/utils/fechamentoFatura';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Maximize2, X } from 'lucide-react';

export default function Relatorios() {
  const { dados, garantirTransacoesMes } = useFinance();
  const hoje = new Date();
  const mesAtual = format(hoje, 'yyyy-MM');

  // Global month selector
  const allMonths = useMemo(() => {
    const result: { value: string; label: string; isProjecao: boolean }[] = [];
    for (let i = -12; i <= 6; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mes = format(d, 'yyyy-MM');
      result.push({ value: mes, label: format(d, 'MMM/yy', { locale: ptBR }), isProjecao: mes > mesAtual });
    }
    return result;
  }, []);

  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (let i = -5; i <= 0; i++) {
      s.add(format(new Date(hoje.getFullYear(), hoje.getMonth() + i, 1), 'yyyy-MM'));
    }
    return s;
  });

  const [showProjections, setShowProjections] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);

  const toggleMonth = (mes: string) => {
    setSelectedMonths(prev => {
      const next = new Set(prev);
      if (next.has(mes)) { if (next.size > 1) next.delete(mes); }
      else next.add(mes);
      return next;
    });
  };

  const selectAll = () => {
    const s = new Set<string>();
    allMonths.forEach(m => { if (showProjections || !m.isProjecao) s.add(m.value); });
    setSelectedMonths(s);
  };

  const selectLast6 = () => {
    const s = new Set<string>();
    for (let i = -5; i <= 0; i++) {
      s.add(format(new Date(hoje.getFullYear(), hoje.getMonth() + i, 1), 'yyyy-MM'));
    }
    setSelectedMonths(s);
  };

  // Ensure transactions exist for selected months
  const activeMeses = useMemo(() => {
    const meses = Array.from(selectedMonths).sort();
    if (showProjections) {
      allMonths.filter(m => m.isProjecao).forEach(m => {
        if (!meses.includes(m.value)) meses.push(m.value);
      });
      meses.sort();
    }
    meses.forEach(m => garantirTransacoesMes(m));
    return meses;
  }, [selectedMonths, showProjections, garantirTransacoesMes, allMonths]);

  // Data for charts
  const chartData = useMemo(() => activeMeses.map(mes => {
    const resumo = calcularSaldoMes(dados.transacoes, mes, dados);
    const gastos = calcularGastoPorCategoria(dados.transacoes, mes, dados);

    // Split despesas: avista vs parcelado
    const despesasMes = dados.transacoes.filter(t => {
      if (t.tipo !== 'despesa') return false;
      if (t.formaPagamento === 'cartao') return mesFaturaCartao(t.data, dados.fechamentoFatura) === mes;
      return t.data.startsWith(mes);
    });
    const despAvista = despesasMes.filter(t => !t.parcela).reduce((s, t) => s + t.valor, 0);
    const despParcelado = despesasMes.filter(t => !!t.parcela).reduce((s, t) => s + t.valor, 0);

    const entry: Record<string, any> = {
      mes: format(new Date(mes + '-01'), 'MMM/yy', { locale: ptBR }),
      mesKey: mes,
      receitas: resumo.receitas,
      despesas: resumo.despesas,
      despAvista,
      despParcelado,
      isProjecao: mes > mesAtual,
    };
    dados.categorias.forEach(c => { entry[c.nome] = gastos[c.id] || 0; });
    return entry;
  }), [activeMeses, dados, mesAtual]);

  // Pie data (consolidated across selected months)
  const pieData = useMemo(() => {
    const totals: Record<string, number> = {};
    activeMeses.forEach(mes => {
      const gastos = calcularGastoPorCategoria(dados.transacoes, mes, dados);
      Object.entries(gastos).forEach(([catId, val]) => { totals[catId] = (totals[catId] || 0) + val; });
    });
    return dados.categorias.map(c => ({ name: c.nome, value: totals[c.id] || 0, cor: `hsl(${c.cor})` })).filter(d => d.value > 0);
  }, [activeMeses, dados]);

  // Credit card curve data
  const cardCurveData = useMemo(() => activeMeses.map(mes => {
    const cardTrans = dados.transacoes.filter(t => t.formaPagamento === 'cartao' && t.tipo === 'despesa' && mesFaturaCartao(t.data, dados.fechamentoFatura) === mes);
    const total = cardTrans.reduce((s, t) => s + t.valor, 0);
    const avista = cardTrans.filter(t => !t.parcela).reduce((s, t) => s + t.valor, 0);
    const parcelado = cardTrans.filter(t => !!t.parcela).reduce((s, t) => s + t.valor, 0);
    return { mes: format(new Date(mes + '-01'), 'MMM/yy', { locale: ptBR }), total, avista, parcelado };
  }), [activeMeses, dados]);

  const categoryColors = dados.categorias.map(c => ({ nome: c.nome, cor: `hsl(${c.cor})` }));

  const chartConfig: Record<string, { label: string; color: string }> = {
    receitas: { label: 'Receitas', color: 'hsl(var(--chart-2))' },
    despesas: { label: 'Despesas', color: 'hsl(var(--chart-5))' },
    despAvista: { label: 'Desp. À Vista', color: 'hsl(var(--chart-3))' },
    despParcelado: { label: 'Desp. Parcelado', color: 'hsl(var(--chart-4))' },
    total: { label: 'Total Cartão', color: 'hsl(var(--chart-1))' },
    avista: { label: 'À Vista', color: 'hsl(var(--chart-2))' },
    parcelado: { label: 'Parcelado', color: 'hsl(var(--chart-5))' },
  };
  dados.categorias.forEach(c => { chartConfig[c.nome] = { label: c.nome, color: `hsl(${c.cor})` }; });

  const renderFullscreenBtn = (chartId: string) => (
    <Button variant="ghost" size="icon" className="h-6 w-6 absolute top-2 right-2 z-10" onClick={() => setFullscreenChart(chartId)}>
      <Maximize2 className="h-3.5 w-3.5" />
    </Button>
  );

  const chartHeight = fullscreenChart ? 'h-[70vh]' : 'h-64';

  const renderChartContent = (chartId: string) => {
    switch (chartId) {
      case 'pie':
        return pieData.length === 0 ? (
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
        );
      case 'bar':
        return (
          <ChartContainer config={chartConfig} className={chartHeight}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" className="text-[10px]" />
              <YAxis className="text-[10px]" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="receitas" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="despesas" fill="hsl(var(--chart-5))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="despAvista" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="despParcelado" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        );
      case 'category':
        return (
          <>
            <ChartContainer config={chartConfig} className={chartHeight}>
              <LineChart data={chartData}>
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
          </>
        );
      case 'card':
        return (
          <ChartContainer config={chartConfig} className={chartHeight}>
            <LineChart data={cardCurveData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" className="text-[10px]" />
              <YAxis className="text-[10px]" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="avista" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="parcelado" stroke="hsl(var(--chart-5))" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 2" />
            </LineChart>
          </ChartContainer>
        );
      default: return null;
    }
  };

  const monthSelectorLabel = activeMeses.length === 1
    ? format(new Date(activeMeses[0] + '-01'), 'MMMM/yyyy', { locale: ptBR })
    : `${activeMeses.length} meses`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Análise visual das finanças</p>
      </div>

      {/* Global month selector */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Período: {monthSelectorLabel}</span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={selectLast6}>Últimos 6</Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={selectAll}>Todos</Button>
              <div className="flex items-center gap-1 ml-2">
                <Switch checked={showProjections} onCheckedChange={setShowProjections} className="scale-75" id="proj" />
                <Label htmlFor="proj" className="text-[10px] cursor-pointer">Projeções</Label>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {allMonths.filter(m => showProjections || !m.isProjecao).map(m => (
              <button
                key={m.value}
                onClick={() => toggleMonth(m.value)}
                className={`text-[10px] px-2 py-1 rounded-md border transition-colors capitalize ${
                  selectedMonths.has(m.value)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : m.isProjecao
                    ? 'border-dashed border-border text-muted-foreground hover:bg-muted'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="relative">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gastos por Categoria</CardTitle>
          </CardHeader>
          {renderFullscreenBtn('pie')}
          <CardContent>{renderChartContent('pie')}</CardContent>
        </Card>

        <Card className="relative">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Receita vs Despesa (À Vista + Parcelado)</CardTitle>
          </CardHeader>
          {renderFullscreenBtn('bar')}
          <CardContent>{renderChartContent('bar')}</CardContent>
        </Card>
      </div>

      <Card className="relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Curva por Categoria</CardTitle>
        </CardHeader>
        {renderFullscreenBtn('category')}
        <CardContent>{renderChartContent('category')}</CardContent>
      </Card>

      <Card className="relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Curva do Cartão de Crédito</CardTitle>
        </CardHeader>
        {renderFullscreenBtn('card')}
        <CardContent>
          {renderChartContent('card')}
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-1 text-[10px]"><div className="w-6 h-0.5 rounded" style={{ backgroundColor: 'hsl(var(--chart-1))' }} /><span>Total</span></div>
            <div className="flex items-center gap-1 text-[10px]"><div className="w-6 h-0.5 rounded border-dashed" style={{ backgroundColor: 'hsl(var(--chart-2))' }} /><span>À Vista</span></div>
            <div className="flex items-center gap-1 text-[10px]"><div className="w-6 h-0.5 rounded border-dashed" style={{ backgroundColor: 'hsl(var(--chart-5))' }} /><span>Parcelado</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen chart dialog */}
      <Dialog open={!!fullscreenChart} onOpenChange={() => setFullscreenChart(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full">
          <DialogHeader>
            <DialogTitle className="text-base">
              {fullscreenChart === 'pie' && 'Gastos por Categoria'}
              {fullscreenChart === 'bar' && 'Receita vs Despesa'}
              {fullscreenChart === 'category' && 'Curva por Categoria'}
              {fullscreenChart === 'card' && 'Curva do Cartão de Crédito'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {fullscreenChart && renderChartContent(fullscreenChart)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
