import { FechamentoFaturaConfig } from '@/types/finance';
import { addMonths, format } from 'date-fns';

export function getDiaFechamento(config: FechamentoFaturaConfig, mes: string): number {
  return config.overridesMes[mes] ?? config.diaPadrao;
}

/**
 * Dado uma data de transação de cartão e a config de fechamento,
 * retorna o mês (YYYY-MM) da fatura onde a compra se encaixa.
 */
export function mesFaturaCartao(dataTransacao: string, config: FechamentoFaturaConfig): string {
  const d = new Date(dataTransacao + 'T12:00:00');
  const dia = d.getDate();
  const mesCorrente = format(d, 'yyyy-MM');
  const diaFechamento = getDiaFechamento(config, mesCorrente);

  if (dia > diaFechamento) {
    const prox = addMonths(d, 1);
    return format(prox, 'yyyy-MM');
  }
  return mesCorrente;
}
