export interface Transacao {
  id: string;
  data: string; // ISO date string
  valor: number;
  descricao: string;
  categoriaId: string;
  tipo: 'despesa' | 'receita';
  formaPagamento: 'cartao' | 'boleto' | 'pix' | 'dinheiro';
  status: 'pago' | 'pendente';
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
  taxaRendimento: number; // percentual mensal
  historicoMensal: HistoricoInvestimento[];
}

export interface HistoricoInvestimento {
  mes: string; // YYYY-MM
  saldo: number;
  taxa: number;
  rendimento: number;
}

export interface ReceitaConfig {
  valorBase: number;
  dataAlteracao: string; // ISO date
  historico: { mes: string; valor: number }[];
}

export interface DadosFinanceiros {
  transacoes: Transacao[];
  categorias: Categoria[];
  investimento: Investimento;
  receitaConfig: ReceitaConfig;
}
