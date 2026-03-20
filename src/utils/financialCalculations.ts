import { Transacao, Investimento, HistoricoInvestimento, DadosFinanceiros } from '@/types/finance';
import { addMonths, format } from 'date-fns';
import { mesFaturaCartao } from './fechamentoFatura';

export function gerarParcelas(
  baseTransacao: Omit<Transacao, 'id' | 'parcela'>,
  totalParcelas: number,
  valorTotal: number
): Transacao[] {
  const valorParcela = Math.round((valorTotal / totalParcelas) * 100) / 100;
  const grupoId = crypto.randomUUID();
  const dataBase = new Date(baseTransacao.data);

  return Array.from({ length: totalParcelas }, (_, i) => ({
    id: crypto.randomUUID(),
    ...baseTransacao,
    data: format(addMonths(dataBase, i), 'yyyy-MM-dd'),
    valor: valorParcela,
    status: i === 0 ? ('pago' as const) : ('pendente' as const),
    parcela: { atual: i + 1, total: totalParcelas, grupoId },
  }));
}

export function projetarInvestimentos(
  investimento: Investimento,
  mesesFuturos: number = 12
): HistoricoInvestimento[] {
  const historico = [...investimento.historicoMensal];
  const ultimo = historico[historico.length - 1];
  if (!ultimo) return [];

  let saldoAtual = ultimo.saldo;
  const taxa = investimento.taxaRendimento;
  const dataBase = new Date(ultimo.mes + '-01');

  for (let i = 1; i <= mesesFuturos; i++) {
    const rendimento = Math.round(saldoAtual * (taxa / 100) * 100) / 100;
    saldoAtual = Math.round((saldoAtual + rendimento) * 100) / 100;
    historico.push({
      mes: format(addMonths(dataBase, i), 'yyyy-MM'),
      saldo: saldoAtual,
      taxa,
      rendimento,
    });
  }

  return historico;
}

export function calcularSaldoMes(transacoes: Transacao[], mes: string, dados?: DadosFinanceiros): {
  receitas: number;
  despesas: number;
  saldo: number;
  despesasPagas: number;
  despesasPendentes: number;
} {
  let despesasList: Transacao[];

  if (dados) {
    // For despesas with cartao, use fatura logic
    despesasList = transacoes.filter(t => {
      if (t.tipo !== 'despesa') return false;
      if (t.formaPagamento === 'cartao') {
        return mesFaturaCartao(t.data, dados.fechamentoFatura) === mes;
      }
      return t.data.startsWith(mes);
    });
  } else {
    despesasList = transacoes.filter(t => t.tipo === 'despesa' && t.data.startsWith(mes));
  }

  const receitasDoMes = transacoes.filter(t => t.tipo === 'receita' && t.data.startsWith(mes));
  const receitas = receitasDoMes.reduce((s, t) => s + t.valor, 0);
  const despesas = despesasList.reduce((s, t) => s + t.valor, 0);
  const despesasPagas = despesasList.filter(t => t.status === 'pago').reduce((s, t) => s + t.valor, 0);
  const despesasPendentes = despesasList.filter(t => t.status === 'pendente').reduce((s, t) => s + t.valor, 0);

  return { receitas, despesas, saldo: receitas - despesas, despesasPagas, despesasPendentes };
}

export function calcularGastoPorCategoria(transacoes: Transacao[], mes: string, dados?: DadosFinanceiros) {
  let despesasDoMes: Transacao[];

  if (dados) {
    despesasDoMes = transacoes.filter(t => {
      if (t.tipo !== 'despesa') return false;
      if (t.formaPagamento === 'cartao') {
        return mesFaturaCartao(t.data, dados.fechamentoFatura) === mes;
      }
      return t.data.startsWith(mes);
    });
  } else {
    despesasDoMes = transacoes.filter(t => t.data.startsWith(mes) && t.tipo === 'despesa');
  }

  const gastos: Record<string, number> = {};
  despesasDoMes.forEach(t => {
    gastos[t.categoriaId] = (gastos[t.categoriaId] || 0) + t.valor;
  });
  return gastos;
}

export function getLimiteMesCategoria(dados: DadosFinanceiros, categoriaId: string, mes: string): number {
  const override = dados.orcamentoMes.overridesMes[mes]?.[categoriaId];
  if (override !== undefined) return override;
  const cat = dados.categorias.find(c => c.id === categoriaId);
  return cat?.limite ?? 0;
}

export function getDespesasDoMesPorCategoria(transacoes: Transacao[], mes: string, categoriaId: string, dados?: DadosFinanceiros): Transacao[] {
  if (dados) {
    return transacoes.filter(t => {
      if (t.tipo !== 'despesa' || t.categoriaId !== categoriaId) return false;
      if (t.formaPagamento === 'cartao') {
        return mesFaturaCartao(t.data, dados.fechamentoFatura) === mes;
      }
      return t.data.startsWith(mes);
    });
  }
  return transacoes.filter(t => t.data.startsWith(mes) && t.tipo === 'despesa' && t.categoriaId === categoriaId);
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
