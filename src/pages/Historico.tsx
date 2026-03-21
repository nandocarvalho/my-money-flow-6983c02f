import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { calcularSaldoMes, formatarMoeda } from '@/utils/financialCalculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function Historico() {
  const { dados, garantirTransacoesMes } = useFinance();
  const hoje = new Date();
  const mesAtual = format(hoje, 'yyyy-MM');

  const meses = useMemo(() => {
    const result: { mes: string; label: string; isProjecao: boolean }[] = [];
    // 12 months back + current + 6 months forward
    for (let i = -12; i <= 6; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mes = format(d, 'yyyy-MM');
      result.push({
        mes,
        label: format(d, "MMM/yy", { locale: ptBR }),
        isProjecao: mes > mesAtual,
      });
    }
    return result;
  }, []);

  // Ensure transactions exist for each month
  useMemo(() => {
    meses.forEach(m => garantirTransacoesMes(m.mes));
  }, [meses, garantirTransacoesMes]);

  const rows = useMemo(() => {
    return meses.map(m => {
      const resumo = calcularSaldoMes(dados.transacoes, m.mes, dados);
      const poupanca = dados.investimento.historicoMensal.find(h => h.mes === m.mes);
      return {
        ...m,
        receitas: resumo.receitas,
        despesas: resumo.despesas,
        saldo: resumo.saldo,
        poupanca: poupanca?.saldo || 0,
      };
    });
  }, [meses, dados]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
        <p className="text-muted-foreground text-sm">Visão consolidada mensal e projeção</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Receitas</TableHead>
                  <TableHead className="text-right">Despesas</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Poupança</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => {
                  const saldoAnterior = idx > 0 ? rows[idx - 1].saldo : 0;
                  return (
                    <TableRow key={r.mes} className={r.isProjecao ? 'opacity-60' : ''}>
                      <TableCell className="capitalize font-medium">
                        {r.label}
                      </TableCell>
                      <TableCell>
                        {r.isProjecao ? (
                          <Badge variant="outline" className="text-[10px]">Projeção</Badge>
                        ) : r.mes === mesAtual ? (
                          <Badge variant="default" className="text-[10px] bg-primary">Atual</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Fechado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-[hsl(var(--success))]">
                        {formatarMoeda(r.receitas)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatarMoeda(r.despesas)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center gap-1 font-medium ${r.saldo >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                          {r.saldo >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {formatarMoeda(r.saldo)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {r.poupanca > 0 ? formatarMoeda(r.poupanca) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
