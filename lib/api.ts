export type Query = (
  text: string,
  values?: unknown[],
) => Promise<Record<string, unknown>[]>;
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};
const fields = `id, item, pessoa, data_emprestimo::text AS "dataEmprestimo",
  data_prevista::text AS "dataPrevista", observacao,
  to_char(criado_em AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "criadoEm",
  to_char(devolvido_em AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "devolvidoEm"`;
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers });
const fail = (erro: string, status: number) => json({ erro }, status);

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
function validate(data: Record<string, unknown>) {
  for (const field of ["item", "pessoa"]) {
    const value = data[field];
    if (typeof value !== "string" || !value.trim() || value.trim().length > 100)
      return `${field}: informe um texto de 1 a 100 caracteres.`;
  }
  if (!validDate(data.dataEmprestimo) || !validDate(data.dataPrevista))
    return "Datas inválidas. Use AAAA-MM-DD e uma data que exista.";
  if (data.dataPrevista < data.dataEmprestimo)
    return "A devolução prevista não pode ser anterior ao empréstimo.";
  if (typeof data.observacao !== "string" || data.observacao.length > 500)
    return "observacao: use um texto de até 500 caracteres.";
  return null;
}

async function execute(
  request: Request,
  getQuery: () => Query,
): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  const method = request.method;
  if (method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (path === "/api/saude" && method === "GET") {
    return json({
      status: "online",
      servico: "Empresta API",
      versao: "1.0",
      banco: "use /api/pronto para verificar",
    });
  }
  if (path === "/api/pronto" && method === "GET") {
    const query = getQuery();
    await query("SELECT id FROM empresta.emprestimos LIMIT 1");
    const result = await query(
      "SELECT to_regprocedure('empresta.criar_emprestimo(uuid,text,text,text,date,date,text)') IS NOT NULL AS ok",
    );
    if (!result[0]?.ok)
      return fail(
        "Execute o arquivo db/001_criar_banco.sql completo no Neon.",
        503,
      );
    return json({
      status: "pronto",
      banco: "conectado",
      estrutura: "disponivel",
    });
  }
  const match = path.match(
    /^\/api\/emprestimos(?:\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}))?$/,
  );
  if (!match) return fail("Rota não encontrada.", 404);

  // A chave é uma credencial de acesso à lista, não a senha do banco.
  const key = request.headers
    .get("Authorization")
    ?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!key)
    return fail(
      "Envie Authorization: Bearer SUA_CHAVE. Gere sua chave de 64 caracteres no laboratório.",
      401,
    );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key),
  );
  const owner = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const query = getQuery();
  const id = match[1];

  // Todos os acessos incluem dono, inclusive quando o id é conhecido.
  if (method === "GET") {
    if (id) {
      const rows = await query(
        `SELECT ${fields} FROM empresta.emprestimos WHERE dono=$1 AND id=$2`,
        [owner, id],
      );
      return rows[0]
        ? json(rows[0])
        : fail("Empréstimo não encontrado nesta chave.", 404);
    }
    const rows = await query(
      `SELECT ${fields} FROM empresta.emprestimos WHERE dono=$1 ORDER BY criado_em DESC, id DESC LIMIT 100`,
      [owner],
    );
    return json({ dados: rows, total: rows.length });
  }
  if (method === "DELETE" && id) {
    const rows = await query(
      "DELETE FROM empresta.emprestimos WHERE dono=$1 AND id=$2 RETURNING id",
      [owner, id],
    );
    return rows.length
      ? new Response(null, { status: 204, headers })
      : fail("Empréstimo não encontrado nesta chave.", 404);
  }
  if ((method !== "POST" || id) && (method !== "PATCH" || !id))
    return fail("Método não permitido nesta rota.", 405);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 4096)
    return fail("Envie no máximo 4 KB por pedido.", 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("JSON inválido. Confira aspas, vírgulas e chaves.", 400);
  }
  if (!body || Array.isArray(body) || typeof body !== "object")
    return fail("O corpo deve ser um objeto JSON.", 400);
  const allowed = [
    "item",
    "pessoa",
    "dataEmprestimo",
    "dataPrevista",
    "observacao",
    ...(method === "PATCH" ? ["devolvido"] : []),
  ];
  if (Object.keys(body).some((field) => !allowed.includes(field)))
    return fail(
      "Campo desconhecido. Campos aceitos: " + allowed.join(", "),
      400,
    );
  if (method === "PATCH" && !Object.keys(body).length)
    return fail("Informe pelo menos um campo para alterar.", 400);
  if ("devolvido" in body && typeof body.devolvido !== "boolean")
    return fail("devolvido deve ser true ou false.", 400);
  const existing = id
    ? (
        await query(
          `SELECT ${fields} FROM empresta.emprestimos WHERE dono=$1 AND id=$2`,
          [owner, id],
        )
      )[0]
    : undefined;
  if (id && !existing)
    return fail("Empréstimo não encontrado nesta chave.", 404);
  const data = { ...(existing ?? { observacao: "" }), ...body };
  const error = validate(data);
  if (error) return fail(error, 400);
  const item = (data.item as string).trim();
  const person = (data.pessoa as string).trim();
  const note = (data.observacao as string).trim();
  if (!id) {
    const rows = await query(
      `SELECT ${fields} FROM empresta.criar_emprestimo($1::uuid,$2::text,$3::text,$4::text,$5::date,$6::date,$7::text)`,
      [
        crypto.randomUUID(),
        owner,
        item,
        person,
        data.dataEmprestimo,
        data.dataPrevista,
        note,
      ],
    );
    return json(rows[0], 201);
  }
  // PATCH modifica apenas os campos presentes; uma devolução não sobrescreve
  // uma edição de nome feita por outra requisição no mesmo momento.
  const changes: string[] = [];
  const values: unknown[] = [owner, id];
  const columns: Record<string, string> = {
    item: "item",
    pessoa: "pessoa",
    dataEmprestimo: "data_emprestimo",
    dataPrevista: "data_prevista",
    observacao: "observacao",
  };
  for (const field of Object.keys(columns)) {
    if (field in body) {
      values.push(
        field === "item"
          ? item
          : field === "pessoa"
            ? person
            : field === "observacao"
              ? note
              : body[field],
      );
      changes.push(`${columns[field]}=$${values.length}`);
    }
  }
  if (body.devolvido === true)
    changes.push("devolvido_em=COALESCE(devolvido_em, now())");
  if (body.devolvido === false) changes.push("devolvido_em=NULL");
  const rows = await query(
    `UPDATE empresta.emprestimos SET ${changes.join(", ")} WHERE dono=$1 AND id=$2 RETURNING ${fields}`,
    values,
  );
  return rows[0]
    ? json(rows[0])
    : fail("Empréstimo não encontrado nesta chave.", 404);
}

