import { Category, Transaction, CategoryBudget, EmergencyFund, InvestmentAsset, DistributionSettings, IncomeSource } from './types';

export const initialCategories: Category[] = [
  { id: 'cat-1', name: 'Moradia', type: 'expense', color: '#3b82f6' },
  { id: 'cat-2', name: 'Alimentação', type: 'expense', color: '#f59e0b' },
  { id: 'cat-3', name: 'Transporte', type: 'expense', color: '#10b981' },
  { id: 'cat-4', name: 'Lazer & Restaurantes', type: 'expense', color: '#ef4444' },
  { id: 'cat-5', name: 'Saúde & Cuidados', type: 'expense', color: '#8b5cf6' },
  { id: 'cat-6', name: 'Contas & Serviços', type: 'expense', color: '#06b6d4' },
  { id: 'cat-7', name: 'Educação & Cursos', type: 'expense', color: '#ec4899' },
  { id: 'cat-8', name: 'Salário & Renda CLT', type: 'income', color: '#10b981' },
  { id: 'cat-9', name: 'Freelance & Outras Rendas', type: 'income', color: '#6366f1' },
];

// Padrão zerado inicial
export const initialTransactions: Transaction[] = [];

export const initialBudgets: CategoryBudget[] = [
  { id: 'b-1', categoryId: 'cat-1', categoryName: 'Moradia (Aluguel, Condomínio, Contas)', planned: 0, spent: 0 },
  { id: 'b-2', categoryId: 'cat-2', categoryName: 'Alimentação (Supermercado & Delivery)', planned: 0, spent: 0 },
  { id: 'b-3', categoryId: 'cat-3', categoryName: 'Transporte (Combustível & Apps)', planned: 0, spent: 0 },
  { id: 'b-4', categoryId: 'cat-4', categoryName: 'Lazer & Restaurantes', planned: 0, spent: 0 },
  { id: 'b-5', categoryId: 'cat-5', categoryName: 'Saúde & Farmácia', planned: 0, spent: 0 },
  { id: 'b-6', categoryId: 'cat-6', categoryName: 'Contas & Serviços', planned: 0, spent: 0 },
];

export const initialEmergencyFund: EmergencyFund = {
  currentBalance: 0,
  targetAmount: 0,
  monthlyAverageExpense: 0,
};

export const initialAssets: InvestmentAsset[] = [];

export const initialDistribution: DistributionSettings = {
  emergencyPct: 60,
  investPct: 30,
  freePct: 10,
};

/**
 * Gera um cenário financeiro completo e realista para testes imediatos.
 * As datas são calculadas dinamicamente com base no ano e mês corrente
 * para garantir que todos os cálculos de safe-to-spend, orçamento mensal e
 * relatórios fiquem ativos no dashboard.
 */
