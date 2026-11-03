# Empresta — API para aula (Vercel + Neon)

Projeto completo e independente para Dayvson: controle de empréstimos, laboratório de chamadas HTTP, aula guiada e exemplo HTML para os alunos.

**Comece abrindo `GUIA_PUBLICACAO.html` no navegador.** Ele traz o passo a passo sem exigir terminal. O roteiro abaixo também pode ser lido diretamente no GitHub.

## Onde fica cada parte

| Serviço | Papel |
| --- | --- |
| GitHub | Guarda e versiona o código-fonte. |
| Vercel | Publica a página Next.js e executa as rotas da API. |
| Neon | Guarda os empréstimos em PostgreSQL. |

Esta edição foi adaptada para suas contas Vercel/Neon. Não precisa de Cloudflare, de domínio próprio nem de hospedagem adicional. Os planos e limites de cada serviço dependem da sua conta; confira o plano antes de contratar recursos.

## 1. Extrair o projeto

Extraia o ZIP e abra a pasta `empresta-api-vercel`. Dentro dela devem aparecer `package.json`, `package-lock.json`, `app`, `lib`, `db`, `docs`, `tests` e este README.

O pacote não contém senhas, chaves de alunos, banco preenchido, `node_modules` ou `.next`. A Vercel instala as dependências e faz o build.

## 2. Preparar o Neon

1. Entre em https://console.neon.tech e crie um projeto separado, por exemplo `empresta-aula`. Isso mantém a aula separada dos seus outros sistemas.
2. Abra **SQL Editor**, conferindo o projeto, a branch e o banco selecionados.
3. Abra `db/001_criar_banco.sql` no Bloco de Notas ou VS Code. Copie todo o conteúdo, cole no SQL Editor e execute.
4. A consulta final deve mostrar `empresta.emprestimos`. O script cria o schema, a tabela, o índice e uma função para limitar cada lista a 100 registros.
5. Clique em **Connect**, selecione a mesma branch, banco e usuário/role usados no SQL Editor, e copie a connection string PostgreSQL completa. Preserve `sslmode=require` e os demais parâmetros fornecidos pelo Neon. Copie apenas a URL, sem `psql`, aspas externas ou comandos.
6. Guarde esse valor para a etapa da Vercel. Ele é a senha de conexão do servidor: não coloque no GitHub nem no HTML dos alunos.

## 3. Enviar ao GitHub

1. Entre em https://github.com e crie um repositório chamado `empresta-api-aula`. Pode ser privado: depois, autorize a Vercel a acessar esse repositório.
2. No repositório novo, use o link para enviar arquivos ou **Add file → Upload files**.
3. Arraste os arquivos e as subpastas de DENTRO de `empresta-api-vercel` para a área de upload. Não envie apenas o ZIP e não coloque todos os arquivos dentro de uma subpasta extra.
4. Confira que `package.json` e `package-lock.json` aparecem na raiz, no mesmo nível de `app`, `lib` e `db`.
5. Inclua `.gitignore`. `.env.example` é apenas um modelo com valores fictícios. Nunca envie `.env.local` preenchido.
6. Confirme o commit com uma mensagem como `Primeira versão da API de empréstimos`.

Alternativa para quem já usa Git no computador (substitua SEU_USUARIO):

```bash
git init
git add .
git commit -m "Primeira versão da API de empréstimos"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/empresta-api-aula.git
git push -u origin main
```

Execute esses comandos dentro da pasta que contém `package.json`. Se o repositório remoto já tiver commits, prefira cloná-lo primeiro e copiar o conteúdo do projeto para a cópia local.

## 4. Importar na Vercel

1. Entre em https://vercel.com e escolha **Add New → Project**.
2. Selecione o repositório `empresta-api-aula`. Se não aparecer, ajuste a permissão da integração GitHub para esse repositório.
3. Confira **Framework Preset: Next.js** e **Root Directory: raiz do repositório** (normalmente `./`).
4. Use Node.js **24.x**, conforme `package.json`. Deixe as configurações padrão do framework. O comando de build é `npm run build`; não escolha exportação estática.
5. Antes de publicar, adicione a variável de ambiente:

| Nome | Valor | Ambiente |
| --- | --- | --- |
| `DATABASE_URL` | Connection string completa copiada do Neon | Production |

Não use `NEXT_PUBLIC_DATABASE_URL`. O prefixo `NEXT_PUBLIC_` expõe valores ao navegador. Para Preview/Development, prefira uma branch/banco de testes separado e sua connection string correspondente.

6. Clique em **Deploy** e aguarde o status de sucesso. A Vercel informará o endereço `https://...vercel.app`.
7. Se configurar ou alterar a variável depois do primeiro deploy, faça **Redeploy** para aplicá-la.

## 5. Conferir sua instalação

Substitua `SEU-PROJETO` pelo endereço REAL que a Vercel forneceu:

