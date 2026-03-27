import { useMemo, useEffect, useRef } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { calcularSaldoMes, formatarMoeda } from '@/utils/financialCalculations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function Historico() {
  const { dados, garantirTransacoesMes } = useFinance();
  const hoje = new Date();
  const mesAtual = format(hoje, 'yyyy-MM');
  const currentRowRef = useRef<HTMLTableRowElement>(null);

  const meses = useMemo(() => {
    const result: { mes: string; label: string; isProjecao: boolean }[] = [];
    for (let i = -12; i <= 6; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mes = format(d, 'yyyy-MM');
      result.push({ mes, label: format(d, "MMM/yy", { locale: ptBR }), isProjecao: mes > mesAtual });
    }
    return result;
  }, []);

  useMemo(() => { meses.forEach(m => garantirTransacoesMes(m.mes)); }, [meses, garantirTransacoesMes]);

  const rows = useMemo(() => meses.map(m => {
    const resumo = calcularSaldoMes(dados.transacoes, m.mes, dados);
    const poupanca = dados.investimento.historicoMensal.find(h => h.mes === m.mes);
    return { ...m, receitas: resumo.receitas, despesas: resumo.despesas, saldo: resumo.saldo, poupanca: poupanca?.saldo || 0 };
  }), [meses, dados]);

  // Sort newest first
  const sortedRows = useMemo(() => [...rows].sort((a, b) => b.mes.localeCompare(a.mes)), [rows]);

  // Scroll to current month
  useEffect(() => {
    if (currentRowRef.current) {
      currentRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [sortedRows]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Histórico</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada mensal e projeção</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Mês</TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
                <TableHead className="text-right text-[11px]">Receitas</TableHead>
                <TableHead className="text-right text-[11px]">Despesas</TableHead>
                <TableHead className="text-right text-[11px]">Saldo</TableHead>
                <TableHead className="text-right text-[11px]">Poupança</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map(r => {
                const isAtual = r.mes === mesAtual;
                return (
                  <TableRow
                    key={r.mes}
                    ref={isAtual ? currentRowRef : undefined}
                    className={isAtual ? 'bg-primary/5 ring-1 ring-primary/20' : r.isProjecao ? 'opacity-50' : ''}
                  >
                    <TableCell className="capitalize text-xs font-medium">
                      {r.label}
                      {isAtual && <Badge className="ml-1.5 text-[8px] h-3.5 bg-primary">Atual</Badge>}
                    </TableCell>
                    <TableCell>
                      {r.isProjecao ? <Badge variant="outline" className="text-[9px] h-4">Projeção</Badge>
                        : isAtual ? <Badge className="text-[9px] h-4 bg-primary">Atual</Badge>
                        : <Badge variant="secondary" className="text-[9px] h-4">Fechado</Badge>}
                    </TableCell>
                    <TableCell className="text-right text-xs text-success font-mono">{formatarMoeda(r.receitas)}</TableCell>
                    <TableCell className="text-right text-xs text-destructive font-mono">{formatarMoeda(r.despesas)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center gap-0.5 text-xs font-medium font-mono ${r.saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {r.saldo >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {formatarMoeda(r.saldo)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono font-medium">{r.poupanca > 0 ? formatarMoeda(r.poupanca) : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
