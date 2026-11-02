/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart as PieIcon,
  ShieldCheck,
  TrendingUp,
  FileBarChart2,
  Settings as SettingsIcon,
  Plus,
  X,
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Sparkles,
  Calculator,
  SlidersHorizontal,
  Download,
  AlertTriangle,
  Menu,
  ExternalLink,
  RefreshCw,
  LogOut,
  Database,
  Cloud,
  Calendar,
  DollarSign,
  Coins,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  getGoogleAuthErrorMessage,
  logout as googleLogout,
} from './services/firebaseAuth.ts';
import {
  findOrCreateAppSpreadsheet,
  loadAllDataFromSheets,
  syncAllDataToSheets,
  type SpreadsheetInfo,
  type FullFinancialData,
} from './services/googleSheets.ts';
import {
  Transaction,
  CategoryBudget,
  EmergencyFund,
  InvestmentAsset,
  DistributionSettings,
  Category,
  TransactionType,
  IncomeSource,
  SafeToSpendCalc,
} from './types';
import {
  initialCategories,
  initialBudgets,
  initialEmergencyFund,
  initialDistribution,
  getDemoFinancialData,
  getEmptyFinancialData,
} from './initialData';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'movimentacoes' | 'orcamento' | 'reserva' | 'investimentos' | 'relatorios' | 'configuracoes'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global Financial Data with localStorage (starts empty; demo data is opt-in)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('mf_transactions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return getEmptyFinancialData().transactions;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('mf_categories');
    return saved ? JSON.parse(saved) : initialCategories;
  });

  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => {
    const saved = localStorage.getItem('mf_budgets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return getEmptyFinancialData().budgets;
  });

  const [emergencyFund, setEmergencyFund] = useState<EmergencyFund>(() => {
    const saved = localStorage.getItem('mf_emergency');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }
    return getEmptyFinancialData().emergencyFund;
  });

  const [assets, setAssets] = useState<InvestmentAsset[]>(() => {
    const saved = localStorage.getItem('mf_assets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return getEmptyFinancialData().assets;
  });

  const [distribution, setDistribution] = useState<DistributionSettings>(() => {
    const saved = localStorage.getItem('mf_dist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }
    return getEmptyFinancialData().distribution;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('mf_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('mf_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('mf_emergency', JSON.stringify(emergencyFund));
  }, [emergencyFund]);

  useEffect(() => {
    localStorage.setItem('mf_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('mf_dist', JSON.stringify(distribution));
  }, [distribution]);

  useEffect(() => {
    localStorage.setItem('mf_categories', JSON.stringify(categories));
  }, [categories]);

  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(() => {
    const saved = localStorage.getItem('mf_income_sources');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return getEmptyFinancialData().incomeSources;
  });

  useEffect(() => {
    localStorage.setItem('mf_income_sources', JSON.stringify(incomeSources));
  }, [incomeSources]);

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  // Google Auth & Sheets Integration State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<SpreadsheetInfo | null>(() => {
    const saved = localStorage.getItem('mf_sheets_info');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Sync helper to push state to Google Sheets
  const syncToSheets = async (
    overrideData?: Partial<FullFinancialData>,
    tokenOverride?: string,
    sheetOverride?: SpreadsheetInfo
  ) => {
    const activeToken = tokenOverride || accessToken;
    const activeSheet = sheetOverride || spreadsheetInfo;
    if (!activeToken || !activeSheet) return;

    try {
      setSyncStatus('syncing');
      setSyncError(null);
      const payload: FullFinancialData = {
        transactions: overrideData?.transactions ?? transactions,
        budgets: overrideData?.budgets ?? budgets,
        emergencyFund: overrideData?.emergencyFund ?? emergencyFund,
        assets: overrideData?.assets ?? assets,
        distributionSettings: overrideData?.distributionSettings ?? distribution,
        incomeSources: overrideData?.incomeSources ?? incomeSources,
      };
      await syncAllDataToSheets(activeSheet.id, payload, activeToken);
      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Falha ao salvar no Google Sheets:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Falha ao sincronizar com Google Sheets');
    }
  };

  // Notification for demo scenario actions
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const showDemoNotice = (msg: string) => {
    setDemoNotice(msg);
    setTimeout(() => setDemoNotice(null), 5000);
  };

  // Load realistic balanced mock data for testing all app functionalities
  const handleLoadDemoData = () => {
    const demo = getDemoFinancialData();
    setIncomeSources(demo.incomeSources);
    setBudgets(demo.budgets);
    setEmergencyFund(demo.emergencyFund);
    setAssets(demo.assets);
    setDistribution(demo.distribution);
    setTransactions(demo.transactions);

    // Save directly to localStorage for instant local persistence
    localStorage.setItem('mf_income_sources', JSON.stringify(demo.incomeSources));
    localStorage.setItem('mf_budgets', JSON.stringify(demo.budgets));
    localStorage.setItem('mf_emergency', JSON.stringify(demo.emergencyFund));
    localStorage.setItem('mf_assets', JSON.stringify(demo.assets));
    localStorage.setItem('mf_dist', JSON.stringify(demo.distribution));
    localStorage.setItem('mf_transactions', JSON.stringify(demo.transactions));

    if (accessToken && spreadsheetInfo) {
      syncToSheets({
        incomeSources: demo.incomeSources,
        budgets: demo.budgets,
        emergencyFund: demo.emergencyFund,
        assets: demo.assets,
        distributionSettings: demo.distribution,
        transactions: demo.transactions,
      });
    }

    showDemoNotice('Cenário de teste equilibrado carregado com sucesso! Todas as abas foram populadas com dados realistas.');
  };

  // Reset all data to empty state
  const handleClearAllData = () => {
    if (window.confirm('Tem certeza que deseja zerar todos os dados? Esta ação limpará lançamentos, orçamentos e carteira de ativos.')) {
      const empty = getEmptyFinancialData();
      setIncomeSources(empty.incomeSources);
      setBudgets(empty.budgets);
      setEmergencyFund(empty.emergencyFund);
      setAssets(empty.assets);
      setDistribution(empty.distribution);
      setTransactions(empty.transactions);

      localStorage.setItem('mf_income_sources', JSON.stringify(empty.incomeSources));
      localStorage.setItem('mf_budgets', JSON.stringify(empty.budgets));
      localStorage.setItem('mf_emergency', JSON.stringify(empty.emergencyFund));
      localStorage.setItem('mf_assets', JSON.stringify(empty.assets));
      localStorage.setItem('mf_dist', JSON.stringify(empty.distribution));
      localStorage.setItem('mf_transactions', JSON.stringify(empty.transactions));

      if (accessToken && spreadsheetInfo) {
        syncToSheets({
          incomeSources: empty.incomeSources,
          budgets: empty.budgets,
          emergencyFund: empty.emergencyFund,
          assets: empty.assets,
          distributionSettings: empty.distribution,
          transactions: empty.transactions,
        });
      }

      showDemoNotice('Todos os dados foram zerados com sucesso.');
    }
  };

  // Connects or creates the user's spreadsheet, then synchronizes initial data
  const handleConnectSheets = async (token: string) => {
    try {
      setSyncStatus('syncing');
      setSyncError(null);
      const sheet = await findOrCreateAppSpreadsheet(token);
      setSpreadsheetInfo(sheet);
      localStorage.setItem('mf_sheets_info', JSON.stringify(sheet));

      // Attempt to load existing cloud data
      const remote = await loadAllDataFromSheets(sheet.id, token);
      const hasRemoteData =
        (remote.transactions && remote.transactions.length > 0) ||
        (remote.assets && remote.assets.length > 0) ||
        (remote.emergencyFund &&
          (remote.emergencyFund.currentBalance > 0 || remote.emergencyFund.targetAmount > 0)) ||
        (remote.incomeSources && remote.incomeSources.length > 0);

      if (hasRemoteData) {
        if (remote.transactions) setTransactions(remote.transactions);
        if (remote.budgets && remote.budgets.length > 0) setBudgets(remote.budgets);
        if (remote.emergencyFund) setEmergencyFund(remote.emergencyFund);
        if (remote.assets) setAssets(remote.assets);
        if (remote.distributionSettings) setDistribution(remote.distributionSettings);
        if (remote.incomeSources) setIncomeSources(remote.incomeSources);
        setSyncStatus('synced');
      } else {
        // First time initialization: populate remote sheet with current state
        await syncToSheets(undefined, token, sheet);
      }
    } catch (err: any) {
      console.error('Erro ao conectar ou criar planilha:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Erro ao conectar planilha.');
    }
  };

  // Init Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authUser, token) => {
        setUser(authUser);
        setAccessToken(token);
        await handleConnectSheets(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setSyncStatus('idle');
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setSyncError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        await handleConnectSheets(res.accessToken);
      } else {
        // Pop-up was closed by user or cancelled cleanly
        setSyncStatus('idle');
      }
    } catch (err: any) {
      if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request'
      ) {
        console.error('Falha no login Google:', err);
      }
      const errorMsg = getGoogleAuthErrorMessage(err);
      if (errorMsg) {
        setSyncError(errorMsg);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    if (
      window.confirm(
        'Deseja desconectar sua conta Google? Sua planilha continuará segura e preservada no seu Google Drive.'
      )
    ) {
      await googleLogout();
      setUser(null);
      setAccessToken(null);
      setSpreadsheetInfo(null);
      localStorage.removeItem('mf_sheets_info');
      setSyncStatus('idle');
    }
  };

  // Modal State for Quick Add
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  // Financial Calculations for the active month (Outubro 2026)
  const totalIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const availableBalance = Math.max(0, totalIncome - totalExpense);

  // RF-07: Smart distribution calculation with overflow redirection to investments
  const distributionCalc = useMemo(() => {
    if (availableBalance <= 0) {
      return {
        emergencyFund: 0,
        investments: 0,
        freeCash: 0,
        overflow: 0,
      };
    }

    const rawEmergency = (availableBalance * distribution.emergencyPct) / 100;
    const rawInvestments = (availableBalance * distribution.investPct) / 100;
    const freeCash = (availableBalance * distribution.freePct) / 100;

    const neededForTarget = Math.max(0, emergencyFund.targetAmount - emergencyFund.currentBalance);

    let actualEmergency = rawEmergency;
    let overflow = 0;

    if (rawEmergency > neededForTarget) {
      actualEmergency = neededForTarget;
      overflow = rawEmergency - neededForTarget;
    }

    const actualInvestments = rawInvestments + overflow;

    return {
      emergencyFund: actualEmergency,
      investments: actualInvestments,
      freeCash,
      overflow,
    };
  }, [availableBalance, distribution, emergencyFund]);

  // Safe-to-Spend Calculation ("Quanto Posso Gastar no Mês" & Meta Diária)
  const safeToSpend = useMemo<SafeToSpendCalc>(() => {
    const expectedIncome = incomeSources.reduce((sum, s) => sum + s.amount, 0);

    const fixedKeywords = [
      'moradia',
      'aluguel',
      'condomínio',
      'condominio',
      'contas',
      'serviços',
      'servicos',
      'assinaturas',
      'educação',
      'educacao',
      'saúde',
      'saude',
      'transporte',
      'internet',
      'luz',
      'energia',
      'água',
      'agua',
    ];

    const fixedBudgets = budgets
      .filter((b) => fixedKeywords.some((k) => b.categoryName.toLowerCase().includes(k)))
      .reduce((sum, b) => sum + b.planned, 0);

    const recurringExpenseActual = transactions
      .filter((t) => t.type === 'expense' && t.isRecurring)
      .reduce((sum, t) => sum + t.amount, 0);

    const fixedCommitted = Math.max(fixedBudgets, recurringExpenseActual);

    const netBase = Math.max(0, expectedIncome - fixedCommitted);
    const plannedSavings = (netBase * (distribution.emergencyPct + distribution.investPct)) / 100;

    const freeSpendCeiling = Math.max(0, expectedIncome - fixedCommitted - plannedSavings);

    const spentVariable = transactions
      .filter((t) => t.type === 'expense' && t.status === 'completed' && !t.isRecurring)
      .reduce((sum, t) => sum + t.amount, 0);

    const remainingSafeToSpend = freeSpendCeiling - spentVariable;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);

    const safeDailyAmount = remainingSafeToSpend > 0 ? remainingSafeToSpend / daysRemaining : 0;

    let burnRateStatus: 'safe' | 'warning' | 'exceeded' = 'safe';
    if (remainingSafeToSpend <= 0 && freeSpendCeiling > 0) {
      burnRateStatus = 'exceeded';
    } else if (remainingSafeToSpend < freeSpendCeiling * 0.25 && freeSpendCeiling > 0) {
      burnRateStatus = 'warning';
    }

    return {
      expectedIncome,
      fixedCommitted,
      plannedSavings,
      freeSpendCeiling,
      spentVariable,
      remainingSafeToSpend,
      daysRemaining,
      safeDailyAmount,
      burnRateStatus,
    };
  }, [incomeSources, budgets, transactions, distribution]);

  // Handler for adding a new transaction or asset contribution
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>, assetFlow?: 'emergency' | 'investments') => {
    const id = 'tx-' + Date.now();
    const createdTx: Transaction = { ...newTx, id };

    const nextTx = [createdTx, ...transactions];
    setTransactions(nextTx);

    let nextEmergency = emergencyFund;
    let nextAssets = assets;
    let nextBudgets = budgets;

    // If it's an asset deposit, update the respective balances
    if (newTx.type === 'asset') {
      if (assetFlow === 'emergency' || newTx.category.toLowerCase().includes('reserva')) {
        nextEmergency = {
          ...emergencyFund,
          currentBalance: emergencyFund.currentBalance + newTx.amount,
        };
        setEmergencyFund(nextEmergency);
      } else {
        const newAsset: InvestmentAsset = {
          id: 'ast-' + Date.now(),
          name: newTx.description || 'Novo Aporte',
          institution: 'Corretora',
          category: 'Renda Fixa',
          appliedAmount: newTx.amount,
          currentAmount: newTx.amount,
        };
        nextAssets = [newAsset, ...assets];
        setAssets(nextAssets);
      }
    }

    // Also update budgets spent if it's an expense
    if (newTx.type === 'expense') {
      nextBudgets = budgets.map((b) =>
        b.categoryName.toLowerCase().includes(newTx.category.toLowerCase()) ||
        newTx.category.toLowerCase().includes(b.categoryName.toLowerCase())
          ? { ...b, spent: b.spent + newTx.amount }
          : b
      );
      setBudgets(nextBudgets);
    }

    // Auto-sync with Google Sheets
    if (accessToken && spreadsheetInfo) {
      syncToSheets({
        transactions: nextTx,
        emergencyFund: nextEmergency,
        assets: nextAssets,
        budgets: nextBudgets,
      });
    }
  };

  // Nav Items
  const navItems = [
    { id: 'dashboard', name: 'Visão Geral', icon: LayoutDashboard },
    { id: 'movimentacoes', name: 'Movimentações', icon: ArrowLeftRight },
    { id: 'orcamento', name: 'Orçamento', icon: PieIcon },
    { id: 'reserva', name: 'Reserva', icon: ShieldCheck },
    { id: 'investimentos', name: 'Investimentos', icon: TrendingUp },
    { id: 'relatorios', name: 'Relatórios', icon: FileBarChart2 },
    { id: 'configuracoes', name: 'Configurações', icon: SettingsIcon },
  ] as const;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* SIDEBAR DESKTOP */}
      <aside className="fixed inset-y-0 left-0 hidden md:flex w-64 flex-col bg-slate-900 border-r border-slate-800 z-30">
        <div className="p-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              MF
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                MINHAS CONTAS
              </h1>
              <p className="text-[11px] text-slate-400 mt-1">Planejamento Pessoal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500">
          <div className="flex items-center justify-between">
            <span>Uso Pessoal</span>
            <span className="font-mono text-slate-400">2026</span>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold text-white">MINHAS CONTAS</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1.5">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
                      activeTab === item.id
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </nav>
            </div>
            <span className="text-[11px] text-slate-500">Uso Pessoal • 2026</span>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* TOP BAR */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/85 backdrop-blur px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg border border-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span>MINHAS CONTAS</span>
              <span aria-hidden="true">/</span>
              <span className="text-white font-medium capitalize">
                {navItems.find((n) => n.id === activeTab)?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!user ? (
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all border border-slate-200 active:scale-95 shrink-0"
                title="Salvar seus dados diretamente em uma planilha no seu Google Drive"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>{isLoggingIn ? 'Conectando...' : 'Conectar Planilha'}</span>
              </button>
            ) : (
              <>
                {spreadsheetInfo && (
                  <a
                    href={spreadsheetInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    title="Abrir planilha no Google Drive"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Planilha</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}

                <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
                  {syncStatus === 'syncing' && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span className="text-[11px]">Sincronizando...</span>
                    </span>
                  )}
                  {syncStatus === 'synced' && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="text-[11px]">Sheets Conectado</span>
                    </span>
                  )}
                  {syncStatus === 'error' && (
                    <span className="flex items-center gap-1 text-rose-400" title={syncError || 'Erro de sincronização'}>
                      <AlertTriangle className="w-3 h-3" />
                      <span className="text-[11px]">Erro Sync</span>
                    </span>
                  )}
                  {syncStatus === 'idle' && (
                    <span className="text-[11px] text-slate-400">Local</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Usuário'}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full border border-slate-700"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-xs font-bold">
                      {user.email ? user.email[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <button
                    onClick={handleGoogleLogout}
                    title="Desconectar do Google"
                    className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

            <button
              onClick={handleLoadDemoData}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 md:px-3.5 md:py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 shrink-0"
              title="Carregar cenário de dados fictícios para testar todas as telas e cálculos"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Carregar Dados de Teste</span>
              <span className="sm:hidden">Testar</span>
            </button>

            <button
              onClick={() => setIsTxModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 md:px-4 md:py-2 rounded-lg text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Movimentação</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </header>

        {/* CONTENT PAGES */}
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {demoNotice && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs sm:text-sm font-medium">{demoNotice}</p>
              </div>
              <button
                onClick={() => setDemoNotice(null)}
                className="text-amber-400 hover:text-white p-1 rounded-md transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {syncError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-start justify-between gap-3 shadow-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm leading-relaxed space-y-1">
                  <p className="font-semibold text-rose-300">Atenção na sincronização ou autenticação:</p>
                  <p>{syncError}</p>
                </div>
              </div>
              <button
                onClick={() => setSyncError(null)}
                className="text-rose-400 hover:text-white p-1 rounded-md transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              income={totalIncome}
              expense={totalExpense}
              available={availableBalance}
              distribution={distributionCalc}
              emergency={emergencyFund}
              transactions={transactions}
              safeToSpend={safeToSpend}
              onOpenIncomeModal={() => setIsIncomeModalOpen(true)}
              onNavigate={(tab) => setActiveTab(tab)}
              onLoadDemoData={handleLoadDemoData}
            />
          )}

          {activeTab === 'movimentacoes' && (
            <TransactionsView
              transactions={transactions}
              onToggleStatus={(id) => {
                const updated: Transaction[] = transactions.map((t) =>
                  t.id === id
                    ? {
                        ...t,
                        status: (t.status === 'completed' ? 'pending' : 'completed') as Transaction['status'],
                      }
                    : t
                );
                setTransactions(updated);
                if (accessToken && spreadsheetInfo) {
                  syncToSheets({ transactions: updated });
                }
              }}
              onDelete={(id) => {
                if (
                  window.confirm(
                    'Tem certeza que deseja excluir esta movimentação? Essa alteração será sincronizada na planilha do Google Sheets.'
                  )
                ) {
                  const updated = transactions.filter((t) => t.id !== id);
                  setTransactions(updated);
                  if (accessToken && spreadsheetInfo) {
                    syncToSheets({ transactions: updated });
                  }
                }
              }}
            />
          )}

          {activeTab === 'orcamento' && (
            <BudgetView
              budgets={budgets}
              safeToSpend={safeToSpend}
              onOpenIncomeModal={() => setIsIncomeModalOpen(true)}
              onUpdateBudget={(id, newPlanned) => {
                const updated = budgets.map((b) => (b.id === id ? { ...b, planned: newPlanned } : b));
                setBudgets(updated);
                if (accessToken && spreadsheetInfo) {
                  syncToSheets({ budgets: updated });
                }
              }}
            />
          )}

          {activeTab === 'reserva' && (
            <EmergencyFundView
              emergency={emergencyFund}
              suggestedMonthlyDeposit={distributionCalc.emergencyFund}
              onDeposit={(amount, desc) => {
                const updatedFund = {
                  ...emergencyFund,
                  currentBalance: emergencyFund.currentBalance + amount,
                };
                const newTxItem: Transaction = {
                  id: 'tx-' + Date.now(),
                  description: desc || 'Aporte na Reserva de Emergência',
                  amount,
                  type: 'asset',
                  category: 'Reserva de Emergência',
                  paymentMethod: 'Transferência',
                  status: 'completed',
                  date: new Date().toISOString().split('T')[0],
                };
                const updatedTx = [newTxItem, ...transactions];
                setEmergencyFund(updatedFund);
                setTransactions(updatedTx);
                if (accessToken && spreadsheetInfo) {
                  syncToSheets({ emergencyFund: updatedFund, transactions: updatedTx });
                }
              }}
              onWithdraw={(amount, desc) => {
                if (window.confirm(`Confirmar retirada de R$ ${amount.toFixed(2)} da Reserva de Emergência?`)) {
                  const updatedFund = {
                    ...emergencyFund,
                    currentBalance: Math.max(0, emergencyFund.currentBalance - amount),
                  };
                  const newTxItem: Transaction = {
                    id: 'tx-' + Date.now(),
                    description: desc || 'Retirada da Reserva (Emergência)',
                    amount,
                    type: 'asset',
                    category: 'Reserva de Emergência',
                    paymentMethod: 'Transferência',
                    status: 'completed',
                    date: new Date().toISOString().split('T')[0],
                  };
                  const updatedTx = [newTxItem, ...transactions];
                  setEmergencyFund(updatedFund);
                  setTransactions(updatedTx);
                  if (accessToken && spreadsheetInfo) {
                    syncToSheets({ emergencyFund: updatedFund, transactions: updatedTx });
                  }
                }
              }}
              onSetTarget={(val) => {
                const updatedFund = { ...emergencyFund, targetAmount: val };
                setEmergencyFund(updatedFund);
                if (accessToken && spreadsheetInfo) {
                  syncToSheets({ emergencyFund: updatedFund });
                }
              }}
            />
          )}

          {activeTab === 'investimentos' && (
            <InvestmentsView
              assets={assets}
              transactions={transactions}
              suggestedMonthlyInvestment={distributionCalc.investments}
              onAddAsset={(newAsset) => {
                const updatedAssets = [newAsset, ...assets];
                const newTxItem: Transaction = {
                  id: 'tx-' + Date.now(),
                  description: `Aporte ${newAsset.name}`,
                  amount: newAsset.appliedAmount,
                  type: 'asset',
                  category: 'Investimentos',
                  paymentMethod: 'Corretora',
                  status: 'completed',
                  date: new Date().toISOString().split('T')[0],
                };
                const updatedTx = [newTxItem, ...transactions];
                setAssets(updatedAssets);
                setTransactions(updatedTx);
                if (accessToken && spreadsheetInfo) {
                  syncToSheets({ assets: updatedAssets, transactions: updatedTx });
                }
              }}
              onDeleteAsset={(id) => {
                if (
                  window.confirm(
                    'Tem certeza que deseja remover este ativo da carteira? Essa alteração será sincronizada no Google Sheets.'
                  )
                ) {
                  const updatedAssets = assets.filter((a) => a.id !== id);
                  setAssets(updatedAssets);
                  if (accessToken && spreadsheetInfo) {
                    syncToSheets({ assets: updatedAssets });
                  }
                }
              }}
            />
          )}

          {activeTab === 'relatorios' && (
            <ReportsView
              income={totalIncome}
              expense={totalExpense}
              emergencyBalance={emergencyFund.currentBalance}
              assetsTotal={assets.reduce((sum, a) => sum + a.currentAmount, 0)}
              transactions={transactions}
            />
          )}

          {activeTab === 'configuracoes' && (
            <SettingsView
              distribution={distribution}
              categories={categories}
              onSaveDistribution={(newDist) => {
                setDistribution(newDist);
                if (accessToken && spreadsheetInfo) {
                  syncToSheets({ distributionSettings: newDist });
                }
              }}
              onAddCategory={(cat) => setCategories((prev) => [...prev, cat])}
              onDeleteCategory={(id) => setCategories((prev) => prev.filter((c) => c.id !== id))}
              onResetDemo={handleClearAllData}
              onLoadDemoData={handleLoadDemoData}
              transactions={transactions}
              user={user}
              spreadsheetInfo={spreadsheetInfo}
              syncStatus={syncStatus}
              syncError={syncError}
              onGoogleLogin={handleGoogleLogin}
              onGoogleLogout={handleGoogleLogout}
              onForceSync={() => syncToSheets()}
              onReloadSheets={() => accessToken && handleConnectSheets(accessToken)}
            />
          )}
        </main>
      </div>

      {/* QUICK TRANSACTION MODAL */}
      <QuickTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        categories={categories}
        onSubmit={handleAddTransaction}
      />

      {/* MANAGE INCOME SOURCES MODAL */}
      <ManageIncomeSourcesModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        incomeSources={incomeSources}
        onSaveSources={(newSources) => {
          setIncomeSources(newSources);
          if (accessToken && spreadsheetInfo) {
            syncToSheets({ incomeSources: newSources });
          }
        }}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------------
// VIEW 1: DASHBOARD (VISÃO GERAL)
// ----------------------------------------------------------------------------------
interface DashboardProps {
  income: number;
  expense: number;
  available: number;
  distribution: {
    emergencyFund: number;
    investments: number;
    freeCash: number;
    overflow: number;
  };
  emergency: EmergencyFund;
  transactions: Transaction[];
  safeToSpend: SafeToSpendCalc;
  onOpenIncomeModal: () => void;
  onNavigate: (tab: any) => void;
  onLoadDemoData?: () => void;
}

function DashboardView({
  income,
  expense,
  available,
  distribution,
  emergency,
  transactions,
  safeToSpend,
  onOpenIncomeModal,
  onNavigate,
  onLoadDemoData,
}: DashboardProps) {
  const expenseRatio = income > 0 ? (expense / income) * 100 : 0;
  const reservePct = emergency.targetAmount > 0
    ? Math.min((emergency.currentBalance / emergency.targetAmount) * 100, 100)
    : 100;
  const reserveRemaining = Math.max(0, emergency.targetAmount - emergency.currentBalance);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Visão Geral</h2>
          <p className="text-xs text-slate-400">
            Painel financeiro do mês corrente com indicadores atualizados em tempo real.
          </p>
        </div>

        {onLoadDemoData && (
          <div className="flex items-center gap-2">
            <button
              onClick={onLoadDemoData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all active:scale-95"
              title="Carrega o cenário fictício equilibrado para testar todas as funcionalidades do app"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Cenário de Teste</span>
            </button>
          </div>
        )}
      </div>

      {/* HERO BANNER: QUANTO POSSO GASTAR NO MÊS & META DIÁRIA */}
      {safeToSpend.expectedIncome === 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-emerald-500/30 p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Coins className="w-3.5 h-3.5" />
                  Planejamento Inteligente
                </span>
                <span className="text-xs text-slate-400">Quanto posso gastar?</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                Defina seu Salário e Fontes de Renda
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Cadastre sua renda esperada para calcularmos automaticamente seu <strong className="text-emerald-400">teto de gastos livres no mês</strong> e sua <strong className="text-emerald-400">meta diária recomendada</strong>, protegendo suas contas fixas e aportes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
              {onLoadDemoData && (
                <button
                  onClick={onLoadDemoData}
                  className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-3 rounded-xl text-xs shadow-lg shadow-amber-950/40 transition-all active:scale-95"
                  title="Popular com cenário financeiro equilibrado de teste"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Carregar Dados de Teste</span>
                </button>
              )}
              <button
                onClick={onOpenIncomeModal}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                <span>Cadastrar Renda Manual</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-6 shadow-xl">
          {/* Subtle accent glow */}
          <div
            aria-hidden="true"
            className={`absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20 ${
              safeToSpend.burnRateStatus === 'exceeded'
                ? 'bg-rose-500'
                : safeToSpend.burnRateStatus === 'warning'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-800 border border-slate-700/80 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Mês Vigente
                </span>
                <span
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                    safeToSpend.burnRateStatus === 'exceeded'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : safeToSpend.burnRateStatus === 'warning'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {safeToSpend.burnRateStatus === 'exceeded' && '● Limite Ultrapassado'}
                  {safeToSpend.burnRateStatus === 'warning' && '● Atenção ao Ritmo'}
                  {safeToSpend.burnRateStatus === 'safe' && '● Ritmo Seguro'}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Quanto posso gastar no mês
                </h3>
                <div className="flex items-baseline gap-3 mt-1">
                  <span
                    className={`text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums font-mono ${
                      safeToSpend.remainingSafeToSpend < 0
                        ? 'text-rose-400'
                        : 'text-white'
                    }`}
                  >
                    {formatCurrency(safeToSpend.remainingSafeToSpend)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {safeToSpend.remainingSafeToSpend >= 0 ? 'disponível livre' : 'excedido do teto'}
                  </span>
                </div>
              </div>

              {/* Daily Pace */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                  <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-slate-400">Meta diária recomendada:</span>
                  <strong className="text-emerald-400 font-mono font-bold">
                    {formatCurrency(safeToSpend.safeDailyAmount)}/dia
                  </strong>
                </div>
                <span className="text-slate-400 text-xs">
                  Restam <strong className="text-white font-medium">{safeToSpend.daysRemaining} dias</strong> no mês
                </span>
              </div>
            </div>

            {/* Income breakdown micro-summary & action */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                onClick={onOpenIncomeModal}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                <span>Gerenciar Salário & Rendas</span>
              </button>
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5 min-w-[230px]">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Renda Prevista:</span>
                  <strong className="text-slate-200 font-mono tabular-nums">
                    {formatCurrency(safeToSpend.expectedIncome)}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Custos Fixos:</span>
                  <span className="text-rose-400 font-mono tabular-nums">
                    - {formatCurrency(safeToSpend.fixedCommitted)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Aportes (60/30):</span>
                  <span className="text-blue-400 font-mono tabular-nums">
                    - {formatCurrency(safeToSpend.plannedSavings)}
                  </span>
                </div>
                <div className="border-t border-slate-800 pt-1.5 flex justify-between items-center text-slate-300 font-medium">
                  <span>Teto Livre Inicial:</span>
                  <span className="text-emerald-400 font-mono tabular-nums font-bold">
                    {formatCurrency(safeToSpend.freeSpendCeiling)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Já Gasto Variável:</span>
                  <span className="text-amber-400 font-mono tabular-nums">
                    - {formatCurrency(safeToSpend.spentVariable)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3 Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Renda Total */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Renda Total
            </span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums font-mono">
            {formatCurrency(income)}
          </p>
          <span className="text-xs text-emerald-400 mt-1 inline-block">100% recebido</span>
        </div>

        {/* Despesas Totais */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Despesas Totais
            </span>
            <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums font-mono">
            {formatCurrency(expense)}
          </p>
          <span className="text-xs text-slate-400 mt-1 inline-block">
            {expenseRatio.toFixed(1)}% da renda consumida
          </span>
        </div>

        {/* Saldo Disponível */}
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Saldo Disponível
            </span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums font-mono">
            {formatCurrency(available)}
          </p>
          <span className="text-xs text-emerald-300 mt-1 inline-block">
            Disponível para planejamento
          </span>
        </div>
      </div>

      {/* RF-07: Régua da Distribuição Inteligente do Saldo (60/30/10) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="font-bold text-white text-sm">
              Distribuição Inteligente do Saldo (Regra RF-07)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Divisão configurada: 60% / 30% / 10%</span>
        </div>

        {distribution.overflow > 0 && (
          <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-lg text-xs text-blue-200">
            <strong>Transbordamento automático ativado:</strong> Como a Reserva atingiu sua meta, o excedente de{' '}
            <strong className="text-white tabular-nums font-mono">{formatCurrency(distribution.overflow)}</strong> foi
            redirecionado integralmente para Investimentos.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-slate-950 rounded-lg border border-blue-500/25">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="text-blue-400 font-semibold">Reserva de Emergência</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className="text-lg font-bold text-white tabular-nums font-mono">
              {formatCurrency(distribution.emergencyFund)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {distribution.emergencyFund === 0 ? 'Meta atingida' : 'Aporte mensal sugerido'}
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-emerald-500/25">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="text-emerald-400 font-semibold">Investimentos</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-white tabular-nums font-mono">
              {formatCurrency(distribution.investments)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Longo prazo e patrimônio</p>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-amber-500/25">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="text-amber-400 font-semibold">Dinheiro Livre</span>
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-lg font-bold text-white tabular-nums font-mono">
              {formatCurrency(distribution.freeCash)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Sem culpa para lazer</p>
          </div>
        </div>
      </div>

      {/* Grid: Reserva de Emergência Status + Últimos Lançamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reserva Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Reserva de Emergência</h3>
                <p className="text-xs text-slate-400">Segurança para imprevistos</p>
              </div>
              <button
                onClick={() => onNavigate('reserva')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                Detalhes →
              </button>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Acumulado: <strong className="text-white tabular-nums font-mono">{formatCurrency(emergency.currentBalance)}</strong></span>
                <span>Meta: <strong className="text-slate-300 tabular-nums font-mono">{formatCurrency(emergency.targetAmount)}</strong></span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${reservePct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{reservePct.toFixed(1)}% atingido</span>
                <span>{reserveRemaining > 0 ? `Faltam ${formatCurrency(reserveRemaining)}` : 'Meta completa!'}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400">
            Aporte sugerido deste mês:{' '}
            <strong className="text-white tabular-nums font-mono">{formatCurrency(distribution.emergencyFund)}</strong>
          </div>
        </div>

        {/* Últimas Movimentações */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Últimos Lançamentos</h3>
                <p className="text-xs text-slate-400">Movimentações mais recentes</p>
              </div>
              <button
                onClick={() => onNavigate('movimentacoes')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                Ver todas →
              </button>
            </div>

            <div className="divide-y divide-slate-800/80">
              {transactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <p className="text-slate-400 font-medium">Nenhuma movimentação cadastrada ainda.</p>
                  <p className="text-[11px] text-slate-500 mt-1">Clique em "+ Nova Movimentação" no topo para inserir seus dados.</p>
                </div>
              ) : (
                transactions.slice(0, 4).map((tx) => {
                  const isExpense = tx.type === 'expense';
                  const isIncome = tx.type === 'income';
                  return (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{tx.description}</p>
                        <p className="text-[11px] text-slate-500">
                          {tx.category} · {tx.date}
                        </p>
                      </div>
                      <span
                        className={`font-bold tabular-nums font-mono ${
                          isIncome ? 'text-emerald-400' : isExpense ? 'text-rose-400' : 'text-blue-400'
                        }`}
                      >
                        {isExpense ? '- ' : '+ '}
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// VIEW 2: MOVIMENTAÇÕES (RECEITAS, DESPESAS & APORTES)
// ----------------------------------------------------------------------------------
interface TransactionsViewProps {
  transactions: Transaction[];
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

function TransactionsView({ transactions, onToggleStatus, onDelete }: TransactionsViewProps) {
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchType = filterType === 'all' || t.type === filterType;
      const matchSearch =
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [transactions, filterType, search]);

  const totalIn = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalPending = transactions.filter((t) => t.status === 'pending').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Movimentações</h2>
        <p className="text-xs text-slate-400">Histórico de receitas, despesas e transferências patrimoniais.</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Segmented Controls for Filters */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'expense', label: 'Despesas' },
            { id: 'income', label: 'Receitas' },
            { id: 'asset', label: 'Aportes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filterType === tab.id
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Totals Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
        <div>
          <span className="text-slate-500 mr-2">Entradas Realizadas:</span>
          <strong className="text-emerald-400 tabular-nums font-mono">{formatCurrency(totalIn)}</strong>
        </div>
        <div>
          <span className="text-slate-500 mr-2">Despesas Realizadas:</span>
          <strong className="text-rose-400 tabular-nums font-mono">{formatCurrency(totalOut)}</strong>
        </div>
        <div>
          <span className="text-slate-500 mr-2">Pendências a Pagar:</span>
          <strong className="text-amber-400 tabular-nums font-mono">{formatCurrency(totalPending)}</strong>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-500 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Data</th>
                <th className="py-3 px-4 font-semibold">Descrição</th>
                <th className="py-3 px-4 font-semibold">Categoria</th>
                <th className="py-3 px-4 font-semibold">Pagamento</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Valor</th>
                <th className="py-3 px-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Nenhuma movimentação encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const isExpense = t.type === 'expense';
                  const isIncome = t.type === 'income';
                  const isAsset = t.type === 'asset';

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 tabular-nums font-mono whitespace-nowrap">
                        {t.date}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {t.description}
                        {t.isRecurring && (
                          <span className="ml-2 text-[10px] text-slate-500 font-normal">
                            (Recorrente)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {t.category}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{t.paymentMethod}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onToggleStatus(t.id)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold transition-all border ${
                            t.status === 'completed'
                              ? isIncome
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : isAsset
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {t.status === 'completed' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              {isIncome ? 'Recebido' : isAsset ? 'Efetivado' : 'Pago'}
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Pendente
                            </>
                          )}
                        </button>
                      </td>
                      <td
                        className={`py-3 px-4 font-bold text-right text-xs tabular-nums font-mono ${
                          isIncome ? 'text-emerald-400' : isExpense ? 'text-rose-400' : 'text-blue-400'
                        }`}
                      >
                        {isExpense ? '- ' : '+ '}
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onDelete(t.id)}
                          title="Excluir movimentação"
                          className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// VIEW 3: ORÇAMENTO (PLANEJAMENTO MENSAL POR CATEGORIA)
// ----------------------------------------------------------------------------------
interface BudgetViewProps {
  budgets: CategoryBudget[];
  onUpdateBudget: (id: string, newPlanned: number) => void;
  safeToSpend: SafeToSpendCalc;
  onOpenIncomeModal: () => void;
}

function BudgetView({ budgets, onUpdateBudget, safeToSpend, onOpenIncomeModal }: BudgetViewProps) {
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);
  const [newLimitInput, setNewLimitInput] = useState('');

  const totalPlanned = budgets.reduce((acc, b) => acc + b.planned, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const availableMargin = totalPlanned - totalSpent;

  const overspent = budgets.filter((b) => b.spent > b.planned);
  const warning = budgets.filter((b) => b.spent >= b.planned * 0.8 && b.spent <= b.planned);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    const val = parseFloat(newLimitInput);
    if (!isNaN(val)) {
      onUpdateBudget(editingBudget.id, val);
    }
    setEditingBudget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Planejamento Orçamentário</h2>
          <p className="text-xs text-slate-400">Defina limites mensais para controlar os gastos por categoria e manter sua capacidade de gastos segura.</p>
        </div>
        <button
          onClick={onOpenIncomeModal}
          className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 shrink-0"
        >
          <DollarSign className="w-4 h-4" />
          <span>Renda: {formatCurrency(safeToSpend.expectedIncome)}</span>
        </button>
      </div>

      {/* Card Resumo de Capacidade de Gastos no Orçamento */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">
              Quanto Posso Gastar no Mês (Livre)
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-xl font-bold font-mono tabular-nums ${safeToSpend.remainingSafeToSpend < 0 ? 'text-rose-400' : 'text-white'}`}>
                {formatCurrency(safeToSpend.remainingSafeToSpend)}
              </span>
              <span className="text-slate-400 text-[11px]">
                (Meta diária: <strong className="text-emerald-400 font-mono">{formatCurrency(safeToSpend.safeDailyAmount)}/dia</strong> · {safeToSpend.daysRemaining} dias)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-400 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-5">
          <div>
            <span className="block text-[11px] text-slate-500">Fixos Comprometidos</span>
            <span className="font-mono text-slate-300 font-semibold">{formatCurrency(safeToSpend.fixedCommitted)}</span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-500">Aportes Planejados</span>
            <span className="font-mono text-blue-400 font-semibold">{formatCurrency(safeToSpend.plannedSavings)}</span>
          </div>
          <button
            onClick={onOpenIncomeModal}
            className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2 ml-auto"
          >
            Editar Rendas
          </button>
        </div>
      </div>

      {/* Indicadores gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Teto Total Planejado
          </span>
          <p className="text-2xl font-bold text-white tabular-nums font-mono">{formatCurrency(totalPlanned)}</p>
          <span className="text-xs text-slate-500 mt-1 block">Soma de todos os limites</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Já Gasto
          </span>
          <p className="text-2xl font-bold text-white tabular-nums font-mono">{formatCurrency(totalSpent)}</p>
          <span className="text-xs text-amber-400 mt-1 block">
            {totalPlanned > 0 ? ((totalSpent / totalPlanned) * 100).toFixed(1) : 0}% consumido
          </span>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
            Margem Disponível
          </span>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums font-mono">{formatCurrency(availableMargin)}</p>
          <span className="text-xs text-emerald-300 mt-1 block">Dentro do planejado</span>
        </div>
      </div>

      {/* Alerta inteligente se houver excesso */}
      {(overspent.length > 0 || warning.length > 0) && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-200 leading-relaxed">
            <strong className="font-semibold text-rose-300">Atenção aos limites: </strong>
            {overspent.length > 0 && (
              <span>
                {overspent.map((c) => c.categoryName).join(', ')} excedeu o teto estipulado!{' '}
              </span>
            )}
            {warning.length > 0 && (
              <span>
                {warning.map((c) => c.categoryName).join(', ')} já atingiu mais de 80% do teto.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Categorias */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-white text-sm">Limites por Categoria</h3>
          <span className="text-xs text-slate-500">Clique na categoria para editar o teto</span>
        </div>

        <div className="space-y-6">
          {budgets.map((b) => {
            const pct = b.planned > 0 ? (b.spent / b.planned) * 100 : 0;
            const isExceeded = pct > 100;
            const isWarning = pct >= 80 && pct <= 100;

            const barColor = isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';
            const badgeClass = isExceeded
              ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
              : isWarning
              ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
              : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

            return (
              <div
                key={b.id}
                onClick={() => {
                  setEditingBudget(b);
                  setNewLimitInput(b.planned.toString());
                }}
                className="group p-2.5 -mx-2.5 rounded-lg hover:bg-slate-800/40 transition-all cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {b.categoryName}
                    </span>
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-400">
                      Gasto: <strong className="text-white tabular-nums font-mono">{formatCurrency(b.spent)}</strong> / Teto:{' '}
                      <span className="tabular-nums font-mono">{formatCurrency(b.planned)}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeClass}`}>
                      {pct.toFixed(1)}% {isExceeded ? 'Excedido' : isWarning ? 'Atenção' : 'Saudável'}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Budget Modal */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Ajustar Teto de Gastos</h3>
            <p className="text-xs text-slate-400 mb-4">{editingBudget.categoryName}</p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Novo Limite Mensal (R$)</label>
                <input
                  type="number"
                  step="10"
                  value={newLimitInput}
                  onChange={(e) => setNewLimitInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-base focus:outline-none focus:border-emerald-500 font-mono"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBudget(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  Salvar Teto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------------
// VIEW 4: RESERVA DE EMERGÊNCIA
// ----------------------------------------------------------------------------------
interface EmergencyFundViewProps {
  emergency: EmergencyFund;
  suggestedMonthlyDeposit: number;
  onDeposit: (amount: number, desc?: string) => void;
  onWithdraw: (amount: number, desc?: string) => void;
  onSetTarget: (target: number) => void;
}

function EmergencyFundView({
  emergency,
  suggestedMonthlyDeposit,
  onDeposit,
  onWithdraw,
  onSetTarget,
}: EmergencyFundViewProps) {
  const [modalMode, setModalMode] = useState<'deposit' | 'withdraw' | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [descInput, setDescInput] = useState('');

  const pct = emergency.targetAmount > 0
    ? Math.min((emergency.currentBalance / emergency.targetAmount) * 100, 100)
    : 0;
  const remaining = Math.max(0, emergency.targetAmount - emergency.currentBalance);
  const monthsLeft = (suggestedMonthlyDeposit > 0 && remaining > 0) ? Math.ceil(remaining / suggestedMonthlyDeposit) : 0;
  const isGoalReached = emergency.targetAmount > 0 && emergency.currentBalance >= emergency.targetAmount;
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [customTargetInput, setCustomTargetInput] = useState(emergency.targetAmount.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountInput);
    if (!val || val <= 0) return;

    if (modalMode === 'deposit') {
      onDeposit(val, descInput);
    } else {
      onWithdraw(val, descInput);
    }

    setModalMode(null);
    setAmountInput('');
    setDescInput('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Reserva de Emergência</h2>
          <p className="text-xs text-slate-400">Seu colchão de segurança para imprevistos e estabilidade financeira.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCustomTargetInput(emergency.targetAmount ? emergency.targetAmount.toString() : '20000');
              setIsEditingTarget(true);
            }}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold"
          >
            Ajustar Meta
          </button>
          <button
            onClick={() => setModalMode('withdraw')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold"
          >
            Resgatar Valor
          </button>
          <button
            onClick={() => setModalMode('deposit')}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-950/50"
          >
            <Plus className="w-3.5 h-3.5" /> Aportar na Reserva
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block mb-1">
            Saldo Acumulado
          </span>
          <p className="text-2xl font-bold text-white tabular-nums font-mono">{formatCurrency(emergency.currentBalance)}</p>
          <span className="text-xs text-slate-500 mt-1 block">Liquidez imediata (100% CDI)</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Meta Estabelecida
          </span>
          <p className="text-2xl font-bold text-white tabular-nums font-mono">{formatCurrency(emergency.targetAmount)}</p>
          <span className="text-xs text-blue-400 mt-1 block">
            {emergency.monthlyAverageExpense > 0 && emergency.targetAmount > 0
              ? `${(emergency.targetAmount / emergency.monthlyAverageExpense).toFixed(1)} meses de custo de vida`
              : 'Clique em "Ajustar Meta" para definir'}
          </span>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
            Previsão de Alcance
          </span>
          <p className="text-2xl font-bold text-emerald-400">
            {isGoalReached
              ? 'Meta Concluída! 🎉'
              : emergency.targetAmount === 0
              ? 'Defina uma meta'
              : monthsLeft > 0
              ? `~ ${monthsLeft} Meses`
              : 'Aguardando aportes'}
          </p>
          <span className="text-xs text-emerald-300 mt-1 block">
            {isGoalReached
              ? 'Recursos liberados para investimentos'
              : suggestedMonthlyDeposit > 0
              ? `Aporte de ${formatCurrency(suggestedMonthlyDeposit)}/mês`
              : 'Sem saldo disponível no momento'}
          </span>
        </div>
      </div>

      {/* Progress & Rule */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <h3 className="font-bold text-white">Progresso da Meta: {pct.toFixed(1)}%</h3>
          <span className="text-blue-400 font-semibold">
            {emergency.targetAmount === 0
              ? 'Meta não definida'
              : isGoalReached
              ? 'Reserva Completa'
              : `Faltam ${formatCurrency(remaining)}`}
          </span>
        </div>

        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <strong>Regra Automática (RF-06/07):</strong> Quando a reserva atingir 100%, novos aportes não serão mais direcionados a ela. Os 60% serão automaticamente encaminhados para <strong>Investimentos</strong>.
          </span>
        </div>
      </div>

      {/* Edit Target Modal */}
      {isEditingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Definir Meta da Reserva</h3>
            <p className="text-xs text-slate-400 mb-4">Informe o valor total desejado para seu colchão de segurança.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = parseFloat(customTargetInput);
                if (!isNaN(v) && v >= 0) {
                  onSetTarget(v);
                }
                setIsEditingTarget(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs text-slate-400 block mb-1">Valor da Meta (R$)</label>
                <input
                  type="number"
                  step="100"
                  value={customTargetInput}
                  onChange={(e) => setCustomTargetInput(e.target.value)}
                  placeholder="Ex: 20000"
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-base focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingTarget(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dimension Calculator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white text-sm">Dimensionar Meta da Reserva</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Com base no custo de vida mensal estimado em{' '}
          <strong className="text-white tabular-nums font-mono">{formatCurrency(emergency.monthlyAverageExpense)}</strong>:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { months: 3, label: '3 Meses (Risco Baixo)' },
            { months: 6, label: '6 Meses (Recomendado) ★' },
            { months: 12, label: '12 Meses (Autônomo / PJ)' },
          ].map((item) => {
            const targetVal = emergency.monthlyAverageExpense * item.months;
            const isSelected = emergency.targetAmount === targetVal;
            return (
              <button
                key={item.months}
                type="button"
                onClick={() => onSetTarget(targetVal)}
                className={`p-3 rounded-lg border text-left text-xs transition-all ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/40 text-blue-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold">{item.label}</div>
                <div className="text-white mt-1 tabular-nums font-mono text-sm">{formatCurrency(targetVal)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deposit/Withdraw Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              {modalMode === 'deposit' ? 'Aportar na Reserva' : 'Registrar Resgate'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {modalMode === 'deposit'
                ? 'Aumenta a reserva sem contabilizar como despesa de consumo.'
                : 'Reduz o saldo da reserva sem inflar a renda operacional.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0,00"
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-base focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Motivo / Descrição</label>
                <input
                  type="text"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder={modalMode === 'deposit' ? 'Ex: Aporte mensal Nubank' : 'Ex: Manutenção imprevista'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors ${
                    modalMode === 'deposit' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Confirmar {modalMode === 'deposit' ? 'Aporte' : 'Resgate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------------
// VIEW 5: INVESTIMENTOS (PATRIMÔNIO & CARTEIRA)
// ----------------------------------------------------------------------------------
interface InvestmentsViewProps {
  assets: InvestmentAsset[];
  transactions: Transaction[];
  suggestedMonthlyInvestment: number;
  onAddAsset: (asset: InvestmentAsset) => void;
  onDeleteAsset: (id: string) => void;
}

function InvestmentsView({
  assets,
  transactions,
  suggestedMonthlyInvestment,
  onAddAsset,
  onDeleteAsset,
}: InvestmentsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [category, setCategory] = useState<'Renda Fixa' | 'FIIs' | 'Ações' | 'Cripto'>('Renda Fixa');
  const [amount, setAmount] = useState('');

  const totalApplied = assets.reduce((s, a) => s + a.appliedAmount, 0);
  const totalCurrent = assets.reduce((s, a) => s + a.currentAmount, 0);
  const profit = totalCurrent - totalApplied;
  const overallReturn = totalApplied > 0 ? (profit / totalApplied) * 100 : 0;

  // Real monthly proventos from income tagged as investments, dividends or yields
  const monthlyDividends = useMemo(() => {
    return transactions
      .filter(
        (t) =>
          t.type === 'income' &&
          (t.category.toLowerCase().includes('invest') ||
            t.category.toLowerCase().includes('dividend') ||
            t.category.toLowerCase().includes('rendimento') ||
            t.description.toLowerCase().includes('dividendo') ||
            t.description.toLowerCase().includes('jcp'))
      )
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const classBreakdown = {
    'Renda Fixa': assets.filter((a) => a.category === 'Renda Fixa').reduce((s, a) => s + a.currentAmount, 0),
    FIIs: assets.filter((a) => a.category === 'FIIs').reduce((s, a) => s + a.currentAmount, 0),
    Ações: assets.filter((a) => a.category === 'Ações').reduce((s, a) => s + a.currentAmount, 0),
    Cripto: assets.filter((a) => a.category === 'Cripto').reduce((s, a) => s + a.currentAmount, 0),
  };

  const getPct = (val: number) => (totalCurrent > 0 ? (val / totalCurrent) * 100 : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!name || isNaN(val)) return;

    onAddAsset({
      id: 'ast-' + Date.now(),
      name,
      institution: institution || 'Corretora',
      category,
      appliedAmount: val,
      currentAmount: val,
    });

    setIsModalOpen(false);
    setName('');
    setInstitution('');
    setAmount('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Carteira de Investimentos</h2>
          <p className="text-xs text-slate-400">Patrimônio de longo prazo, diversificação por classes e proventos.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-950/50"
        >
          <Plus className="w-3.5 h-3.5" /> Novo Ativo / Aporte
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
            Patrimônio Investido
          </span>
          <p className="text-2xl font-bold text-white tabular-nums font-mono">{formatCurrency(totalCurrent)}</p>
          <span className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> + {formatCurrency(profit)} ({overallReturn.toFixed(1)}%)
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Proventos no Mês
          </span>
          <p className="text-2xl font-bold text-white tabular-nums font-mono">{formatCurrency(monthlyDividends)}</p>
          <span className="text-xs text-blue-400 mt-1 block">
            {monthlyDividends > 0 ? 'Dividendos e rendimentos recebidos' : 'Nenhum provento recebido ainda'}
          </span>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
            Aporte Sugerido (RF-07)
          </span>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums font-mono">
            {formatCurrency(suggestedMonthlyInvestment)}
          </p>
          <span className="text-xs text-emerald-300 mt-1 block">Calculado sobre o Saldo Disponível</span>
        </div>
      </div>

      {/* Diversification Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <h3 className="font-bold text-white">Alocação por Classe de Ativos</h3>
          <span className="text-slate-400">Diversificação</span>
        </div>

        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div style={{ width: `${getPct(classBreakdown['Renda Fixa'])}%` }} className="h-full bg-blue-500" title="Renda Fixa" />
          <div style={{ width: `${getPct(classBreakdown['FIIs'])}%` }} className="h-full bg-emerald-500" title="FIIs" />
          <div style={{ width: `${getPct(classBreakdown['Ações'])}%` }} className="h-full bg-purple-500" title="Ações" />
          <div style={{ width: `${getPct(classBreakdown['Cripto'])}%` }} className="h-full bg-amber-500" title="Cripto" />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-1">
          <span className="text-blue-400">Renda Fixa ({getPct(classBreakdown['Renda Fixa']).toFixed(0)}%)</span>
          <span className="text-emerald-400">FIIs ({getPct(classBreakdown['FIIs']).toFixed(0)}%)</span>
          <span className="text-purple-400">Ações ({getPct(classBreakdown['Ações']).toFixed(0)}%)</span>
          <span className="text-amber-400">Cripto ({getPct(classBreakdown['Cripto']).toFixed(0)}%)</span>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-xs">Ativos em Carteira</h3>
          <span className="text-xs text-slate-500">{assets.length} ativos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-500 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Ativo</th>
                <th className="py-3 px-4 font-semibold">Instituição</th>
                <th className="py-3 px-4 font-semibold">Classe</th>
                <th className="py-3 px-4 font-semibold text-right">Aplicado</th>
                <th className="py-3 px-4 font-semibold text-right">Saldo Atual</th>
                <th className="py-3 px-4 font-semibold text-right">Rentabilidade</th>
                <th className="py-3 px-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Nenhum investimento cadastrado ainda. Clique em "+ Novo Ativo / Aporte" para começar.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const assetProfit = asset.currentAmount - asset.appliedAmount;
                  const ret = asset.appliedAmount > 0 ? (assetProfit / asset.appliedAmount) * 100 : 0;
                  return (
                    <tr key={asset.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{asset.name}</td>
                      <td className="py-3 px-4 text-slate-400">{asset.institution}</td>
                      <td className="py-3 px-4">
                        <span className="text-slate-300 font-medium">{asset.category}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 tabular-nums font-mono">
                        {formatCurrency(asset.appliedAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white tabular-nums font-mono">
                        {formatCurrency(asset.currentAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-400 tabular-nums font-mono">
                        + {ret.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onDeleteAsset(asset.id)}
                          title="Remover ativo"
                          className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Asset */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Novo Ativo / Aplicação</h3>
            <p className="text-xs text-slate-400 mb-4">Adicione uma aplicação ao seu patrimônio.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome do Ativo</label>
                <input
                  type="text"
                  placeholder="Ex: Tesouro IPCA+ 2035"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Instituição / Corretora</label>
                <input
                  type="text"
                  placeholder="Ex: XP, BTG, Nubank"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Classe</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Renda Fixa">Renda Fixa</option>
                    <option value="FIIs">FIIs</option>
                    <option value="Ações">Ações</option>
                    <option value="Cripto">Cripto</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                >
                  Salvar Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------------
// VIEW 6: RELATÓRIOS (ANÁLISE & EVOLUÇÃO)
// ----------------------------------------------------------------------------------
interface ReportsViewProps {
  income: number;
  expense: number;
  emergencyBalance: number;
  assetsTotal: number;
  transactions: Transaction[];
}

function ReportsView({ income, expense, emergencyBalance, assetsTotal, transactions }: ReportsViewProps) {
  const [period, setPeriod] = useState<'6m' | 'year' | '12m'>('6m');

  const history = [
    { month: 'Outubro', income, expense, netWorth: emergencyBalance + assetsTotal },
  ];

  const avgIncome = income;
  const avgExpense = expense;
  const savingsRate = avgIncome > 0 ? Math.max(0, ((avgIncome - avgExpense) / avgIncome) * 100) : 0;

  // Calculate dynamic expense categories from user transactions
  const expenseTxs = transactions.filter((t) => t.type === 'expense' && t.status === 'completed');
  const catMap: Record<string, number> = {};
  expenseTxs.forEach((t) => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });

  const categoryColors = ['bg-blue-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500', 'bg-purple-500', 'bg-cyan-500'];
  const categories = Object.entries(catMap).map(([name, val], idx) => ({
    name,
    pct: expense > 0 ? (val / expense) * 100 : 0,
    color: categoryColors[idx % categoryColors.length],
  }));

  const maxVal = Math.max(1000, income, expense);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Relatórios & Análise</h2>
          <p className="text-xs text-slate-400">Consistência financeira, comparativos mensais e curva patrimonial.</p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          {[
            { id: '6m', label: 'Últimos 6 Meses' },
            { id: 'year', label: 'Ano 2026' },
            { id: '12m', label: 'Últimos 12 Meses' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                period === item.id
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Média Mensal de Renda
          </span>
          <p className="text-2xl font-bold text-white tabular-nums font-mono">{formatCurrency(avgIncome)}</p>
          <span className="text-xs text-emerald-400 mt-1 block">Estabilidade elevada</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Média Mensal de Despesas
          </span>
          <p className="text-2xl font-bold text-white tabular-nums font-mono">{formatCurrency(avgExpense)}</p>
          <span className="text-xs text-blue-400 mt-1 block">
            {avgIncome > 0 ? ((avgExpense / avgIncome) * 100).toFixed(1) : '0.0'}% da renda média consumida
          </span>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
            Taxa Média de Poupança
          </span>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums font-mono">{savingsRate.toFixed(1)}%</p>
          <span className="text-xs text-emerald-300 mt-1 block">Destinado à Reserva e Investimentos</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white text-xs">Evolução Mensal (Receitas vs Despesas)</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Receitas
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Despesas
              </span>
            </div>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-6 border-b border-slate-800">
            {history.map((m) => {
              const inH = (m.income / maxVal) * 100;
              const exH = (m.expense / maxVal) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    <div
                      style={{ height: `${inH}%` }}
                      className="w-1/2 max-w-[16px] bg-emerald-500 hover:bg-emerald-400 rounded-t-sm transition-all"
                      title={`Receita: ${formatCurrency(m.income)}`}
                    />
                    <div
                      style={{ height: `${exH}%` }}
                      className="w-1/2 max-w-[16px] bg-rose-500 hover:bg-rose-400 rounded-t-sm transition-all"
                      title={`Despesa: ${formatCurrency(m.expense)}`}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 font-medium">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="font-bold text-white text-xs mb-1">Despesas por Categoria</h3>
          <p className="text-[11px] text-slate-500 mb-6">Média de consumo</p>

          <div className="space-y-4">
            {categories.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Nenhuma despesa registrada para categorizar ainda.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">{cat.name}</span>
                    <span className="text-slate-400 tabular-nums font-mono">{cat.pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Patrimônio Líquido */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-white text-xs">Evolução do Patrimônio Líquido Total</h3>
            <p className="text-[11px] text-slate-400">Reserva de Emergência + Investimentos</p>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg tabular-nums font-mono">
            Atual: {formatCurrency(emergencyBalance + assetsTotal)}
          </span>
        </div>

        <div className="grid grid-cols-6 gap-2 pt-6 pb-2 border-b border-slate-800 text-center">
          {history.map((item) => (
            <div key={item.month} className="flex flex-col items-center">
              <span className="text-[11px] font-bold text-white mb-2 tabular-nums font-mono">
                R$ {(item.netWorth / 1000).toFixed(1)}k
              </span>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-md shadow-emerald-500/50 mb-2" />
              <span className="text-[11px] text-slate-500 font-medium">{item.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// VIEW 7: CONFIGURAÇÕES & BACKUP
// ----------------------------------------------------------------------------------
interface SettingsViewProps {
  distribution: DistributionSettings;
  categories: Category[];
  onSaveDistribution: (dist: DistributionSettings) => void;
  onAddCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
  onResetDemo: () => void;
  onLoadDemoData: () => void;
  transactions: Transaction[];
  user: User | null;
  spreadsheetInfo: SpreadsheetInfo | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncError: string | null;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onForceSync: () => void;
  onReloadSheets: () => void;
}

function SettingsView({
  distribution,
  categories,
  onSaveDistribution,
  onAddCategory,
  onDeleteCategory,
  onResetDemo,
  onLoadDemoData,
  transactions,
  user,
  spreadsheetInfo,
  syncStatus,
  syncError,
  onGoogleLogin,
  onGoogleLogout,
  onForceSync,
  onReloadSheets,
}: SettingsViewProps) {
  const [em, setEm] = useState(distribution.emergencyPct);
  const [inv, setInv] = useState(distribution.investPct);
  const [fr, setFr] = useState(distribution.freePct);
  const [saved, setSaved] = useState(false);

  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [isCatModal, setIsCatModal] = useState(false);

  const total = em + inv + fr;
  const is100 = total === 100;

  const handleSaveDist = () => {
    if (!is100) return;
    onSaveDistribution({ emergencyPct: em, investPct: inv, freePct: fr });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    onAddCategory({
      id: 'cat-' + Date.now(),
      name: catName.trim(),
      type: catType,
      color: catColor,
    });
    setCatName('');
    setIsCatModal(false);
  };

  const exportJSON = () => {
    const data = {
      transactions,
      categories,
      distribution,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_financeiro_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const exportCSV = () => {
    const header = 'Data;Descrição;Tipo;Categoria;FormaPagamento;Status;Valor\n';
    const rows = transactions
      .map(
        (t) =>
          `${t.date};"${t.description}";${t.type};"${t.category}";${t.paymentMethod};${t.status};${t.amount}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrato_movimentacoes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Configurações & Preferências</h2>
          <p className="text-xs text-slate-400">Personalize parâmetros de alocação de saldo, banco de dados e categorias.</p>
        </div>
        <button
          onClick={handleSaveDist}
          disabled={!is100}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            is100
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          Salvar Alterações
        </button>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Configurações salvas com sucesso!
        </div>
      )}

      {/* Google Sheets Cloud Database Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-xs sm:text-sm">Banco de Dados no Google Sheets</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Seus lançamentos, orçamentos, reserva e investimentos salvos diretamente no seu Google Drive.
              </p>
            </div>
          </div>

          {!user ? (
            <button
              onClick={onGoogleLogin}
              className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all border border-slate-200 active:scale-95 shrink-0"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Conectar com Google</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onForceSync}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                title="Gravar estado atual completo na planilha"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>Sincronizar Agora</span>
              </button>

              <button
                onClick={onReloadSheets}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-all"
                title="Puxar dados atualizados diretamente da planilha"
              >
                <span>Recarregar do Sheets</span>
              </button>

              <button
                onClick={onGoogleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg text-xs transition-colors"
                title="Desconectar conta Google"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </button>
            </div>
          )}
        </div>

        {user && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-0.5">Conta Conectada</span>
              <p className="text-xs font-semibold text-white truncate">{user.email}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-0.5">Planilha no Google Drive</span>
              {spreadsheetInfo ? (
                <a
                  href={spreadsheetInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 truncate"
                >
                  <span className="truncate">{spreadsheetInfo.name}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                </a>
              ) : (
                <p className="text-xs text-slate-500">Localizando ou criando planilha...</p>
              )}
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-0.5">Status de Sincronização</span>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                {syncStatus === 'synced' && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Atualizado em tempo real
                  </span>
                )}
                {syncStatus === 'syncing' && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando alterações...
                  </span>
                )}
                {syncStatus === 'error' && (
                  <span className="text-rose-400 flex items-center gap-1" title={syncError || ''}>
                    <AlertTriangle className="w-3.5 h-3.5" /> Erro na sincronização
                  </span>
                )}
                {syncStatus === 'idle' && (
                  <span className="text-slate-400">Pronto para sincronizar</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Regra de Distribuição */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-xs">Distribuição Automática do Saldo Mensal (RF-07)</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Percentuais aplicados sobre a sobra de caixa ao final do mês.
            </p>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
              is100
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            Total: {total}% {is100 ? '✓' : '(Deve somar 100%)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-slate-950 rounded-lg border border-blue-500/30">
            <label className="text-xs font-bold text-blue-400 block mb-2">Reserva de Emergência</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={em}
                onChange={(e) => setEm(parseInt(e.target.value) || 0)}
                className="w-20 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-lg font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-sm font-bold text-slate-400">%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Até alcançar a meta definida.</p>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-emerald-500/30">
            <label className="text-xs font-bold text-emerald-400 block mb-2">Investimentos</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={inv}
                onChange={(e) => setInv(parseInt(e.target.value) || 0)}
                className="w-20 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-lg font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-sm font-bold text-slate-400">%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Patrimônio de longo prazo.</p>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-amber-500/30">
            <label className="text-xs font-bold text-amber-400 block mb-2">Dinheiro Livre</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={fr}
                onChange={(e) => setFr(parseInt(e.target.value) || 0)}
                className="w-20 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-lg font-bold text-white focus:outline-none focus:border-amber-500 font-mono"
              />
              <span className="text-sm font-bold text-slate-400">%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Lazer e consumo livre de culpa.</p>
          </div>
        </div>
      </div>

      {/* Categorias & Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-xs">Categorias Financeiras (RF-04)</h3>
            <button
              onClick={() => setIsCatModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Categoria
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {categories.map((cat) => (
              <div key={cat.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-white">{cat.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">
                    {cat.type === 'income' ? 'Receita' : 'Despesa'}
                  </span>
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="font-bold text-white text-xs mb-1">Backup & Exportação</h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Exporte seus dados locais para manter cópias de segurança em seu computador.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={exportJSON}
                className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white rounded-lg text-xs font-semibold transition-all"
              >
                <Download className="w-4 h-4 text-emerald-400" /> Exportar Backup (JSON)
              </button>

              <button
                onClick={exportCSV}
                className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white rounded-lg text-xs font-semibold transition-all"
              >
                <Download className="w-4 h-4 text-blue-400" /> Exportar Extrato (CSV)
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <h3 className="font-bold text-white text-xs">Ambiente de Testes & Simulação</h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Carregue um cenário financeiro equilibrado e realista para validar cálculos, orçamentos e relatórios.
            </p>

            <div className="space-y-2">
              <button
                onClick={onLoadDemoData}
                className="w-full flex items-center justify-center gap-2 p-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold transition-all"
                title="Carregar cenário equilibrado (CLT + freelance, contas fixas, lazer e carteira de ativos)"
              >
                <Sparkles className="w-4 h-4 text-amber-400" /> Carregar Cenário de Teste (Equilibrado)
              </button>

              <button
                onClick={onResetDemo}
                className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-lg text-xs font-semibold transition-all text-center"
                title="Limpar todos os dados e começar do zero"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Zerar Todos os Dados
              </button>
            </div>
          </div>

          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300">
            ✓ Sistema operando com persistência em armazenamento local.
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {isCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Adicionar Nova Categoria</h3>

            <form onSubmit={handleAddCat} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome da Categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Cursos, Assinaturas, Pets"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Tipo</label>
                  <select
                    value={catType}
                    onChange={(e) => setCatType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Cor</label>
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-full h-8 bg-slate-950 border border-slate-800 rounded cursor-pointer p-0.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCatModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  Criar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------------
// GLOBAL MODAL: NOVA MOVIMENTAÇÃO (RF-02, RF-03, RF-06, RF-08)
// ----------------------------------------------------------------------------------
interface QuickTxModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSubmit: (tx: Omit<Transaction, 'id'>, assetFlow?: 'emergency' | 'investments') => void;
}

function QuickTransactionModal({ isOpen, onClose, categories, onSubmit }: QuickTxModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [assetDestination, setAssetDestination] = useState<'emergency' | 'investments'>('emergency');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0 || !description.trim()) return;

    onSubmit(
      {
        description: description.trim(),
        amount: val,
        type,
        category: type === 'asset' ? (assetDestination === 'emergency' ? 'Reserva de Emergência' : 'Investimentos') : category,
        paymentMethod,
        status: 'completed',
        date,
        isRecurring,
      },
      type === 'asset' ? assetDestination : undefined
    );

    // Reset and close
    setAmount('');
    setDescription('');
    setIsRecurring(false);
    onClose();
  };

  const filteredCategories = categories.filter((c) => (type === 'income' ? c.type === 'income' : c.type === 'expense'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-base font-bold text-white mb-4">Adicionar Lançamento</h2>

        {/* Type Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setType('expense');
              if (categories.filter((c) => c.type === 'expense').length > 0) {
                setCategory(categories.filter((c) => c.type === 'expense')[0].name);
              }
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              type === 'expense'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" /> Despesa
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income');
              if (categories.filter((c) => c.type === 'income').length > 0) {
                setCategory(categories.filter((c) => c.type === 'income')[0].name);
              }
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              type === 'income'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Receita
          </button>
          <button
            type="button"
            onClick={() => setType('asset')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              type === 'asset'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Aporte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-lg font-bold focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Descrição</label>
            <input
              type="text"
              placeholder={
                type === 'expense'
                  ? 'Ex: Supermercado Pão de Açúcar'
                  : type === 'income'
                  ? 'Ex: Salário CLT ou Freelance'
                  : 'Ex: Aporte Tesouro Selic'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {type === 'asset' ? (
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Destino do Aporte</label>
              <select
                value={assetDestination}
                onChange={(e) => setAssetDestination(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="emergency">Reserva de Emergência (Liquidez)</option>
                <option value="investments">Investimentos Gerais (Longo Prazo)</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Forma de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="PIX">PIX</option>
                <option value="Cartão Crédito">Cartão de Crédito</option>
                <option value="Débito">Cartão de Débito</option>
                <option value="Boleto">Boleto Bancário</option>
                <option value="Transferência">Transferência / TED</option>
                <option value="Dinheiro">Dinheiro Físico</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_recurring_box"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-0 w-3.5 h-3.5"
            />
            <label htmlFor="is_recurring_box" className="text-xs text-slate-400 cursor-pointer">
              Lançamento fixo / recorrente todo mês
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg text-xs mt-4 transition-colors"
          >
            Confirmar Registro
          </button>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------
// MODAL: GERENCIAR FONTES DE RENDA E SALÁRIO
// ----------------------------------------------------------------------------------
interface ManageIncomeSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomeSources: IncomeSource[];
  onSaveSources: (newSources: IncomeSource[]) => void;
}

function ManageIncomeSourcesModal({
  isOpen,
  onClose,
  incomeSources,
  onSaveSources,
}: ManageIncomeSourcesModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'extra'>('monthly');
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalMonthlyIncome = incomeSources.reduce((sum, s) => sum + s.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    if (editingId) {
      const updated = incomeSources.map((s) =>
        s.id === editingId
          ? { ...s, name: name.trim(), amount: parsedAmount, frequency }
          : s
      );
      onSaveSources(updated);
      setEditingId(null);
    } else {
      const newSource: IncomeSource = {
        id: 'inc-' + Date.now(),
        name: name.trim(),
        amount: parsedAmount,
        frequency,
      };
      onSaveSources([...incomeSources, newSource]);
    }

    setName('');
    setAmount('');
    setFrequency('monthly');
  };

  const handleEdit = (source: IncomeSource) => {
    setEditingId(source.id);
    setName(source.name);
    setAmount(source.amount.toString());
    setFrequency(source.frequency);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setAmount('');
    setFrequency('monthly');
  };

  const handleDelete = (id: string) => {
    const updated = incomeSources.filter((s) => s.id !== id);
    onSaveSources(updated);
    if (editingId === id) {
      handleCancelEdit();
    }
  };

  const setPreset = (presetName: string) => {
    setName(presetName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Salário & Fontes de Renda</h3>
              <p className="text-xs text-slate-400">
                Base para cálculo de capacidade de gastos no mês.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Banner */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-4 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Renda Mensal Prevista Total</span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums">
            {formatCurrency(totalMonthlyIncome)}
          </span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Add / Edit Form */}
          <form onSubmit={handleSubmit} className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {editingId ? 'Editar Fonte de Renda' : 'Cadastrar Nova Renda'}
              </h4>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            {/* Quick Presets */}
            {!editingId && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Salário Líquido CLT', 'Freelance / Extras', 'Pró-Labore', 'Rendimentos'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreset(p)}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                  >
                    + {p}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Nome da Fonte de Renda
              </label>
              <input
                type="text"
                placeholder="Ex: Salário CLT, Freelance, Aluguel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Valor Estimado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm font-bold focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Frequência
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'monthly' | 'extra')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="monthly">Mensal Recorrente</option>
                  <option value="extra">Extra / Ocasional</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingId ? 'Salvar Alteração' : 'Adicionar Fonte de Renda'}</span>
            </button>
          </form>

          {/* List of Registered Sources */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Fontes Cadastradas ({incomeSources.length})
            </h4>

            {incomeSources.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl p-4 text-xs text-slate-500">
                Nenhuma fonte cadastrada ainda. Adicione seu salário ou outra fonte acima para calcular sua capacidade de gastos.
              </div>
            ) : (
              <div className="space-y-2">
                {incomeSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-white block">{source.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {source.frequency === 'monthly' ? 'Mensal Recorrente' : 'Extra / Pontual'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
                        {formatCurrency(source.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEdit(source)}
                        className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                        title="Editar fonte"
                      >
                        <SettingsIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(source.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                        title="Excluir fonte"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 max-w-xs">
            As alterações são salvas automaticamente e sincronizadas com a sua planilha do Google Sheets.
          </p>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
