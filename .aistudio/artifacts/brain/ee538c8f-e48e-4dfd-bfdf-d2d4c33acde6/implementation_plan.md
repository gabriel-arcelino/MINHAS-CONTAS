# Planejamento: Quanto Posso Gastar no Mês (Limite Seguro & Meta Diária)

Este plano detalha a criação do módulo de **Capacidade Mensal de Gastos ("Safe-to-Spend")**, permitindo ao usuário cadastrar seu salário e fontes de renda esperadas, deduzir automaticamente despesas fixas e aportes, e acompanhar exatamente quanto pode gastar no total do mês e por dia útil até o fechamento.

---

### Decisões do Usuário & Pontos Críticos

> [!IMPORTANT]
> **Decisões confirmadas na etapa anterior:**
> 1. **Cadastro de Renda**: O usuário definirá o salário base e outras fontes de renda (ex: freelance, bônus, pensão) através de um painel/modal dedicado na área orçamentária e no dashboard.
> 2. **Metodologia de Cálculo**: O limite de gastos variáveis será calculado subtraindo da renda total os custos fixos essenciais e os aportes planejados (reserva + investimentos), gerando uma **meta diária segura** calculada pelos dias restantes do mês.
> 3. **Persistência Google Sheets**: As fontes de renda configuradas serão salvas e sincronizadas automaticamente na aba `Configuracoes` da planilha do Google Drive.

---

### 1. Visão Geral & Conceito Central

- **O que faz**: Responde de imediato à principal dúvida financeira cotidiana: *"Quanto ainda posso gastar este mês sem comprometer minhas contas fixas e metas de economia?"*.
- **Público-alvo**: O usuário que deseja ter clareza do seu orçamento livre sem precisar fazer contas de cabeça no dia a dia.
- **Valor agregado**: Transforma o orçamento passivo em um guia ativo de tomada de decisão diária com limite seguro por dia.

---

### 2. Experiência do Usuário & Design Visual

- **Fluxo do Usuário**:
  1. **Visualização Imediata (Dashboard & Orçamento)**:
     - Card de destaque *"Capacidade de Gastos do Mês"* com:
       - **Disponível para Gastos Livres**: Valor total que ainda pode ser gasto no mês.
       - **Meta Diária Recomendada**: *"Você pode gastar até R$ X / dia (restam Y dias)"*.
       - **Barra de Ritmo**: Mostra se o usuário está dentro do ritmo diário ou gastando mais rápido do que deveria.
  2. **Cadastro e Gestão de Rendas**:
     - Botão *"Configurar Fontes de Renda"* abre modal para gerenciar:
       - Salário Principal Líquido.
       - Fontes Secundárias (Freelance, Comissões, Aluguel, etc.).
       - Renda Prevista Total consolidada.
  3. **Composição Transparente**:
     - Aba explicativa demonstrando a matemática do limite:
       $$\text{Renda Prevista} - \text{Despesas Fixas Comprometidas} - \text{Aportes (Reserva + Investimentos)} = \text{Teto Livre do Mês}$$

- **Identidade Visual & Tipografia**:
  - Padrão Dark Slate (`bg-slate-900`, `border-slate-800`), com destaque em Esmeralda/Ciano para valores seguros e Âmbar/Vermelho se o ritmo for ultrapassado.
  - Tipografia numérica estritamente tabular (`font-mono tabular-nums`).

---

### 3. Decisões do Produto & Trade-Offs

- **Decisão 1: Deduzir Despesas Fixas e Aportes Primeiro ("Pague-se Primeiro")**
  - *Abordagem*: O dinheiro da reserva e dos investimentos planejados já é protegido antes de calcular o que sobra para gastar.
  - *Justificativa*: Estimula a saúde financeira real e evita que a pessoa gaste o que deveria poupar.
- **Decisão 2: Ritmo Diário Baseado no Calendário Real**
  - *Abordagem*: O sistema calcula os dias restantes do mês corrente (ex: se hoje é dia 15 em um mês de 30 dias, divide por 15).
  - *Justificativa*: Fornece uma régua de bolso prática para o dia a dia.
- **Decisão 3: Integração Direta com Google Sheets**
  - *Abordagem*: As fontes de renda são armazenadas na planilha para não se perderem ao trocar de dispositivo ou limpar o navegador.

---

### 4. Arquitetura Técnica & Estrutura dos Dados

```
┌────────────────────────────────────────────────────────┐
│             Painel de Renda & Capacidade               │
│  (Salário + Fontes Extras)                             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Motor de Cálculo Safe-to-Spend           │
│  • Renda Prevista Total                                │
│  • (-) Custos Fixos (Aluguel, Contas, Assinaturas)    │
│  • (-) Aporte Planejado Reserva (60%) & Inv (30%)      │
│  • (-) Despesas Variáveis já Realizadas                │
│  ───────────────────────────────────────────────────   │
│  = Saldo Livre Restante / Dias Restantes = Meta/Dia    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│     Dashboard Widget & Sincronização Google Sheets     │
└────────────────────────────────────────────────────────┘
```

#### Modelo de Dados:
```typescript
export interface IncomeSource {
  id: string;
  name: string; // Ex: "Salário Principal", "Freelance"
  amount: number;
  frequency: 'monthly' | 'occasional';
}
```

#### Plano de Execução:
1. **Tipos e Estado (`src/types.ts` & `src/App.tsx`)**: Adicionar o modelo `IncomeSource[]` ao estado global com persistência local e Google Sheets.
2. **Cálculo Matemático Dinâmico**: Criar `safeToSpendCalc` calculando teto mensal, despesas variáveis consumidas, saldo restante e ritmo diário (`safeDailyAmount`).
3. **Card Hero no Dashboard**: Adicionar o componente visual de "Quanto posso gastar" com barra de ritmo e dias restantes.
4. **Modal de Fontes de Renda**: Permitir adicionar, editar e remover fontes de renda (salário e extras).
5. **Sincronização**: Salvar os dados na aba `Configuracoes` do Google Sheets.
6. **Verificação & Compilação**: Executar `lint_applet` e `compile_applet`.
