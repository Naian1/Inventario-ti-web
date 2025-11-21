# 🖥️ Inventário TI - Sistema de Gestão de Equipamentos

Sistema web robusto e moderno para gerenciamento de inventário de TI, com mais de **500 computadores, monitores, tablets, nobreaks** e outros equipamentos.

## ✨ Features Principais

### 🎯 Gestão Completa
- **Dashboard Analítico** com estatísticas e gráficos em tempo real
- **Categorias Dinâmicas** - Crie "abas" personalizadas (como Excel) com campos customizáveis
- **Importação Inteligente** de CSV/XLSX com mapeamento de colunas
- **Busca Avançada** (Ctrl+K) com fuzzy search usando Fuse.js
- **Tema Dark/Light** com persistência SSR-safe

### 📊 Categorias Pré-Configuradas
O sistema suporta todas as suas necessidades:
- 💻 **Computadores** (CPU, Hostname, Setor, IP, Monitor, Nobreak, Patrimônio)
- 📱 **Dispositivos Móveis** (Patrimônio, Modelo, Usuário, Cargo/Unidade/Setor)
- 📟 **PDA** (Patrimônio, Setor, Nome)
- 🖨️ **Impressoras** (Patrimônio, Modelo, IP, N° Série, MAC, Localização)
- 📺 **Televisões** (Patrimônio, Local, Setor, Polegadas)
- 📦 **Estoque TI** e **Suprimentos**

### 🎨 Design Moderno
- Animações suaves e transições elegantes
- Gradientes modernos e efeitos glass
- Cards interativos com hover effects
- Interface responsiva para desktop e mobile
- Loading states e skeleton screens

## 🚀 Quick Start

### 1. Instalar Dependências
```bash
npm install
```

### 2. Iniciar Desenvolvimento
```bash
npm run dev
```

### 3. Acessar
Abra [http://localhost:3000](http://localhost:3000) no navegador

## 📁 Estrutura do Projeto

```
inventario-ti-web/
├── app/
│   ├── globals.css              # Estilos globais com animações
│   ├── layout.tsx               # Layout raiz com SSR theme
│   ├── page.tsx                 # Homepage
│   ├── dashboard/
│   │   └── page.tsx             # Dashboard principal
│   ├── categories/
│   │   └── [id]/
│   │       └── page.tsx         # Página de categoria dinâmica
│   └── api/
│       └── theme/
│           └── route.ts         # API para tema SSR
├── components/
│   ├── Layout.tsx               # Layout com sidebar e header
│   ├── SearchBar.tsx            # Busca modal (Ctrl+K)
│   ├── ThemeToggle.tsx          # Toggle de tema animado
│   ├── InlineImport.tsx         # Importação CSV/XLSX
│   ├── CategoryManager.tsx      # Gerenciador de categorias
│   ├── DashboardWidgets.tsx     # Widgets do dashboard
│   └── BulkEditModal.tsx        # Edição em massa
├── lib/
│   ├── debounce.ts              # Utilitário de debounce
│   ├── types.ts                 # Tipos TypeScript
│   ├── localStorage.ts          # Persistência local
│   └── search.ts                # Busca com Fuse.js
└── package.json
```

## 🎯 Como Usar

### Criar Nova Categoria
1. Acesse o Dashboard
2. Clique em "Nova Categoria"
3. Digite o nome (ex: "Televisões")
4. Adicione campos personalizados:
   - **Patrimônio** (texto)
   - **Local** (texto)
   - **Setor** (texto)
   - **Polegadas** (número)
5. Confirme e comece a adicionar itens!

### Importar Dados (CSV/XLSX)
1. Prepare seu arquivo CSV ou XLSX
2. No Dashboard, clique em "Importar Dados"
3. Selecione o arquivo
4. Escolha a categoria de destino
5. Revise a pré-visualização
6. Confirme a importação

### Buscar Equipamentos
- Pressione **Ctrl+K** (ou Cmd+K no Mac)
- Digite: patrimônio, hostname, setor, etc.
- Clique no resultado para ir direto ao item

## 🎨 Personalizações

### Temas
O sistema possui tema claro e escuro com:
- Variáveis CSS customizáveis
- Persistência via localStorage + cookies
- Transições suaves
- SSR-safe (sem flash)

### Animações
- **fadeIn**: Elementos aparecem suavemente
- **slideIn**: Desliza da esquerda
- **pulse**: Efeito pulsante
- **shimmer**: Loading skeleton

## 🔧 Tecnologias

- **Next.js 15** - App Router com SSR
- **React 18** - Biblioteca UI
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling moderno
- **Fuse.js** - Fuzzy search
- **PapaParse** - Parser CSV
- **XLSX** - Parser Excel
- **nanoid** - ID generation

## 📊 Roadmap Futuro

- [ ] 🔐 Sistema de Login (Supabase Auth)
- [ ] ☁️ Deploy Netlify + Supabase
- [ ] 📈 Gráficos interativos (Chart.js)
- [ ] 📄 Exportação de relatórios PDF
- [ ] 🔔 Notificações em tempo real
- [ ] 👥 Gestão de usuários multi-tenant
- [ ] 📱 PWA (Progressive Web App)
- [ ] 🔄 Sincronização automática

## 🧪 Testes Rápidos

1. ✅ CSS carrega: DevTools → Network → `/_next/static/css/*.css` (200)
2. ✅ Tema persiste: Toggle tema, recarregar página
3. ✅ Busca funciona: Ctrl+K e testar busca
4. ✅ Importação: Upload CSV/XLSX de teste
5. ✅ Categorias: Criar nova categoria dinâmica

## 📝 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build produção
npm run build

# Iniciar produção
npm start

# Limpar cache
rm -rf node_modules .next package-lock.json && npm install

# Git
git add .
git commit -m "feat: adicionar nova funcionalidade"
git push origin main
```

## 🤝 Contribuindo

Este é um projeto pessoal focado em resolver problemas reais do dia a dia. Sugestões são bem-vindas!

## 📄 Licença

MIT License - Uso livre para projetos pessoais e comerciais.

---

**Desenvolvido com ❤️ para facilitar a gestão de inventário de TI e Tecnologias**
