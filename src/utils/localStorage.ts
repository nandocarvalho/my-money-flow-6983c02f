import { DadosFinanceiros, Transacao, Categoria, Investimento, ReceitaConfig } from '@/types/finance';
import { format, subMonths, addMonths } from 'date-fns';

const STORAGE_KEY = 'financas_pessoais';

function gerarId(): string {
  return crypto.randomUUID();
}

function criarDadosIniciais(): DadosFinanceiros {
  const hoje = new Date();
  const mesAtual = format(hoje, 'yyyy-MM');
  const mesAnterior = format(subMonths(hoje, 1), 'yyyy-MM');
  const mes2Atras = format(subMonths(hoje, 2), 'yyyy-MM');

  const categorias: Categoria[] = [
    { id: 'cat-mercado', nome: 'Mercado', limite: 800, cor: '142 71% 45%', icone: '🛒' },
    { id: 'cat-saude', nome: 'Saúde', limite: 500, cor: '0 84% 60%', icone: '🏥' },
    { id: 'cat-educacao', nome: 'Educação', limite: 600, cor: '221 83% 53%', icone: '📚' },
    { id: 'cat-transporte', nome: 'Transporte', limite: 400, cor: '38 92% 50%', icone: '🚗' },
    { id: 'cat-lazer', nome: 'Lazer', limite: 300, cor: '270 70% 60%', icone: '🎮' },
    { id: 'cat-moradia', nome: 'Moradia', limite: 2000, cor: '200 70% 50%', icone: '🏠' },
  ];

  const grupoParcelado = gerarId();

  const transacoes: Transacao[] = [
    { id: gerarId(), data: `${mesAtual}-05`, valor: 450, descricao: 'Supermercado Mensal', categoriaId: 'cat-mercado', tipo: 'despesa', formaPagamento: 'cartao', status: 'pago' },
    { id: gerarId(), data: `${mesAtual}-10`, valor: 150, descricao: 'Consulta médica', categoriaId: 'cat-saude', tipo: 'despesa', formaPagamento: 'pix', status: 'pendente' },
    { id: gerarId(), data: `${mesAtual}-15`, valor: 200, descricao: 'Curso online', categoriaId: 'cat-educacao', tipo: 'despesa', formaPagamento: 'cartao', status: 'pago', parcela: { atual: 3, total: 10, grupoId: grupoParcelado } },
    { id: gerarId(), data: `${mesAtual}-08`, valor: 120, descricao: 'Combustível', categoriaId: 'cat-transporte', tipo: 'despesa', formaPagamento: 'cartao', status: 'pago' },
    { id: gerarId(), data: `${mesAtual}-20`, valor: 80, descricao: 'Cinema e jantar', categoriaId: 'cat-lazer', tipo: 'despesa', formaPagamento: 'pix', status: 'pendente' },
    { id: gerarId(), data: `${mesAtual}-01`, valor: 1500, descricao: 'Aluguel', categoriaId: 'cat-moradia', tipo: 'despesa', formaPagamento: 'boleto', status: 'pago' },
    { id: gerarId(), data: `${mesAtual}-01`, valor: 5000, descricao: 'Salário', categoriaId: 'cat-mercado', tipo: 'receita', formaPagamento: 'pix', status: 'pago' },
    { id: gerarId(), data: `${mesAnterior}-05`, valor: 520, descricao: 'Supermercado Mensal', categoriaId: 'cat-mercado', tipo: 'despesa', formaPagamento: 'cartao', status: 'pago' },
    { id: gerarId(), data: `${mesAnterior}-12`, valor: 300, descricao: 'Exame de sangue', categoriaId: 'cat-saude', tipo: 'despesa', formaPagamento: 'pix', status: 'pago' },
    { id: gerarId(), data: `${mesAnterior}-15`, valor: 200, descricao: 'Curso online', categoriaId: 'cat-educacao', tipo: 'despesa', formaPagamento: 'cartao', status: 'pago', parcela: { atual: 2, total: 10, grupoId: grupoParcelado } },
    { id: gerarId(), data: `${mesAnterior}-01`, valor: 1500, descricao: 'Aluguel', categoriaId: 'cat-moradia', tipo: 'despesa', formaPagamento: 'boleto', status: 'pago' },
    { id: gerarId(), data: `${mesAnterior}-01`, valor: 5000, descricao: 'Salário', categoriaId: 'cat-mercado', tipo: 'receita', formaPagamento: 'pix', status: 'pago' },
    { id: gerarId(), data: `${mes2Atras}-05`, valor: 480, descricao: 'Supermercado Mensal', categoriaId: 'cat-mercado', tipo: 'despesa', formaPagamento: 'cartao', status: 'pago' },
    { id: gerarId(), data: `${mes2Atras}-15`, valor: 200, descricao: 'Curso online', categoriaId: 'cat-educacao', tipo: 'despesa', formaPagamento: 'cartao', status: 'pago', parcela: { atual: 1, total: 10, grupoId: grupoParcelado } },
    { id: gerarId(), data: `${mes2Atras}-01`, valor: 1500, descricao: 'Aluguel', categoriaId: 'cat-moradia', tipo: 'despesa', formaPagamento: 'boleto', status: 'pago' },
    { id: gerarId(), data: `${mes2Atras}-01`, valor: 5000, descricao: 'Salário', categoriaId: 'cat-mercado', tipo: 'receita', formaPagamento: 'pix', status: 'pago' },
  ];

  for (let i = 4; i <= 10; i++) {
    const mesFuturo = format(addMonths(subMonths(hoje, 2), i - 1), 'yyyy-MM');
    transacoes.push({
      id: gerarId(),
      data: `${mesFuturo}-15`,
      valor: 200,
      descricao: 'Curso online',
      categoriaId: 'cat-educacao',
      tipo: 'despesa',
      formaPagamento: 'cartao',
      status: 'pendente',
      parcela: { atual: i, total: 10, grupoId: grupoParcelado },
    });
  }

  const investimento: Investimento = {
    saldo: 15000,
    taxaRendimento: 0.5,
    historicoMensal: [
      { mes: mes2Atras, saldo: 14700, taxa: 0.5, rendimento: 73.5 },
      { mes: mesAnterior, saldo: 14773.5, taxa: 0.5, rendimento: 73.87 },
      { mes: mesAtual, saldo: 15000, taxa: 0.5, rendimento: 75 },
    ],
  };

  const receitaConfig: ReceitaConfig = {
    valorBase: 5000,
    dataAlteracao: format(subMonths(hoje, 3), 'yyyy-MM-dd'),
    historico: [
      { mes: mes2Atras, valor: 5000 },
      { mes: mesAnterior, valor: 5000 },
      { mes: mesAtual, valor: 5000 },
    ],
  };

  return { transacoes, categorias, investimento, receitaConfig };
}

export function carregarDados(): DadosFinanceiros {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const dados = criarDadosIniciais();
  salvarDados(dados);
  return dados;
}

export function salvarDados(dados: DadosFinanceiros): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

export function resetarDados(): DadosFinanceiros {
  const dados = criarDadosIniciais();
  salvarDados(dados);
  return dados;
}
