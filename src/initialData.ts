import { Category, Transaction, CategoryBudget, EmergencyFund, InvestmentAsset, DistributionSettings } from './types';

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

// Zerado: nenhuma movimentação inicial para o usuário cadastrar do zero
export const initialTransactions: Transaction[] = [];

// Tetos de orçamento zerados para o usuário planejar do zero
export const initialBudgets: CategoryBudget[] = [
  { id: 'b-1', categoryId: 'cat-1', categoryName: 'Moradia (Aluguel, Condomínio, Contas)', planned: 0, spent: 0 },
  { id: 'b-2', categoryId: 'cat-2', categoryName: 'Alimentação (Supermercado & Delivery)', planned: 0, spent: 0 },
  { id: 'b-3', categoryId: 'cat-3', categoryName: 'Transporte (Combustível & Apps)', planned: 0, spent: 0 },
  { id: 'b-4', categoryId: 'cat-4', categoryName: 'Lazer & Restaurantes', planned: 0, spent: 0 },
  { id: 'b-5', categoryId: 'cat-5', categoryName: 'Saúde & Farmácia', planned: 0, spent: 0 },
  { id: 'b-6', categoryId: 'cat-6', categoryName: 'Contas & Serviços', planned: 0, spent: 0 },
];

// Reserva de emergência zerada para início
export const initialEmergencyFund: EmergencyFund = {
  currentBalance: 0,
  targetAmount: 0,
  monthlyAverageExpense: 0,
};

// Carteira de investimentos zerada
export const initialAssets: InvestmentAsset[] = [];

// Regra inicial configurada conforme RF-07 (60% / 30% / 10%)
export const initialDistribution: DistributionSettings = {
  emergencyPct: 60,
  investPct: 30,
  freePct: 10,
};
