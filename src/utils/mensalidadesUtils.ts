import { Mensalidade, Transacao, DadosFinanceiros } from '@/types/finance';

/**
 * Gera transações de mensalidades para um dado mês, se ainda não existirem.
 */
export function gerarTransacoesMensalidades(dados: DadosFinanceiros, mes: string): Transacao[] {
  const novas: Transacao[] = [];

  for (const m of dados.mensalidades) {
    if (!m.ativa) continue;
    if (mes < m.mesInicio) continue;
    if (m.mesFim && mes > m.mesFim) continue;

    // Verifica se já existe transação desta mensalidade neste mês
    const jaExiste = dados.transacoes.some(
      t => t.origemMensalidade === m.id && t.data.startsWith(mes)
    );
    if (jaExiste) continue;

    const override = m.overridesMes[mes];
    const valor = override?.valor ?? m.valorPadrao;
    const diaVenc = override?.diaVencimento ?? m.diaVencimento;
    const diaStr = String(diaVenc).padStart(2, '0');

    novas.push({
      id: crypto.randomUUID(),
      data: `${mes}-${diaStr}`,
      valor,
      descricao: m.descricao,
      categoriaId: m.categoriaId,
      tipo: 'despesa',
      formaPagamento: m.formaPagamento,
      status: 'pendente',
      origemMensalidade: m.id,
    });
  }

  return novas;
}
