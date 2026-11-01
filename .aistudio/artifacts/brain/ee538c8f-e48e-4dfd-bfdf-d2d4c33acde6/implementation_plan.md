# Plano de Implementação: Configuração e Deploy no GitHub Pages

Este plano define as etapas necessárias para preparar o projeto para publicação automática no GitHub Pages, garantindo compatibilidade total com qualquer nome de repositório e suporte a navegação client-side SPA.

---

## 1. Configuração do Vite (`vite.config.ts`)
- **Base Relativa Universal**:
  - Definir `base: './'` no `vite.config.ts`.
  - Isso garante que scripts, estilos e fontes sejam carregados corretamente tanto em domínios personalizados quanto em subcaminhos de repositório padrão do GitHub Pages (`https://<usuario>.github.io/<repositorio>/`).

---

## 2. Redirecionamento SPA para GitHub Pages (`public/404.html`)
- Como o GitHub Pages serve arquivos estáticos e pode retornar erro 404 caso o usuário acesse ou recarregue rotas diretas, criaremos `public/404.html`.
- O arquivo conterá um redirecionador leve em JavaScript que encaminha a requisição de volta para `index.html`, preservando parâmetros de consulta e estado da aplicação.

---

## 3. Workflow Automatizado do GitHub Actions (`.github/workflows/deploy.yml`)
- Criar o fluxo de automação oficial para GitHub Pages:
  - Disparo automático em `push` na branch `main`.
  - Configuração de permissões necessárias (`pages: write`, `id-token: write`, `contents: read`).
  - Execução dos passos de checkout, setup do Node.js (versão 20), instalação de dependências e build (`npm run build`).
  - Upload do artefato da pasta `./dist` com `actions/upload-pages-artifact@v3`.
  - Deploy em produção com `actions/deploy-pages@v4`.

---

## 4. Documentação de Ativação no Repositório
- Criar ou atualizar `README.md` com o passo a passo direto para o usuário:
  1. Criar o repositório no GitHub e fazer o push do código para a branch `main`.
  2. Ir em **Settings** > **Pages** no repositório.
  3. Em **Build and deployment** > **Source**, selecionar **GitHub Actions**.
  4. O deploy será realizado automaticamente a cada alteração.

---

## 5. Validação e Testes de Build
- Executar `npm run build` localmente para confirmar que a saída estática na pasta `dist/` é gerada com caminhos relativos corretos (`./assets/...`).
- Validar a compilação com `compile_applet` e verificação de tipos (`tsc --noEmit`).