export function getDemoFinancialData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const fmtDate = (day: number) => {
    const d = String(Math.min(28, Math.max(1, day))).padStart(2, '0');
    return `${year}-${month}-${d}`;
  };

  const incomeSources: IncomeSource[] = [
    {
      id: 'inc-1',
      name: 'Salário Líquido CLT (Empresa Tech)',
      amount: 5800.0,
      frequency: 'monthly',
    },
    {
      id: 'inc-2',
      name: 'Freelance Desenvolvimento / Design',
      amount: 1200.0,
      frequency: 'monthly',
    },
  ];

  const budgets: CategoryBudget[] = [
    { id: 'b-1', categoryId: 'cat-1', categoryName: 'Moradia (Aluguel, Condomínio, Contas)', planned: 2200.0, spent: 1850.0 },
    { id: 'b-2', categoryId: 'cat-2', categoryName: 'Alimentação (Supermercado & Delivery)', planned: 1400.0, spent: 965.0 },
    { id: 'b-3', categoryId: 'cat-3', categoryName: 'Transporte (Combustível & Apps)', planned: 450.0, spent: 254.5 },
    { id: 'b-4', categoryId: 'cat-4', categoryName: 'Lazer & Restaurantes', planned: 650.0, spent: 253.0 },
    { id: 'b-5', categoryId: 'cat-5', categoryName: 'Saúde & Farmácia', planned: 450.0, spent: 405.0 },
    { id: 'b-6', categoryId: 'cat-6', categoryName: 'Contas & Serviços', planned: 480.0, spent: 325.4 },
  ];

  const emergencyFund: EmergencyFund = {
    monthlyAverageExpense: 4000.0,
    targetAmount: 24000.0, // 6 meses de segurança financeira
    currentBalance: 14800.0, // 61.6% da meta atingida
  };

  const assets: InvestmentAsset[] = [
    {
      id: 'ast-1',
      name: 'Tesouro Selic 2029',
      institution: 'Tesouro Direto / Nubank',
      category: 'Renda Fixa',
      appliedAmount: 10000.0,
      currentAmount: 10450.0,
    },
    {
      id: 'ast-2',
      name: 'CDB 110% do CDI com Liquidez Diária',
      institution: 'Banco Inter',
      category: 'Renda Fixa',
      appliedAmount: 5000.0,
      currentAmount: 5320.0,
    },
    {
      id: 'ast-3',
      name: 'FII CSHG Logística (HGLG11)',
      institution: 'XP Investimentos',
      category: 'FIIs',
      appliedAmount: 4000.0,
      currentAmount: 4250.0,
    },
    {
      id: 'ast-4',
      name: 'FII Maxi Renda (MXRF11)',
      institution: 'XP Investimentos',
      category: 'FIIs',
      appliedAmount: 2500.0,
      currentAmount: 2580.0,
    },
    {
      id: 'ast-5',
      name: 'ETF S&P 500 Dólar (IVVB11)',
      institution: 'BTG Pactual',
      category: 'Ações',
      appliedAmount: 3800.0,
      currentAmount: 4120.0,
    },
  ];

  const distribution: DistributionSettings = {
    emergencyPct: 60,
    investPct: 30,
    freePct: 10,
  };

  const transactions: Transaction[] = [
    // --- RECEITAS DO MÊS ---
    {
      id: 'tx-demo-1',
      description: 'Salário Mensal CLT Líquido',
      amount: 5800.0,
      type: 'income',
      category: 'Salário & Renda CLT',
      paymentMethod: 'Transferência',
      status: 'completed',
      date: fmtDate(5),
      isRecurring: true,
    },
    {
      id: 'tx-demo-2',
      description: 'Freelance Projeto Web Design',
      amount: 1200.0,
      type: 'income',
      category: 'Freelance & Outras Rendas',
      paymentMethod: 'PIX',
      status: 'completed',
      date: fmtDate(12),
      isRecurring: false,
    },

    // --- CONTAS FIXAS & ESSENCIAIS RECORRENTES ---
    {
      id: 'tx-demo-3',
      description: 'Aluguel do Apartamento & Condomínio',
      amount: 1850.0,
      type: 'expense',
      category: 'Moradia',
      paymentMethod: 'Boleto',
      status: 'completed',
      date: fmtDate(10),
      isRecurring: true,
    },
    {
      id: 'tx-demo-4',
      description: 'Energia Elétrica (Luz)',
      amount: 195.5,
      type: 'expense',
      category: 'Contas & Serviços',
      paymentMethod: 'PIX',
      status: 'completed',
      date: fmtDate(11),
      isRecurring: true,
    },
    {
      id: 'tx-demo-5',
      description: 'Internet Fibra Óptica 600MB',
      amount: 129.9,
      type: 'expense',
      category: 'Contas & Serviços',
      paymentMethod: 'PIX',
      status: 'completed',
      date: fmtDate(8),
      isRecurring: true,
    },
    {
      id: 'tx-demo-6',
      description: 'Plano de Saúde Individual',
      amount: 320.0,
      type: 'expense',
      category: 'Saúde & Cuidados',
      paymentMethod: 'Boleto',
      status: 'completed',
      date: fmtDate(15),
      isRecurring: true,
    },
    {
      id: 'tx-demo-7',
      description: 'Mensalidade Curso Especialização',
      amount: 250.0,
      type: 'expense',
      category: 'Educação & Cursos',
      paymentMethod: 'Cartão Crédito',
      status: 'completed',
      date: fmtDate(7),
      isRecurring: true,
    },

    // --- DESPESAS VARIÁVEIS DO DIA A DIA ---
    {
      id: 'tx-demo-8',
      description: 'Supermercado Mensal Pão de Açúcar',
      amount: 820.0,
      type: 'expense',
      category: 'Alimentação',
      paymentMethod: 'Cartão Crédito',
      status: 'completed',
      date: fmtDate(6),
      isRecurring: false,
    },
    {
      id: 'tx-demo-9',
      description: 'Feira Livre e Hortifruti Semanal',
      amount: 145.0,
      type: 'expense',
      category: 'Alimentação',
      paymentMethod: 'PIX',
      status: 'completed',
      date: fmtDate(16),
      isRecurring: false,
    },
    {
      id: 'tx-demo-10',
      description: 'Combustível Posto Shell (Gasolina)',
      amount: 180.0,
      type: 'expense',
      category: 'Transporte',
      paymentMethod: 'Débito',
      status: 'completed',
      date: fmtDate(9),
      isRecurring: false,
    },
    {
      id: 'tx-demo-11',
      description: 'Corridas Aplicativo Uber',
      amount: 74.5,
      type: 'expense',
      category: 'Transporte',
      paymentMethod: 'Cartão Crédito',
      status: 'completed',
      date: fmtDate(18),
      isRecurring: false,
    },
    {
      id: 'tx-demo-12',
      description: 'Jantar Restaurante Italiano com Amigos',
      amount: 165.0,
      type: 'expense',
      category: 'Lazer & Restaurantes',
      paymentMethod: 'Cartão Crédito',
      status: 'completed',
      date: fmtDate(14),
      isRecurring: false,
    },
    {
      id: 'tx-demo-13',
      description: 'Cinema + Pipoca Fim de Semana',
      amount: 88.0,
      type: 'expense',
      category: 'Lazer & Restaurantes',
      paymentMethod: 'Cartão Crédito',
      status: 'completed',
      date: fmtDate(20),
      isRecurring: false,
    },
    {
      id: 'tx-demo-14',
      description: 'Farmácia Droga Raia (Vitaminas e Medicamentos)',
      amount: 85.0,
      type: 'expense',
      category: 'Saúde & Cuidados',
      paymentMethod: 'PIX',
      status: 'completed',
      date: fmtDate(13),
      isRecurring: false,
    },

    // --- CONTA PENDENTE (Para testar o alternador de status e previsão) ---
    {
      id: 'tx-demo-15',
      description: 'Revisão e Manutenção do Carro',
      amount: 350.0,
      type: 'expense',
      category: 'Transporte',
      paymentMethod: 'PIX',
      status: 'pending',
      date: fmtDate(26),
      isRecurring: false,
    },

    // --- APORTES DE POUPANÇA E INVESTIMENTO (RF-07) ---
    {
      id: 'tx-demo-16',
      description: 'Aporte Mensal Reserva de Emergência',
      amount: 600.0,
      type: 'asset',
      category: 'Reserva de Emergência',
      paymentMethod: 'Transferência',
      status: 'completed',
      date: fmtDate(10),
      isRecurring: true,
    },
    {
      id: 'tx-demo-17',
      description: 'Aporte Fundo Imobiliário HGLG11',
      amount: 400.0,
      type: 'asset',
      category: 'Investimentos',
      paymentMethod: 'Corretora',
      status: 'completed',
      date: fmtDate(12),
      isRecurring: false,
    },
  ];

  return {
    incomeSources,
    budgets,
    emergencyFund,
    assets,
    distribution,
    transactions,
  };
}

export function getEmptyFinancialData() {
  return {
    incomeSources: [] as IncomeSource[],
    budgets: initialBudgets,
    emergencyFund: initialEmergencyFund,
    assets: [] as InvestmentAsset[],
    distribution: initialDistribution,
    transactions: [] as Transaction[],
  };
}
