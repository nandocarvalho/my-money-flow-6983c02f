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
  // Overrides por mês: { "2026-03": { valor: 150, diaVencimento: 10 } }
  overridesMes: Record<string, { valor?: number; diaVencimento?: number }>;
  mesesInativos?: string[];
}

export interface FechamentoFaturaConfig {
  diaPadrao: number;
  diaVencimento: number;
  // Override por mês: { "2026-03": 5 }
  overridesMes: Record<string, number>;
}

export interface OrcamentoMesConfig {
  // Override de limite por categoria por mês: { "2026-03": { "cat-mercado": 1000 } }
  overridesMes: Record<string, Record<string, number>>;
}

export interface DadosFinanceiros {
  transacoes: Transacao[];
  categorias: Categoria[];
  investimento: Investimento;
  receitaConfig: ReceitaConfig;
  mensalidades: Mensalidade[];
  fechamentoFatura: FechamentoFaturaConfig;
  orcamentoMes: OrcamentoMesConfig;
}
