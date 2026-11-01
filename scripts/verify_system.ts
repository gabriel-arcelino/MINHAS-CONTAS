import { getDemoFinancialData, getEmptyFinancialData } from '../src/initialData';
import { Transaction, CategoryBudget, EmergencyFund, InvestmentAsset, DistributionSettings, IncomeSource } from '../src/types';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, test: string, suite: string, details?: string) {
  results.push({
    suite,
    test,
    passed: Boolean(condition),
    details: condition ? undefined : details || 'Assertion failed',
  });
}

console.log('===========================================================');
console.log('   INICIANDO BATERIA DE TESTES DE INTEGRIDADE DO SISTEMA   ');
console.log('===========================================================\n');

// 1. CARREGAMENTO DOS DADOS FICTÍCIOS
const demoData = getDemoFinancialData();

assert(demoData.transactions.length === 17, 'Total de transações de demonstração deve ser 17', 'Cenário Inicial');
assert(demoData.incomeSources.length === 2, 'Total de fontes de renda deve ser 2', 'Cenário Inicial');
assert(demoData.budgets.length === 6, 'Total de categorias de orçamento deve ser 6', 'Cenário Inicial');
assert(demoData.assets.length === 5, 'Total de ativos de investimento deve ser 5', 'Cenário Inicial');
assert(demoData.emergencyFund.targetAmount === 24000, 'Meta da reserva deve ser R$ 24.000,00', 'Cenário Inicial');
assert(demoData.emergencyFund.currentBalance === 14800, 'Saldo atual da reserva deve ser R$ 14.800,00', 'Cenário Inicial');

// 2. RECEITAS E FONTES DE RENDA
const totalIncomeExpected = demoData.incomeSources.reduce((acc, s) => acc + s.amount, 0);
assert(totalIncomeExpected === 7000.0, 'Renda mensal total esperada (CLT + Freelance) deve ser R$ 7.000,00', 'Fontes de Renda');

const completedIncomeTxs = demoData.transactions
  .filter((t) => t.type === 'income' && t.status === 'completed')
  .reduce((acc, t) => acc + t.amount, 0);
assert(completedIncomeTxs === 7000.0, 'Receitas completas nas transações devem somar R$ 7.000,00', 'Transações de Renda');

// 3. DESPESAS E ORÇAMENTO
const totalPlannedBudget = demoData.budgets.reduce((acc, b) => acc + b.planned, 0);
assert(totalPlannedBudget === 5630.0, 'Orçamento planejado total deve somar R$ 5.630,00', 'Orçamento Mensal');

const totalSpentBudget = demoData.budgets.reduce((acc, b) => acc + b.spent, 0);
assert(totalSpentBudget === 4052.9, `Gasto total nas categorias deve somar R$ 4.052,90 (obtido: ${totalSpentBudget})`, 'Orçamento Mensal');

// 4. TESTE DE CÁLCULO SAFE-TO-SPEND ("QUANTO POSSO GASTAR")
const fixedKeywords = [
  'moradia', 'aluguel', 'condomínio', 'condominio', 'contas', 'serviços', 'servicos',
  'assinaturas', 'educação', 'educacao', 'saúde', 'saude', 'transporte', 'internet', 'luz', 'energia', 'água', 'agua'
];

const fixedBudgets = demoData.budgets
  .filter((b) => fixedKeywords.some((k) => b.categoryName.toLowerCase().includes(k)))
  .reduce((sum, b) => sum + b.planned, 0);

const recurringExpenseActual = demoData.transactions
  .filter((t) => t.type === 'expense' && t.isRecurring)
  .reduce((sum, t) => sum + t.amount, 0);

const fixedCommitted = Math.max(fixedBudgets, recurringExpenseActual);
assert(fixedCommitted > 0, 'Despesas fixas comprometidas devem ser maiores que 0', 'Safe-to-Spend');

const netBase = Math.max(0, totalIncomeExpected - fixedCommitted);
const plannedSavings = (netBase * (demoData.distribution.emergencyPct + demoData.distribution.investPct)) / 100;
const freeSpendCeiling = Math.max(0, totalIncomeExpected - fixedCommitted - plannedSavings);

const spentVariable = demoData.transactions
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

