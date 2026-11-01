# Integração com Google Sheets como Banco de Dados

Este plano define a arquitetura e a experiência de integração do Google Sheets como banco de dados relacional e persistente para o sistema **Meu Financeiro**, permitindo que os dados sejam salvos diretamente na conta Google Drive do usuário e acessíveis em tempo real.

---

### Decisões do Usuário & Pontos Críticos

> [!IMPORTANT]
> **Decisões confirmadas na etapa anterior:**
> 1. **Criação Automática**: O aplicativo criará e configurará automaticamente uma planilha estruturada no Google Drive do usuário (`Meu Financeiro - Base de Dados`) com abas dedicadas para cada módulo (`Transacoes`, `Orcamentos`, `Reserva`, `Investimentos`, `Configuracoes`).
> 2. **Sincronização Contínua**: O salvamento ocorrerá de forma reativa a cada movimentação, acompanhado de um indicador de sincronização e cache local para tolerância a falhas.
> 3. **Escopos com Privilégio Mínimo**: Utilizaremos `https://www.googleapis.com/auth/spreadsheets` e `https://www.googleapis.com/auth/drive.file`, garantindo acesso estrito apenas aos arquivos criados ou manipulados pelo próprio aplicativo.

---

### 1. Visão Geral & Conceito Central

- **O que faz**: Transforma uma planilha do Google Sheets no backend em nuvem do sistema financeiro. O usuário faz login com sua conta Google, o sistema provisiona a planilha estruturada no seu Google Drive e gerencia leitura, escrita e atualização de dados automaticamente.
- **Público-alvo**: Usuário pessoal que deseja manter a posse total de seus dados financeiros em formato de planilha transparente e auditável, sem precisar preencher fórmulas manualmente.
- **Valor agregado**: Independência de servidores de terceiros, backup permanente e nativo no ecossistema Google, sincronização entre dispositivos e a possibilidade de visualizar ou exportar a planilha a qualquer momento.

---

### 2. Experiência do Usuário & Design Visual

- **Fluxo do Usuário**:
  1. **Autenticação**: No topo da barra de navegação, o usuário visualiza o botão oficial estilizado *"Entrar com Google"*.
  2. **Detecção e Provisionamento**: Ao autenticar, o sistema busca no Drive por uma planilha existente criada pelo app (`Meu Financeiro - Base de Dados`). Se não existir, cria a planilha com formatação de cabeçalhos coloridos e colunas pré-definidas.
  3. **Carregamento Inicial**: As abas são lidas e hidratam o estado da aplicação. Caso a planilha esteja recém-criada ou vazia, o estado zerado é mantido e salvo.
  4. **Movimentações & Operações**: Ao adicionar uma despesa, receita, alterar orçamento ou registrar aporte na reserva/investimentos, o sistema atualiza o estado local e envia um lote para a API do Google Sheets (`spreadsheets.values.batchUpdate` / `append`).
  5. **Indicador de Status**: Um indicador no cabeçalho exibe o estado de conexão e sincronização (`Sincronizado`, `Salvando...`, `Erro ao sincronizar`), além do botão de atalho direto para *"Abrir no Google Sheets"*.

- **Identidade Visual & Tema**:
  - **Paleta**: Preservação do tema profissional Dark Slate (`bg-slate-950`, `bg-slate-900`, `border-slate-800`) com acentos em Verde Esmeralda (`text-emerald-400`, `bg-emerald-500`) e Azul Google (`#4285F4`) no botão de login.
  - **Tipografia**: `Plus Jakarta Sans` para display e interfaces; `JetBrains Mono` com números tabulares (`font-mono tabular-nums`) em tabelas e valores monetários.
  - **Diálogos de Confirmação**: Para operações de exclusão ou limpeza de dados na planilha, modais explícitos com resumo do impacto e cancelamento seguro.

---

### 3. Decisões do Produto & Trade-Offs

- **Decisão 1: Estruturação Multi-Abas no Google Sheets**
  - *Abordagem*: Uma única planilha com 5 abas (`Transacoes`, `Orcamentos`, `Reserva`, `Investimentos`, `Configuracoes`).
  - *Justificativa*: Mantém tudo centralizado em um único arquivo no Google Drive, facilitando a navegação do usuário caso queira inspecionar a planilha diretamente.
- **Decisão 2: Cache Híbrido (Local + Nuvem)**
  - *Abordagem*: O estado local (`localStorage`) funciona como camada de leitura imediata e offline buffer. Ao carregar a página com login ativo, a planilha atualiza os dados mais recentes.
  - *Justificativa*: Evita latência de rede em operações comuns e bloqueios de interface enquanto a API do Google Sheets responde.
- **Decisão 3: Escopos OAuth Estritos (`drive.file` + `spreadsheets`)**
  - *Abordagem*: Não solicitar acesso a todos os arquivos do Google Drive (`drive` total), mas apenas a arquivos criados ou abertos pelo app (`drive.file`).
  - *Justificativa*: Princípio de privilégio mínimo e máxima segurança para o usuário.

---

### 4. Arquitetura Técnica & Estrutura dos Dados

```
┌────────────────────────────────────────────────────────┐
│                   Meu Financeiro UI                    │
│  (Dashboard, Movimentações, Orçamento, Reserva, etc.)  │
└───────────────────────────┬────────────────────────────┘
                            │
               React State & Custom Hooks
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│     Local Storage     │       │    Sheets Sync Svc    │
│    (Offline Cache)    │       │  (Token & Batch API)  │
└───────────────────────┘       └───────────┬───────────┘
                                            │
                                            ▼
                                ┌───────────────────────┐
                                │   Google Sheets API   │
                                │   (Planilha no Drive) │
                                └───────────────────────┘
```

#### Estrutura das Abas da Planilha:
1. **Transacoes**: `ID | Data | Descrição | Categoria | Tipo | Valor | Pago | Recorrente`
2. **Orcamentos**: `Categoria | Valor Planejado | Alerta`
3. **Reserva**: `Saldo Atual | Meta | Aporte Mensal Médio | Meses Alvo`
4. **Investimentos**: `ID | Instituição | Tipo | Descrição | Valor Aplicado | Data | Rentabilidade`
5. **Configuracoes**: `Percentual Reserva | Percentual Investimentos | Percentual Dinheiro Livre`

#### Plano de Execução:
1. **Configuração OAuth via Ferramenta**: Iniciar a solicitação de escopos OAuth (`set_up_oauth`) com confirmação do usuário.
2. **Serviço Google Sheets (`src/services/googleSheets.ts`)**: Utilitários para autenticação Google Auth, criação de planilha, leitura e escrita de intervalos (`spreadsheets.values`).
3. **Integração no App**: Conectar o fluxo de autenticação ao cabeçalho, injetar o mecanismo de sincronização reativa e sincronizar com o estado React existente.
4. **Validação**: Compilação TypeScript e teste completo de criação e escrita.
