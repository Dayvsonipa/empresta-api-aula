import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { handleRequest } from "../lib/api.ts";
const db = new PGlite();
const query = async (text, values = []) => (await db.query(text, values)).rows;
const key = "a".repeat(64);
const other = "b".repeat(64);
const sample = {
  item: "Furadeira",
  pessoa: "Pessoa fictícia",
  dataEmprestimo: "2026-11-03",
  dataPrevista: "2026-11-10",
};
async function call(method, path, body, token = key) {
  const req = new Request("https://example.test" + path, {
    method,
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      "Content-Type": "application/json",
    },
    ...(body !== undefined
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
  });
  const response = await handleRequest(req, () => query);
  const text = await response.text();
  return {
    status: response.status,
    data: text ? JSON.parse(text) : null,
    headers: response.headers,
  };
}
before(async () => {
  await db.exec(
    await readFile(
      new URL("../db/001_criar_banco.sql", import.meta.url),
      "utf8",
    ),
  );
});
after(async () => {
  await db.close();
});
test("rotas de diagnóstico e CORS", async () => {
  assert.equal((await call("GET", "/api/saude")).status, 200);
  assert.equal((await call("GET", "/api/pronto")).data.banco, "conectado");
  const res = await call("OPTIONS", "/api/emprestimos", undefined, null);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
});
test("autorização e validação de entradas", async () => {
  assert.equal(
    (await call("GET", "/api/emprestimos", undefined, null)).status,
    401,
  );
  for (const body of [
    { ...sample, item: "" },
    { ...sample, dataPrevista: "2026-02-30" },
    { ...sample, dataPrevista: "2026-11-01" },
    { ...sample, dono: "forjado" },
    "{quebrado",
    [],
    null,
  ]) {
    assert.equal((await call("POST", "/api/emprestimos", body)).status, 400);
  }
  assert.equal(
    (
      await call("POST", "/api/emprestimos", {
        ...sample,
        observacao: "x".repeat(5000),
      })
    ).status,
    413,
  );
});
test("CRUD completo, isolamento entre chaves e persistência", async () => {
  const created = await call("POST", "/api/emprestimos", sample);
  assert.equal(created.status, 201);
  const path = "/api/emprestimos/" + created.data.id;
  assert.equal((await call("GET", path)).data.item, "Furadeira");
  assert.equal((await call("GET", "/api/emprestimos")).data.total, 1);
  assert.equal(
    (await call("GET", "/api/emprestimos", undefined, other)).data.total,
    0,
  );
  for (const method of ["GET", "PATCH", "DELETE"])
    assert.equal(
      (
        await call(
          method,
          path,
          method === "PATCH" ? { devolvido: true } : undefined,
          other,
        )
      ).status,
      404,
    );
  assert.equal((await call("PATCH", path, { devolvido: "true" })).status, 400);
  const returned = await call("PATCH", path, { devolvido: true });
  assert.equal(returned.status, 200);
  assert.ok(returned.data.devolvidoEm);
  assert.equal(
    (await call("GET", path)).data.devolvidoEm,
    returned.data.devolvidoEm,
  );
  assert.equal(
    (await call("PATCH", path, { devolvido: false, item: "Livro" })).data
      .devolvidoEm,
    null,
  );
  assert.equal((await call("GET", path)).data.item, "Livro");
  assert.equal((await call("DELETE", path)).status, 204);
  assert.equal((await call("GET", path)).status, 404);
});
test("texto semelhante a SQL permanece dado e não executa comandos", async () => {
  const text = "Livro'); DROP TABLE empresta.emprestimos; --";
  const res = await call("POST", "/api/emprestimos", { ...sample, item: text });
  assert.equal(res.status, 201);
  assert.equal(res.data.item, text);
  assert.equal((await call("GET", "/api/pronto")).status, 200);
  await call("DELETE", "/api/emprestimos/" + res.data.id);
});
test("limite de 100 imposto no banco", async () => {
  const token = "c".repeat(64);
  for (let i = 0; i < 100; i++)
    assert.equal(
      (await call("POST", "/api/emprestimos", sample, token)).status,
      201,
    );
  assert.equal(
    (await call("POST", "/api/emprestimos", sample, token)).status,
    409,
  );
  assert.equal(
    (await call("GET", "/api/emprestimos", undefined, token)).data.total,
    100,
  );
});
test("falha de configuração não expõe credenciais", async () => {
  const res = await handleRequest(
    new Request("https://example.test/api/pronto"),
    () => {
      throw new Error("DATABASE_URL_AUSENTE");
    },
  );
  assert.equal(res.status, 503);
  assert.match((await res.json()).erro, /DATABASE_URL/);
});