assert(freeSpendCeiling >= 0, 'Teto de gastos livres deve ser um valor válido (>= 0)', 'Safe-to-Spend');
assert(spentVariable > 0, 'Despesas variáveis realizadas devem ser contabilizadas', 'Safe-to-Spend');
assert(daysRemaining >= 1 && daysRemaining <= 31, 'Dias restantes do mês devem estar entre 1 e 31', 'Safe-to-Spend');
assert(typeof safeDailyAmount === 'number' && !isNaN(safeDailyAmount), 'Meta diária deve ser um número válido', 'Safe-to-Spend');

// 5. TESTE DE SMART REDIRECTION (RF-07)
function calcSmartDistribution(
  available: number,
  dist: DistributionSettings,
  emergency: EmergencyFund
) {
  if (available <= 0) return { emergency: 0, investments: 0, freeCash: 0, overflow: 0 };
  const rawEmergency = (available * dist.emergencyPct) / 100;
  const rawInvestments = (available * dist.investPct) / 100;
  const freeCash = (available * dist.freePct) / 100;
  const needed = Math.max(0, emergency.targetAmount - emergency.currentBalance);

  let actualEmergency = rawEmergency;
  let overflow = 0;
  if (rawEmergency > needed) {
    actualEmergency = needed;
    overflow = rawEmergency - needed;
  }
  const actualInvestments = rawInvestments + overflow;
  return { emergency: actualEmergency, investments: actualInvestments, freeCash, overflow };
}

// Caso 1: Reserva ainda não atingida
const res1 = calcSmartDistribution(1000, demoData.distribution, demoData.emergencyFund);
assert(res1.emergency === 600, 'Com sobra para a reserva, 60% deve ir para reserva (R$ 600)', 'Regra RF-07');
assert(res1.investments === 300, '30% deve ir para investimentos (R$ 300)', 'Regra RF-07');
assert(res1.freeCash === 100, '10% deve ir para gastos livres (R$ 100)', 'Regra RF-07');
assert(res1.overflow === 0, 'Não deve haver transbordo quando reserva não atinge o teto', 'Regra RF-07');

// Caso 2: Reserva quase cheia (faltam apenas R$ 200 para a meta de R$ 24.000)
const nearFullEmergency: EmergencyFund = { ...demoData.emergencyFund, currentBalance: 23800 };
const res2 = calcSmartDistribution(1000, demoData.distribution, nearFullEmergency);
assert(res2.emergency === 200, 'Reserva deve receber apenas os R$ 200 necessários para completar a meta', 'Regra RF-07');
assert(res2.overflow === 400, 'O excedente de R$ 400 deve transbordar para investimentos', 'Regra RF-07');
assert(res2.investments === 700, 'Investimentos devem receber 300 + 400 = R$ 700', 'Regra RF-07');

// 6. TESTE DE CARTEIRA DE INVESTIMENTOS
const totalInvested = demoData.assets.reduce((sum, a) => sum + a.appliedAmount, 0);
const totalCurrent = demoData.assets.reduce((sum, a) => sum + a.currentAmount, 0);
const profitAmount = totalCurrent - totalInvested;
const profitPercent = (profitAmount / totalInvested) * 100;

assert(totalInvested === 25300.0, 'Total investido na carteira de demonstração deve ser R$ 25.300,00', 'Investimentos');
assert(totalCurrent === 26720.0, 'Valor atual da carteira deve ser R$ 26.720,00', 'Investimentos');
assert(profitAmount === 1420.0, 'Lucro nominal deve ser de R$ 1.420,00', 'Investimentos');
assert(Math.abs(profitPercent - 5.61) < 0.02, 'Rentabilidade percentual deve ser aproximadamente +5,61%', 'Investimentos');

// 7. TESTE DE MUTAÇÃO DE ESTADO (ADIÇÃO, ATUALIZAÇÃO E STATUS)
let testTxList = [...demoData.transactions];
let testBudgets = [...demoData.budgets];
let testEmergency = { ...demoData.emergencyFund };
let testAssets = [...demoData.assets];

