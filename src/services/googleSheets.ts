import {
  Transaction,
  CategoryBudget,
  EmergencyFund,
  InvestmentAsset,
  DistributionSettings,
  IncomeSource,
} from '../types.ts';

export interface FullFinancialData {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  emergencyFund: EmergencyFund;
  assets: InvestmentAsset[];
  distributionSettings: DistributionSettings;
  incomeSources?: IncomeSource[];
}

export interface SpreadsheetInfo {
  id: string;
  name: string;
  url: string;
}

const APP_SPREADSHEET_NAME = 'Meu Financeiro - Base de Dados';

/**
 * Searches Google Drive for an existing app spreadsheet, or creates one with all structured sheets.
 */
export async function findOrCreateAppSpreadsheet(accessToken: string): Promise<SpreadsheetInfo> {
  const query = encodeURIComponent(
    `name = '${APP_SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
  );
  
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchRes.ok) {
    const errorBody = await searchRes.text();
    console.error('Falha ao buscar planilha no Drive:', errorBody);
    throw new Error('Não foi possível verificar planilhas existentes no seu Google Drive.');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existing = searchData.files[0];
    return {
      id: existing.id,
      name: existing.name,
      url: existing.webViewLink || `https://docs.google.com/spreadsheets/d/${existing.id}/edit`,
    };
  }

  // Create new spreadsheet with our 5 schema sheets
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: APP_SPREADSHEET_NAME,
      },
      sheets: [
        {
          properties: {
            title: 'Transacoes',
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Orcamentos',
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Reserva',
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Investimentos',
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Configuracoes',
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorBody = await createRes.text();
    console.error('Falha ao criar planilha:', errorBody);
    throw new Error('Falha ao criar a planilha do Meu Financeiro no Google Drive.');
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;

  // Initialize header rows
  const headerValues = [
    {
      range: 'Transacoes!A1:I1',
      values: [
        [
          'ID',
          'Data',
          'Descrição',
          'Categoria',
          'Tipo',
          'Valor (R$)',
          'Forma de Pagamento',
          'Status',
          'Recorrente',
        ],
      ],
    },
    {
      range: 'Orcamentos!A1:C1',
      values: [['ID', 'Categoria', 'Valor Planejado (R$)']],
    },
    {
      range: 'Reserva!A1:C1',
      values: [['Saldo Atual (R$)', 'Meta (R$)', 'Gasto Mensal Médio (R$)']],
    },
    {
      range: 'Investimentos!A1:F1',
      values: [
        [
          'ID',
          'Nome do Ativo',
          'Instituição',
          'Categoria',
          'Valor Aplicado (R$)',
          'Valor Atual (R$)',
        ],
      ],
    },
    {
      range: 'Configuracoes!A1:D1',
      values: [['% Reserva', '% Investimentos', '% Dinheiro Livre', 'Fontes de Renda (JSON)']],
    },
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: headerValues,
    }),
  });

  return {
    id: spreadsheetId,
    name: APP_SPREADSHEET_NAME,
    url: createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * Loads financial data from the connected Google Sheet
 */
export async function loadAllDataFromSheets(
  spreadsheetId: string,
  accessToken: string
): Promise<Partial<FullFinancialData>> {
  const ranges = [
    'Transacoes!A2:I',
    'Orcamentos!A2:C',
    'Reserva!A2:C',
    'Investimentos!A2:F',
    'Configuracoes!A2:D',
  ];

  const params = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Falha ao ler dados da planilha:', errorBody);
    throw new Error('Não foi possível obter dados da sua planilha.');
  }

  const data = await res.json();
  const valueRanges = data.valueRanges || [];

  const transRows: any[][] = valueRanges[0]?.values || [];
  const orcRows: any[][] = valueRanges[1]?.values || [];
  const resRows: any[][] = valueRanges[2]?.values || [];
  const invRows: any[][] = valueRanges[3]?.values || [];
  const confRows: any[][] = valueRanges[4]?.values || [];

  const transactions: Transaction[] = transRows.map((r) => ({
    id: String(r[0] || `tx-${Date.now()}-${Math.random()}`),
    date: String(r[1] || new Date().toISOString().slice(0, 10)),
    description: String(r[2] || 'Sem descrição'),
    category: String(r[3] || 'Outros'),
    type: (r[4] === 'income' || r[4] === 'expense' || r[4] === 'asset' ? r[4] : 'expense') as Transaction['type'],
    amount: Number(String(r[5] || '0').replace(',', '.')) || 0,
    paymentMethod: String(r[6] || 'PIX'),
    status: (r[7] === 'pending' ? 'pending' : 'completed') as Transaction['status'],
    isRecurring: String(r[8]).toLowerCase() === 'true' || String(r[8]).toLowerCase() === 'sim',
  }));

  const budgets: CategoryBudget[] = orcRows.map((r) => ({
    id: String(r[0] || `bgt-${Math.random()}`),
    categoryId: String(r[0] || ''),
    categoryName: String(r[1] || 'Categoria'),
    planned: Number(String(r[2] || '0').replace(',', '.')) || 0,
    spent: 0,
  }));

  let emergencyFund: EmergencyFund | undefined;
  if (resRows.length > 0) {
    emergencyFund = {
      currentBalance: Number(String(resRows[0][0] || '0').replace(',', '.')) || 0,
      targetAmount: Number(String(resRows[0][1] || '0').replace(',', '.')) || 0,
      monthlyAverageExpense: Number(String(resRows[0][2] || '0').replace(',', '.')) || 0,
    };
  }

  const assets: InvestmentAsset[] = invRows.map((r) => ({
    id: String(r[0] || `ast-${Math.random()}`),
    name: String(r[1] || 'Ativo'),
    institution: String(r[2] || 'Banco'),
    category: (['Renda Fixa', 'FIIs', 'Ações', 'Cripto'].includes(r[3])
      ? r[3]
      : 'Renda Fixa') as InvestmentAsset['category'],
    appliedAmount: Number(String(r[4] || '0').replace(',', '.')) || 0,
    currentAmount: Number(String(r[5] || r[4] || '0').replace(',', '.')) || 0,
  }));

  let distributionSettings: DistributionSettings | undefined;
  let incomeSources: IncomeSource[] | undefined;
  if (confRows.length > 0) {
    distributionSettings = {
      emergencyPct: Number(String(confRows[0][0] || '60').replace(',', '.')) || 60,
      investPct: Number(String(confRows[0][1] || '30').replace(',', '.')) || 30,
      freePct: Number(String(confRows[0][2] || '10').replace(',', '.')) || 10,
    };
    if (confRows[0][3]) {
      try {
        incomeSources = JSON.parse(confRows[0][3]);
      } catch {
        incomeSources = [];
      }
    }
  }

  return {
    transactions,
    budgets,
    emergencyFund,
    assets,
    distributionSettings,
    incomeSources,
  };
}