export async function handleRequest(
  request: Request,
  getQuery: () => Query,
): Promise<Response> {
  try {
    return await execute(request, getQuery);
  } catch (error) {
    const failure = error as { code?: string; message?: string };
    if (
      failure.code === "P0001" &&
      failure.message?.includes("LIMITE_EMPRESTIMOS")
    )
      return fail(
        "Limite didático de 100 empréstimos por chave. Exclua um registro para continuar.",
        409,
      );
    if (failure.message === "DATABASE_URL_AUSENTE")
      return fail(
        "Banco não configurado. Cadastre DATABASE_URL na Vercel e faça um novo deploy.",
        503,
      );
    if (
      failure.code === "42P01" ||
      failure.code === "3F000" ||
      failure.code === "42883"
    )
      return fail(
        "Estrutura do banco ausente. Execute db/001_criar_banco.sql no Neon.",
        503,
      );
    if (
      failure.code === "23514" ||
      failure.code === "22007" ||
      failure.code === "22008"
    )
      return fail(
        "Os dados não atendem às regras do banco. Confira as datas e os textos.",
        400,
      );
    // Não imprimir connection strings, chaves ou conteúdo dos registros nos logs.
    console.error("Falha na API", failure.code ?? "sem_codigo");
    return fail(
      "Não foi possível concluir. Confira a conexão com o banco e tente novamente.",
      500,
    );
  }
}
