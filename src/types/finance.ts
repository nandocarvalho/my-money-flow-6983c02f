export interface Transacao {
  id: string;
  data: string; // ISO date string
  valor: number;
  descricao: string;
  categoriaId: string;
  tipo: 'despesa' | 'receita';
  formaPagamento: 'cartao' | 'boleto' | 'pix' | 'dinheiro';
  status: 'pago' | 'pendente';
  origemMensalidade?: string; // id da mensalidade que gerou
  cartaoId?: string; // id do cartão de crédito
  parcela?: {
    atual: number;
    total: number;
    grupoId: string;
  };
}

export interface Categoria {
  id: string;
  nome: string;
  limite: number;
  cor: string;
  icone: string;
}

export interface Investimento {
  saldo: number;
  taxaRendimento: number;
  historicoMensal: HistoricoInvestimento[];
}

export interface HistoricoInvestimento {
  mes: string;
  saldo: number;
  taxa: number;
  rendimento: number;
  fechado?: boolean;
}

export interface ReceitaConfig {
  valorBase: number;
  dataAlteracao: string;
  historico: { mes: string; valor: number }[];
}

export interface Mensalidade {
  id: string;
  descricao: string;
  valorPadrao: number;
  categoriaId: string;
  formaPagamento: 'cartao' | 'boleto' | 'pix' | 'dinheiro';
  diaVencimento: number;
  mesInicio: string; // YYYY-MM
  mesFim?: string; // YYYY-MM (opcional)
  ativa: boolean;
  overridesMes: Record<string, { valor?: number; diaVencimento?: number }>;
  mesesInativos?: string[];
  cartaoId?: string;
}

export interface FechamentoFaturaConfig {
  diaPadrao: number;
  diaVencimento: number;
  overridesMes: Record<string, number>;
}

export interface OrcamentoMesConfig {
  overridesMes: Record<string, Record<string, number>>;
}

export interface CartaoCredito {
  id: string;
  nome: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  cor: string;
}

export interface DadosFinanceiros {
  transacoes: Transacao[];
  categorias: Categoria[];
  investimento: Investimento;
  receitaConfig: ReceitaConfig;
  mensalidades: Mensalidade[];
  fechamentoFatura: FechamentoFaturaConfig;
  orcamentoMes: OrcamentoMesConfig;
  cartoes: CartaoCredito[];
}
