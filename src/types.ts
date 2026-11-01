export type TransactionType = 'income' | 'expense' | 'asset';
export type TransactionStatus = 'completed' | 'pending';
export type AssetFlowType = 'emergency_fund' | 'investment';
export type AssetActionType = 'deposit' | 'withdrawal' | 'yield';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  categoryId?: string;
  paymentMethod: string;
  status: TransactionStatus;
  date: string;
  isRecurring?: boolean;
  notes?: string;
}

export interface CategoryBudget {
  id: string;
  categoryId: string;
  categoryName: string;
  planned: number;
  spent: number;
}

export interface EmergencyFund {
  currentBalance: number;
  targetAmount: number;
  monthlyAverageExpense: number;
}

export interface InvestmentAsset {
  id: string;
  name: string;
  institution: string;
  category: 'Renda Fixa' | 'FIIs' | 'Ações' | 'Cripto';
  appliedAmount: number;
  currentAmount: number;
}

export interface DistributionSettings {
  emergencyPct: number;
  investPct: number;
  freePct: number;
}