/**
 * Saves all system state back to the connected Google Spreadsheet.
 */
export async function syncAllDataToSheets(
  spreadsheetId: string,
  data: FullFinancialData,
  accessToken: string
): Promise<void> {
  // Clear old rows first to prevent stale rows if items were removed
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: [
          'Transacoes!A2:I',
          'Orcamentos!A2:C',
          'Reserva!A2:C',
          'Investimentos!A2:F',
          'Configuracoes!A2:D',
        ],
      }),
    }
  );

  // Prepare updated data payloads
  const transRows = data.transactions.map((tx) => [
    tx.id,
    tx.date,
    tx.description,
    tx.category,
    tx.type,
    tx.amount,
    tx.paymentMethod,
    tx.status,
    tx.isRecurring ? 'Sim' : 'Não',
  ]);

  const orcRows = data.budgets.map((b) => [b.id, b.categoryName, b.planned]);

  const resRows = [
    [
      data.emergencyFund.currentBalance,
      data.emergencyFund.targetAmount,
      data.emergencyFund.monthlyAverageExpense,
    ],
  ];

  const invRows = data.assets.map((ast) => [
    ast.id,
    ast.name,
    ast.institution,
    ast.category,
    ast.appliedAmount,
    ast.currentAmount,
  ]);

  const confRows = [
    [
      data.distributionSettings.emergencyPct,
      data.distributionSettings.investPct,
      data.distributionSettings.freePct,
      JSON.stringify(data.incomeSources || []),
    ],
  ];

  const updates = [
    {
      range: `Transacoes!A2:I${Math.max(2, transRows.length + 1)}`,
      values: transRows.length > 0 ? transRows : [['', '', '', '', '', '', '', '', '']],
    },
    {
      range: `Orcamentos!A2:C${Math.max(2, orcRows.length + 1)}`,
      values: orcRows.length > 0 ? orcRows : [['', '', '']],
    },
    {
      range: 'Reserva!A2:C2',
      values: resRows,
    },
    {
      range: `Investimentos!A2:F${Math.max(2, invRows.length + 1)}`,
      values: invRows.length > 0 ? invRows : [['', '', '', '', '', '']],
    },
    {
      range: 'Configuracoes!A2:D2',
      values: confRows,
    },
  ];

  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updates,
      }),
    }
  );

  if (!writeRes.ok) {
    const errorBody = await writeRes.text();
    console.error('Falha ao salvar na planilha:', errorBody);
    throw new Error('Falha ao sincronizar dados com o Google Sheets.');
  }
}