- `https://SEU-PROJETO.vercel.app/api/saude`: verifica se a API responde. Não comprova a conexão com o banco.
- `https://SEU-PROJETO.vercel.app/api/pronto`: verifica acesso à tabela e existência da função. Deve responder `status: pronto`, `banco: conectado`, `estrutura: disponivel`.
- Abra a página principal, cadastre um empréstimo fictício, recarregue e confira se continua na lista.
- Marque a devolução e confira o status. Exclua apenas o registro de teste quando terminar.
- No Laboratório API, envie POST com item vazio: o servidor deve responder 400.

Se você simplesmente abrir `/api/emprestimos` na barra do navegador, a resposta 401 é esperada: esse pedido não envia o cabeçalho Authorization. Use a interface ou o exemplo HTML.

Compartilhe com a turma o endereço de **Production**. Um endereço de Preview pode exigir autenticação da Vercel; teste o endereço de produção em janela anônima antes da aula.

## 6. Página dos alunos

Acesse **Laboratório API → Exemplo HTML** na SUA instalação. O download já recebe automaticamente o endereço da sua API. Distribua esse HTML para os alunos; eles podem abri-lo no computador, sem instalar Node.js.

Cada aluno abre o site principal, copia sua chave em **Minha chave**, abre o HTML e cola a mesma chave. A página consulta os empréstimos dessa lista. O cadastro é feito pelo site ou pelo Laboratório API. O HTML inicial não possui formulário de cadastro: implementá-lo pode ser uma próxima atividade.

Também há uma cópia comentada em `docs/exemplo-aluno.html`; nela, substitua `https://SEU-PROJETO.vercel.app` pela URL real antes de distribuir. Usar o download do site evita essa edição.

A chave fica guardada no navegador. Em máquinas compartilhadas, alunos que usam o mesmo perfil do navegador compartilham a chave, a menos que a troquem em **Minha chave**. Para a aula, cada aluno pode usar uma janela anônima, copiar sua chave e guardá-la antes de fechar. Quem tem a chave pode consultar e alterar a lista; não publique chaves no projetor. Não há recuperação de chave.

## 7. Atualizações

Altere os arquivos e envie um novo commit ao branch de produção, normalmente `main`. Com a integração configurada, a Vercel inicia outro deploy. Alterações de estrutura do banco devem vir acompanhadas de novos scripts SQL; o deploy não executa migrações automaticamente.

A instalação nova começa vazia. Os empréstimos do endereço de demonstração anterior continuam no banco anterior; este ZIP não exporta registros nem transfere chaves de acesso.

## Rodar localmente (opcional)

Instale Node.js 24 LTS. Dentro da pasta do projeto:

```bash
npm ci
```

Copie `.env.example` para `.env.local`, preencha `DATABASE_URL` com a conexão de um banco Neon de desenvolvimento onde o SQL já foi executado e rode:

```bash
npm run dev
```

Abra o endereço local mostrado pelo Next.js. Para validar:

```bash
npm test
npm run check
npm run build
```

Os testes usam PostgreSQL embutido via PGlite. Eles não se conectam ao seu Neon e não usam sua senha.

## Arquivos principais

| Arquivo | Conteúdo |
| --- | --- |
| `app/page.tsx` | Interface, laboratório e aula guiada. |
| `app/globals.css` | Aparência e adaptação a diferentes telas. |
| `app/api/[...path]/route.ts` | Entrada HTTP que encaminha os pedidos à API. |
| `lib/api.ts` | Validação, isolamento por chave, regras e SQL parametrizado. |
| `lib/db.ts` | Conexão com Neon usando DATABASE_URL no servidor. |
| `db/001_criar_banco.sql` | Estrutura PostgreSQL inicial. |
| `app/exemplo.html/route.ts` | Gera o HTML do aluno com a URL desta instalação. |
| `docs/exemplo-aluno.html` | HTML e JavaScript comentados para estudar. |
| `docs/API.md` | Rotas, campos e exemplos. |
| `tests/api.test.mjs` | Testes com banco PostgreSQL embutido. |

## Limites desta versão didática

Chaves aleatórias de 256 bits isolam listas; o banco armazena o hash SHA-256 da chave. A chave não é um cadastro pessoal nem identifica formalmente o aluno. Qualquer pessoa pode gerar uma chave e iniciar uma lista. Até 100 registros por chave; sem login, recuperação de senha, cadastro de turmas, e-mails ou lembretes automáticos. CORS aberto permite usar HTML local, mas não substitui autorização. Não há controle global de abuso/rate limiting nesta edição. Use dados fictícios na aula. Para uso comercial, evolua identidade, recuperação, proteção contra abuso e políticas de dados.

## Verificação desta entrega

Compilação de produção do Next.js e testes automatizados locais. Testes: CRUD, isolamento entre chaves, dados inválidos, CORS, texto semelhante a SQL, limite de registros e falhas de configuração. O PostgreSQL de testes é PGlite; o funcionamento na SUA conta Neon/Vercel precisa ser confirmado após você configurar e publicar.

## Fontes oficiais

- https://vercel.com/docs/frameworks/full-stack/nextjs
- https://vercel.com/docs/git/vercel-for-github
- https://vercel.com/docs/environment-variables
- https://neon.com/docs/get-started/connect-neon
- https://neon.com/docs/serverless/serverless-driver
- https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
