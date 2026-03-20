import { DadosFinanceiros, Transacao } from '@/types/finance';
import { format, subMonths } from 'date-fns';
import { formatarMoeda } from './financialCalculations';

export function gerarReceitasAutomaticas(dados: DadosFinanceiros, mes: string): Transacao[] {
  const novas: Transacao[] = [];
  const transacoesMes = dados.transacoes.filter(t => t.data.startsWith(mes));

  const jatemSalario = transacoesMes.some(t => t.tipo === 'receita' && t.descricao === 'Salário Líquido (automático)');
  if (!jatemSalario && dados.receitaConfig.valorBase > 0) {
    novas.push({
      id: crypto.randomUUID(),
      data: `${mes}-01`,
      valor: dados.receitaConfig.valorBase,
      descricao: 'Salário Líquido (automático)',
      categoriaId: dados.categorias[0]?.id || '',
      tipo: 'receita',
      formaPagamento: 'pix',
      status: 'pago',
    });
  }

  const jatemRendimento = transacoesMes.some(t => t.tipo === 'receita' && t.descricao.startsWith('Rendimento poupança'));
  if (!jatemRendimento && dados.investimento.taxaRendimento > 0) {
    const mesAnterior = format(subMonths(new Date(mes + '-01'), 1), 'yyyy-MM');
    const historicoAnterior = dados.investimento.historicoMensal.find(h => h.mes === mesAnterior);
    
    if (historicoAnterior && historicoAnterior.saldo > 0) {
      const rendimento = Math.round(historicoAnterior.saldo * (dados.investimento.taxaRendimento / 100) * 100) / 100;
      if (rendimento > 0) {
        novas.push({
          id: crypto.randomUUID(),
          data: `${mes}-01`,
          valor: rendimento,
          descricao: `Rendimento poupança (${formatarMoeda(historicoAnterior.saldo)} × ${dados.investimento.taxaRendimento}% - ref. ${mesAnterior.replace('-', '/')})`,
          categoriaId: dados.categorias[0]?.id || '',
          tipo: 'receita',
          formaPagamento: 'pix',
          status: 'pago',
        });
      }
    }
  }

  return novas;
}
