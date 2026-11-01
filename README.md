# Meu Financeiro - Planejamento Pessoal

Sistema moderno e completo de controle e planejamento financeiro pessoal, desenvolvido com React, TypeScript, Tailwind CSS e Vite.

## 🚀 Como Publicar no GitHub Pages

Este projeto já está configurado com automação completa via **GitHub Actions** e caminhos de assets relativos universais.

### Passo 1: Enviar o código para o GitHub
1. Crie um novo repositório no seu GitHub (pode ser público ou privado).
2. No seu computador/terminal, inicialize o git e suba os arquivos para a branch `main`:
   ```bash
   git init
   git add .
   git commit -m "feat: configuracao inicial e deploy github pages"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

### Passo 2: Ativar o GitHub Pages no Repositório
1. No seu repositório no GitHub, clique na aba **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Pages**.
3. Na seção **Build and deployment** > **Source**, altere de *Deploy from a branch* para:
   👉 **GitHub Actions**
4. Pronto! O workflow `.github/workflows/deploy.yml` será disparado automaticamente e a cada novo push na branch `main`.
5. Em poucos instantes, o link da sua aplicação estará disponível no topo da página de Pages (ex: `https://seu-usuario.github.io/seu-repositorio/`).

---

## 🛠️ Tecnologias Utilizadas
- **React 19** & **TypeScript**
- **Tailwind CSS v4** com interface moderna Dark Mode
- **Lucide React** para iconografia
- **Vite** para build rápido e caminhos relativos universais
- **Google Sheets & Google Drive API** (OAuth2 integrado) para sincronização e backup em nuvem
- **Local Storage** para persistência e funcionamento offline instantâneo

---

## 💻 Execução Local

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Gerar build de produção para testes
npm run build
```

---

## 📁 Estrutura de Arquivos para o GitHub Pages
- `vite.config.ts`: Configurado com `base: './'` para garantir compatibilidade com qualquer subcaminho ou repositório.
- `public/404.html`: Fallback automático com redirecionador SPA para garantir que o recarregamento de páginas funcione perfeitamente.
- `.github/workflows/deploy.yml`: Pipeline CI/CD que constrói a aplicação e realiza o deploy no GitHub Pages a cada push.
