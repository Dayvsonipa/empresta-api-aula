# Contrato da API

Base: `https://SEU-PROJETO.vercel.app/api`. Substitua pela sua URL.

Todas as rotas de empréstimos exigem:

```http
Authorization: Bearer SUA_CHAVE_DE_64_CARACTERES
```

A chave usa caracteres 0–9 e a–f. É gerada em **Minha chave**. Toda chave nesse formato tem uma lista independente, inicialmente vazia. Não há endpoint que retorne listas de outras chaves.

| Método | Rota | Resposta de sucesso |
| --- | --- | --- |
| GET | `/saude` | 200: aplicação respondendo; não verifica banco |
| GET | `/pronto` | 200: conexão e estrutura acessíveis |
| GET | `/emprestimos` | 200: `{dados: [...], total: numero}` |
| GET | `/emprestimos/ID` | 200: objeto do empréstimo |
| POST | `/emprestimos` | 201: empréstimo criado |
| PATCH | `/emprestimos/ID` | 200: empréstimo alterado |
| DELETE | `/emprestimos/ID` | 204: sem corpo |

## Criar empréstimo

POST /api/emprestimos, com Content-Type: application/json:

```json
{
  "item": "Furadeira",
  "pessoa": "João (fictício)",
  "dataEmprestimo": "2026-11-03",
  "dataPrevista": "2026-11-10",
  "observacao": "Devolver com a maleta"
}
```

Os quatro primeiros campos são obrigatórios. `observacao` é opcional. Datas reais em AAAA-MM-DD; previsão não pode anteceder o empréstimo. Item e pessoa: 1 a 100 caracteres. Observação: até 500. Corpo total: até 4 KB. O servidor gera `id`, `criadoEm` e `devolvidoEm`. A chave/hash do dono não aparece na resposta.

## Marcar devolução

PATCH /api/emprestimos/ID:

```json
{"devolvido": true}
```

`false` reabre o empréstimo. PATCH também aceita item, pessoa, dataEmprestimo, dataPrevista e observacao, sem exigir todos os campos.

## Consultar em JavaScript

Dentro de uma função async, usando sua URL e sua chave:

```javascript
const resposta = await fetch("https://SEU-PROJETO.vercel.app/api/emprestimos", {
  headers: { Authorization: "Bearer SUA_CHAVE" }
});
const dados = await resposta.json();
if (!resposta.ok) throw new Error(dados.erro);
console.log(dados.dados);
```

Em uma resposta DELETE 204, não chame `.json()`: não há corpo.

## Erros

400: JSON/campos/datas inválidos. 401: chave ausente ou malformada. 404: rota ou registro indisponível nesta chave. 405: método não aceito. 409: limite de 100 registros. 413: corpo maior que 4 KB. 500: falha interna/conexão. 503: configuração ou estrutura do banco ausente. Erros retornam `{ "erro": "explicação" }`.

Os status 400 e 401 não são problemas de publicação: são respostas esperadas para pedidos inválidos. Uma chave válida diferente gera outra lista, não um erro 401.