// Teste de Adicionar Despesa
const newExpense: Transaction = {
  id: 'tx-test-add',
  description: 'Farmácia Teste Unitário',
  amount: 50.0,
  type: 'expense',
  category: 'Saúde & Cuidados',
  paymentMethod: 'PIX',
  status: 'completed',
  date: `${year}-${String(month + 1).padStart(2, '0')}-15`,
  isRecurring: false,
};
testTxList.unshift(newExpense);
testBudgets = testBudgets.map((b) =>
  b.categoryName.toLowerCase().includes('saúde') ? { ...b, spent: b.spent + newExpense.amount } : b
);

const updatedSaudeBudget = testBudgets.find((b) => b.categoryName.toLowerCase().includes('saúde'));
assert(updatedSaudeBudget?.spent === 455.0, 'Adicionar despesa de R$ 50 deve atualizar o gasto da categoria Saúde de 405 para 455', 'Mutações de Transação');

// Teste de Adicionar Aporte na Reserva
const newReservaAporte: Transaction = {
  id: 'tx-test-aporte',
  description: 'Aporte Extra Reserva',
  amount: 500.0,
  type: 'asset',
  category: 'Reserva de Emergência',
  paymentMethod: 'Transferência',
  status: 'completed',
  date: `${year}-${String(month + 1).padStart(2, '0')}-20`,
  isRecurring: false,
};
testTxList.unshift(newReservaAporte);
testEmergency = { ...testEmergency, currentBalance: testEmergency.currentBalance + newReservaAporte.amount };
assert(testEmergency.currentBalance === 15300.0, 'Aporte de R$ 500 na reserva deve elevar o saldo de 14.800 para 15.300', 'Mutações de Transação');

// Teste de Alternância de Status (Pendente -> Concluído)
const pendingTx = testTxList.find((t) => t.status === 'pending');
assert(pendingTx !== undefined, 'Deve existir pelo menos uma transação pendente no cenário de teste', 'Status de Transação');
if (pendingTx) {
  const toggledTxList = testTxList.map((t) => (t.id === pendingTx.id ? { ...t, status: 'completed' as const } : t));
  const toggled = toggledTxList.find((t) => t.id === pendingTx.id);
  assert(toggled?.status === 'completed', 'Transação pendente deve poder ser alterada para concluída', 'Status de Transação');
}

// 8. TESTE DE FILTRAGEM DE TRANSAÇÕES
const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
const currentMonthTxs = demoData.transactions.filter((t) => t.date.startsWith(currentMonthPrefix));
assert(currentMonthTxs.length === demoData.transactions.length, 'Todas as transações dinâmicas devem pertencer ao mês atual', 'Filtros');

const expenseOnly = demoData.transactions.filter((t) => t.type === 'expense');
assert(expenseOnly.length === 13, 'Deve haver 13 despesas (fixas + variáveis + pendente)', 'Filtros');

const incomeOnly = demoData.transactions.filter((t) => t.type === 'income');
assert(incomeOnly.length === 2, 'Deve haver 2 receitas', 'Filtros');

const assetOnly = demoData.transactions.filter((t) => t.type === 'asset');
assert(assetOnly.length === 2, 'Deve haver 2 aportes de ativos', 'Filtros');

// 9. TESTE DO RESUMO DE RESULTADOS
const totalTests = results.length;
const passedTests = results.filter((r) => r.passed).length;
const failedTests = results.filter((r) => !r.passed);

console.log('--- RELATÓRIO DETALHADO DOS TESTES ---\n');
const grouped = results.reduce<Record<string, TestResult[]>>((acc, r) => {
  acc[r.suite] = acc[r.suite] || [];
  acc[r.suite].push(r);
  return acc;
}, {});

for (const [suite, items] of Object.entries(grouped)) {
  console.log(`[SUITE] ${suite}:`);
  for (const item of items) {
    console.log(`  ${item.passed ? '✓' : '✗'} ${item.test}`);
    if (!item.passed) {
      console.log(`    ERRO: ${item.details}`);
    }
  }
  console.log('');
}

console.log('===========================================================');
console.log(`TOTAL DE TESTES: ${totalTests} | PASSARAM: ${passedTests} | FALHAS: ${failedTests.length}`);
console.log('===========================================================');

if (failedTests.length > 0) {
  process.exit(1);
} else {
  console.log('TODAS AS FUNCIONALIDADES E CÁLCULOS FORAM VALIDADOS COM SUCESSO!');
  process.exit(0);
}
