"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowLeftRight,
  BookOpen,
  Code2,
  Plus,
  Check,
  Trash2,
  Copy,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Package,
  X,
  Download,
} from "lucide-react";
type Loan = {
  id: string;
  item: string;
  pessoa: string;
  dataEmprestimo: string;
  dataPrevista: string;
  observacao: string;
  devolvidoEm: string | null;
};
type Trace = {
  method: string;
  path: string;
  body?: unknown;
  status: number;
  text: string;
  ms: number;
};
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const newKey = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
const sample = {
  item: "Furadeira",
  pessoa: "João (exemplo)",
  dataEmprestimo: "2026-11-03",
  dataPrevista: "2026-11-10",
  observacao: "Devolver com a maleta",
};
const lessons = [
  {
    title: "Por que usar uma API?",
    tag: "01 / O problema",
    text: "Você emprestou uma furadeira ao João. Quer registrar isso no computador e consultar no celular. As duas telas precisam conversar com o mesmo sistema.",
    point:
      "A API oferece uma porta de entrada comum: recebe pedidos, aplica regras e devolve respostas.",
    task: "Pergunte à turma: se cada celular guardasse sua própria lista, o que aconteceria ao trocar de aparelho?",
  },
  {
    title: "Quem faz o quê?",
    tag: "02 / As três partes",
    text: "A interface mostra botões e campos. A API recebe o pedido e verifica se ele pode ser atendido. O banco de dados guarda os empréstimos para consultas futuras.",
    point:
      "O banco continua existindo. A API organiza como outros programas podem consultar e alterar os dados.",
    task: "Abra Meus empréstimos. Cadastre um objeto fictício e observe o pedido POST no painel inferior.",
  },
  {
    title: "Um endereço e uma ação",
    tag: "03 / HTTP",
    text: "A rota /api/emprestimos indica o recurso. O método informa a ação: GET consulta, POST cria, PATCH altera parte do registro e DELETE exclui.",
    point:
      "Endpoint é um ponto de acesso à API. O método e o endereço juntos identificam a operação.",
    task: "Abra Laboratório. Envie GET /api/saude. Depois, consulte os empréstimos. Qual resposta mudou?",
  },
  {
    title: "JSON: os dados da conversa",
    tag: "04 / O conteúdo",
    text: 'JSON é um formato de texto para trocar dados. Por exemplo: {"item":"Furadeira","pessoa":"João"}. Chaves e textos usam aspas duplas; true e false não usam aspas.',
    point:
      "O cabeçalho traz informações sobre o pedido, como a chave de acesso. O corpo leva os dados que queremos cadastrar ou alterar.",
    task: "Selecione POST. Leia o corpo, troque o item e a pessoa e envie. O servidor devolveu um id?",
  },
  {
    title: "A resposta também ensina",
    tag: "05 / Regras e erros",
    text: "200: deu certo. 201: criado. 204: excluído, sem corpo. 400: dados inválidos. 401: chave ausente ou malformada. 404: registro ou rota não encontrados. 409: limite de registros atingido.",
    point:
      "Mesmo que uma tela aceite um formulário vazio, a API precisa validar o pedido no servidor.",
    task: 'Envie POST com "item": "". Observe o 400. Corrija e tente de novo. Depois use PATCH com {"devolvido":true}.',
  },
  {
    title: "Seu primeiro programa cliente",
    tag: "06 / Agora é com vocês",
    text: "fetch() é a função do navegador que envia o pedido. await espera a resposta. resposta.json() transforma o JSON recebido em dados que o JavaScript pode usar.",
    point:
      "Consumir uma API é fazer pedidos a ela. Criar uma API é programar o lado que recebe e atende esses pedidos.",
    task: "Baixe o exemplo HTML no Laboratório. Abra no navegador, cole sua chave e consulte os empréstimos. Desafio: mostrar apenas os ainda não devolvidos.",
  },
];
export default function Home() {
  const [tab, setTab] = useState("app"),
    [key, setKey] = useState(""),
    [keyDraft, setKeyDraft] = useState(""),
    [keyOpen, setKeyOpen] = useState(false),
    [loans, setLoans] = useState<Loan[]>([]),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [trace, setTrace] = useState<Trace | null>(null),
    [formOpen, setFormOpen] = useState(false),
    [filter, setFilter] = useState("todos"),
    [lesson, setLesson] = useState(0);
  const [method, setMethod] = useState("GET"),
    [path, setPath] = useState("/api/emprestimos"),
    [body, setBody] = useState(JSON.stringify(sample, null, 2)),
    [origin, setOrigin] = useState(""),
    [selectedId, setSelectedId] = useState("");
  useEffect(() => {
    setOrigin(location.origin);
    let k = "";
    try {
      k = localStorage.getItem("empresta-chave") ?? "";
    } catch {}
    if (!/^[a-f0-9]{64}$/.test(k)) {
      k = newKey();
      try {
        localStorage.setItem("empresta-chave", k);
      } catch {
        setMessage(
          "Armazenamento bloqueado: copie sua chave para guardar o acesso.",
        );
      }
    }
    setKey(k);
    setKeyDraft(k);
  }, []);
  async function request(m: string, p: string, data?: unknown, k = key) {
    const start = performance.now();
    const options: RequestInit = {
      method: m,
      headers: {
        Authorization: `Bearer ${k}`,
        ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
      },
    };
    if (data !== undefined) options.body = JSON.stringify(data);
    const res = await fetch(p, options);
    const text = await res.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { erro: text };
    }
    setTrace({
      method: m,
      path: p,
      body: data,
      status: res.status,
      text: parsed
        ? JSON.stringify(parsed, null, 2)
        : "Sem corpo de resposta (204).",
      ms: Math.round(performance.now() - start),
    });
    if (!res.ok) throw new Error(parsed?.erro ?? `Erro HTTP ${res.status}`);
    return parsed;
  }
  async function refresh(k = key, record = true) {
    if (record) {
      const d = await request("GET", "/api/emprestimos", undefined, k);
      setLoans(d.dados);
    } else {
      const r = await fetch("/api/emprestimos", {
        headers: { Authorization: `Bearer ${k}` },
      });
      const d = (await r.json()) as { dados: Loan[]; erro?: string };
      if (!r.ok) throw new Error(d.erro);
      setLoans(d.dados);
    }
    setLoaded(true);
  }
  useEffect(() => {
    if (key) {
      setLoaded(false);
      refresh(key).catch((e) => setMessage(e.message));
    }
  }, [key]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Falha de conexão. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copiado!");
    } catch {
      setMessage(
        "Não foi possível copiar automaticamente. Selecione o texto e copie.",
      );
    }
  }
  function preset(m: string, p: string, b?: unknown) {
    setMethod(m);
    setPath(p);
    if (b !== undefined) setBody(JSON.stringify(b, null, 2));
  }
  const pending = loans.filter((l) => !l.devolvidoEm),
    late = pending.filter((l) => l.dataPrevista < today());
  const visible = loans.filter(
    (l) =>
      filter === "todos" ||
      (filter === "pendentes" && !l.devolvidoEm) ||
      (filter === "devolvidos" && l.devolvidoEm) ||
      (filter === "atrasados" && !l.devolvidoEm && l.dataPrevista < today()),
  );
  const code = `const resposta = await fetch("${origin}${path}", {\n  method: "${method}",\n  headers: {\n    "Authorization": "Bearer SUA_CHAVE"${["POST", "PATCH"].includes(method) ? ',\n    "Content-Type": "application/json"' : ""}\n  }${["POST", "PATCH"].includes(method) ? `,\n  body: JSON.stringify(${body})` : ""}\n});\nif (!resposta.ok) {\n  throw new Error("Erro HTTP " + resposta.status);\n}\nif (resposta.status !== 204) {\n  const dados = await resposta.json();\n  console.log(dados);\n}`;
  return (
    <>
      <header>
        <a className="brand" href="/" aria-label="Empresta início">
          <span className="brand-icon">
            <ArrowLeftRight size={23} />
          </span>
          empresta<span className="brand-dot">.</span>
        </a>
        <span className="header-label">LABORATÓRIO DE APIs</span>
        <button className="key-button" onClick={() => setKeyOpen(!keyOpen)}>
          <KeyRound size={16} /> Minha chave
        </button>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">OBJETOS VÃO. O CONTROLE FICA.</div>
            <h1>
              Emprestou? <span>Lembrou.</span>
            </h1>
            <p>
              Cuide do que você empresta. Entenda a API por trás de cada ação.
            </p>
          </div>
          <div className="live">
            <span /> API real · dados no servidor
          </div>
        </section>
        <nav aria-label="Seções">
          <button
            className={tab === "app" ? "active" : ""}
            onClick={() => setTab("app")}
          >
            <Package size={18} /> Meus empréstimos
          </button>
          <button
            className={tab === "lab" ? "active" : ""}
            onClick={() => setTab("lab")}
          >
            <Code2 size={18} /> Laboratório API
          </button>
          <button
            className={tab === "aula" ? "active" : ""}
            onClick={() => setTab("aula")}
          >
            <BookOpen size={18} /> Aula guiada
          </button>
        </nav>
        {keyOpen && (
          <section className="key-panel">
            <div>
              <h2>Sua chave, sua lista</h2>
              <p>
                Chave didática gerada neste navegador. Quem tem a chave acessa e
                altera sua lista. Guarde-a para usar em outro dispositivo; sem
                ela não há recuperação. Use dados fictícios.
              </p>
            </div>
            <label>
              Chave de acesso
              <input
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                autoComplete="off"
              />
            </label>
            <div className="row">
              <button onClick={() => copy(key)}>Copiar minha chave</button>
              <button
                onClick={() => {
                  const k = keyDraft.trim();
                  if (!/^[a-f0-9]{64}$/.test(k)) {
                    setMessage(
                      "A chave deve ter 64 caracteres: 0 a 9 e a a f.",
                    );
                    return;
                  }
                  try {
                    localStorage.setItem("empresta-chave", k);
                  } catch {}
                  setKey(k);
                  setKeyDraft(k);
                  setKeyOpen(false);
                  setMessage("Chave aplicada.");
                }}
              >
                Usar chave informada
              </button>
            </div>
          </section>
        )}
        {message && (
          <div className="notice" role="status">
            {message}
            <button aria-label="Fechar aviso" onClick={() => setMessage("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {tab === "app" && (
          <>
            <div className="stats">
              <div>
                <span>Com outras pessoas</span>
                <strong>
                  {loaded ? pending.length : "—"}
                  <small>pendentes</small>
                </strong>
              </div>
              <div>
                <span>Passou do prazo</span>
                <strong className="orange">
                  {loaded ? late.length : "—"}
                  <small>para lembrar</small>
                </strong>
              </div>
              <div>
                <span>De volta para você</span>
                <strong>
                  {loaded ? loans.length - pending.length : "—"}
                  <small>devolvidos</small>
                </strong>
              </div>
            </div>
            <section className="board">
              <div className="section-top">
                <div>
                  <h2>Seus empréstimos</h2>
                  <p>Uma lista simples para não depender da memória.</p>
                </div>
                <button
                  className="primary"
                  disabled={!key || busy}
                  onClick={() => setFormOpen(!formOpen)}
                >
                  <Plus size={17} /> Novo empréstimo
                </button>
              </div>
              {formOpen && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    action(async () => {
                      await request(
                        "POST",
                        "/api/emprestimos",
                        Object.fromEntries(f),
                      );
                      await refresh(key, false);
                      setFormOpen(false);
                      setMessage(
                        "Empréstimo registrado. Veja o POST e a resposta 201 abaixo.",
                      );
                    });
                  }}
                >
                  <div className="form-grid">
                    <label>
                      O que emprestou?
                      <input
                        name="item"
                        required
                        maxLength={100}
                        placeholder="Ex.: furadeira"
                      />
                    </label>
                    <label>
                      Para quem?
                      <input
                        name="pessoa"
                        required
                        maxLength={100}
                        placeholder="Ex.: João (fictício)"
                      />
                    </label>
                    <label>
                      Data do empréstimo
                      <input
                        name="dataEmprestimo"
                        type="date"
                        required
                        defaultValue={today()}
                      />
                    </label>
                    <label>
                      Devolução prevista
                      <input
                        name="dataPrevista"
                        type="date"
                        required
                        defaultValue={today()}
                      />
                    </label>
                    <label className="full">
                      Observação (opcional)
                      <input
                        name="observacao"
                        maxLength={500}
                        placeholder="Ex.: devolver com a maleta"
                      />
                    </label>
                  </div>
                  <div className="row">
                    <button type="submit" className="primary" disabled={busy}>
                      Registrar empréstimo
                    </button>
                    <button type="button" onClick={() => setFormOpen(false)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
              <div className="filters">
                {["todos", "pendentes", "atrasados", "devolvidos"].map((f) => (
                  <button
                    key={f}
                    className={filter === f ? "selected" : ""}
                    onClick={() => setFilter(f)}
                  >
                    {f[0].toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <button
                  className="refresh"
                  aria-label="Atualizar lista"
                  disabled={busy || !key}
                  onClick={() => action(() => refresh())}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              <div className="loan-list">
                {visible.map((l) => (
                  <article className="loan" key={l.id}>
                    <div className="item-icon">
                      <Package size={23} />
                    </div>
                    <div className="loan-info">
                      <h3>{l.item}</h3>
                      <p>
                        Com {l.pessoa} <span>·</span> Até{" "}
                        {l.dataPrevista.split("-").reverse().join("/")}
                      </p>
                      {l.observacao && <small>{l.observacao}</small>}
                    </div>
                    <span
                      className={
                        "badge " +
                        (l.devolvidoEm
                          ? "done"
                          : l.dataPrevista < today()
                            ? "late"
                            : "")
                      }
                    >
                      {l.devolvidoEm
                        ? "Devolvido"
                        : l.dataPrevista < today()
                          ? "Atrasado"
                          : "Emprestado"}
                    </span>
                    <div className="loan-actions">
                      <button
                        title={
                          l.devolvidoEm
                            ? "Reabrir empréstimo"
                            : "Marcar como devolvido"
                        }
                        aria-label={
                          l.devolvidoEm
                            ? `Reabrir ${l.item}`
                            : `Devolver ${l.item}`
                        }
                        disabled={busy}
                        onClick={() =>
                          action(async () => {
                            await request("PATCH", `/api/emprestimos/${l.id}`, {
                              devolvido: !l.devolvidoEm,
                            });
                            await refresh(key, false);
                          })
                        }
                      >
                        {l.devolvidoEm ? (
                          <RefreshCw size={17} />
                        ) : (
                          <Check size={18} />
                        )}
                      </button>
                      <button
                        aria-label={`Excluir ${l.item}`}
                        disabled={busy}
                        onClick={() => {
                          if (confirm(`Excluir o registro de ${l.item}?`))
                            action(async () => {
                              await request(
                                "DELETE",
                                `/api/emprestimos/${l.id}`,
                              );
                              await refresh(key, false);
                            });
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
                {!visible.length && (
                  <div className="empty">
                    <Package size={36} />
                    <h3>
                      {!loaded
                        ? "Aguardando sua lista…"
                        : filter === "todos"
                          ? "Sua memória ganhou uma ajuda."
                          : "Nenhum empréstimo neste filtro."}
                    </h3>
                    <p>
                      {filter === "todos"
                        ? "Cadastre seu primeiro empréstimo para ver a API em ação."
                        : "Escolha outro filtro para continuar."}
                    </p>
                  </div>
                )}
              </div>
              <div className="board-footer">
                <span>Até 100 registros por chave · ambiente didático</span>
                <button onClick={() => setTab("lab")}>
                  O que acontece por trás? <ArrowUpRight size={15} />
                </button>
              </div>
            </section>
          </>
        )}
        {tab === "lab" && (
          <section className="lab">
            <div className="section-top">
              <div>
                <h2>Converse diretamente com a API</h2>
                <p>
                  Escolha uma operação, envie o pedido e observe a resposta
                  real.
                </p>
              </div>
              <a className="download" href="/exemplo.html" download>
                <Download size={16} /> Exemplo HTML
              </a>
            </div>
            <div className="presets">
              <button onClick={() => preset("GET", "/api/saude")}>
                1. Testar conexão
              </button>
              <button onClick={() => preset("GET", "/api/emprestimos")}>
                2. Listar
              </button>
              <button
                onClick={() => preset("POST", "/api/emprestimos", sample)}
              >
                3. Cadastrar
              </button>
              <button
                onClick={() =>
                  preset(
                    "PATCH",
                    `/api/emprestimos/${selectedId || "COLE_O_ID"}`,
                    { devolvido: true },
                  )
                }
              >
                4. Devolver
              </button>
              <button
                onClick={() =>
                  preset(
                    "DELETE",
                    `/api/emprestimos/${selectedId || "COLE_O_ID"}`,
                  )
                }
              >
                5. Excluir
              </button>
            </div>
            <div className="request-grid">
              <div>
                <div className="request-bar">
                  <label>
                    Método
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
                      {["GET", "POST", "PATCH", "DELETE"].map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label className="route">
                    Rota
                    <input
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                    />
                  </label>
                  <button
                    className="primary send"
                    disabled={!key || busy}
                    onClick={() =>
                      action(async () => {
                        if (!/^\/api\/[a-zA-Z0-9/_-]+$/.test(path))
                          throw new Error(
                            "Use uma rota deste laboratório, começando com /api/.",
                          );
                        if (
                          method === "DELETE" &&
                          !confirm("Excluir o empréstimo indicado na rota?")
                        )
                          return;
                        let data;
                        if (["POST", "PATCH"].includes(method)) {
                          try {
                            data = JSON.parse(body);
                          } catch {
                            throw new Error(
                              "JSON inválido. Confira aspas e vírgulas antes de enviar.",
                            );
                          }
                        }
                        const r = await request(method, path, data);
                        if (r?.id) setSelectedId(r.id);
                        await refresh(key, false);
                      })
                    }
                  >
                    {busy ? "Enviando…" : "Enviar"}
                    <ArrowRight size={16} />
                  </button>
                </div>
                <p className="hint">
                  Authorization: Bearer [sua chave] · enviado automaticamente
                </p>
                {["POST", "PATCH"].includes(method) && (
                  <label>
                    Corpo do pedido (JSON)
                    <textarea
                      spellCheck={false}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={9}
                    />
                  </label>
                )}
                <label>
                  Registro para consultar, devolver ou excluir
                  <select
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      if (path.startsWith("/api/emprestimos/"))
                        setPath(`/api/emprestimos/${e.target.value}`);
                    }}
                  >
                    <option value="">Selecione um empréstimo</option>
                    {loans.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.item} · {l.pessoa}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="hint">
                  Use GET /api/emprestimos/ID para buscar apenas um registro.
                  PATCH também altera item, pessoa, datas e observacao.
                </p>
              </div>
              <aside className="explain">
                <span className="eyebrow">O PEDIDO EM PARTES</span>
                <h3>
                  {method === "GET"
                    ? "“Quero consultar.”"
                    : method === "POST"
                      ? "“Guarde um novo registro.”"
                      : method === "PATCH"
                        ? "“Altere este registro.”"
                        : "“Exclua este registro.”"}
                </h3>
                <p>
                  <b>URL</b> — onde está o recurso.
                </p>
                <p>
                  <b>Método</b> — o que você quer fazer.
                </p>
                <p>
                  <b>Cabeçalhos</b> — informações como a chave e o formato.
                </p>
                <p>
                  <b>Corpo</b> — os dados de POST ou PATCH.
                </p>
                <p>
                  O id identifica o empréstimo. A chave define qual lista você
                  pode acessar.
                </p>
              </aside>
            </div>
            <details className="code-details">
              <summary>Ver o código JavaScript deste pedido</summary>
              <p>
                Troque SUA_CHAVE pela sua chave. Execute em uma função async ou
                no Console do navegador.
              </p>
              <button onClick={() => copy(code)}>
                <Copy size={15} /> Copiar código
              </button>
              <pre>{code}</pre>
            </details>
            <details className="api-doc">
              <summary>Consultar o contrato da API</summary>
              <p>
                Base: <code>{origin}/api</code>. Datas: AAAA-MM-DD. Textos
                item/pessoa: 1–100 caracteres. Observação: até 500. POST exige
                item, pessoa, dataEmprestimo e dataPrevista. observacao é
                opcional. PATCH aceita parte desses campos e devolvido
                (true/false).
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Método</th>
                    <th>Rota</th>
                    <th>Sucesso</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["GET", "/saude", "200 · status"],
                    ["GET", "/emprestimos", "200 · {dados, total}"],
                    ["GET", "/emprestimos/ID", "200 · objeto"],
                    ["POST", "/emprestimos", "201 · objeto criado"],
                    ["PATCH", "/emprestimos/ID", "200 · objeto alterado"],
                    ["DELETE", "/emprestimos/ID", "204 · sem corpo"],
                  ].map((r) => (
                    <tr key={r.join()}>
                      {r.map((c) => (
                        <td key={c}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                Erros: 400 dados inválidos; 401 chave ausente ou malformada; 404
                rota/registro não encontrado; 405 método não permitido; 409
                limite de 100 registros; 413 corpo maior que 4 KB; 500 falha
                interna; 503 banco indisponível. Uma chave válida diferente abre
                uma lista separada. CORS permite chamadas de páginas HTML de
                outras origens; isso não substitui a chave de acesso.
              </p>
            </details>
          </section>
        )}
        {tab === "aula" && (
          <section className="lesson">
            <div className="lesson-top">
              <span className="eyebrow">{lessons[lesson].tag}</span>
              <span>Roteiro sugerido · 50 minutos</span>
            </div>
            <h2>{lessons[lesson].title}</h2>
            <p className="lesson-text">{lessons[lesson].text}</p>
            <div className="lesson-point">{lessons[lesson].point}</div>
            <div className="teacher">
              <BookOpen size={20} />
              <div>
                <b>Experimente com a turma</b>
                <p>{lessons[lesson].task}</p>
              </div>
            </div>
            <div className="lesson-nav">
              <button
                disabled={lesson === 0}
                onClick={() => setLesson(lesson - 1)}
              >
                <ArrowLeft size={17} /> Anterior
              </button>
              <div>
                {lessons.map((_, i) => (
                  <button
                    aria-label={`Etapa ${i + 1}`}
                    className={lesson === i ? "current" : ""}
                    key={i}
                    onClick={() => setLesson(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={lesson === 5}
                onClick={() => setLesson(lesson + 1)}
              >
                Próxima <ArrowRight size={17} />
              </button>
            </div>
            <details>
              <summary>
                Por que não conectar todos os programas diretamente ao banco?
              </summary>
              <p>
                Isso é possível: vários programas podem usar o mesmo banco.
                Porém, cada programa precisa conhecer a estrutura das tabelas e
                ter acesso autorizado ao banco. As regras podem ficar repetidas
                nos programas, ou centralizadas no próprio banco com restrições
                e procedimentos.
              </p>
              <p>
                Com a API, os programas pedem operações, como cadastrar ou
                devolver um empréstimo. A API concentra a verificação de acesso
                e as regras da operação, enquanto o banco mantém suas próprias
                restrições de integridade. Se a estrutura das tabelas mudar,
                podemos adaptar a API e preservar o contrato usado pelas telas.
              </p>
              <p>
                Em páginas HTML e JavaScript, não coloque credenciais do banco
                no código enviado ao navegador. Nesta arquitetura, a tela envia
                uma chave que só permite acessar sua própria lista; o servidor é
                que acessa o banco. Uma API também precisa ser programada com
                segurança: a palavra API, sozinha, não protege nada.
              </p>
              <p>
                Um sistema interno, com conexão controlada ao banco, pode
                funcionar sem uma API web separada. A escolha depende dos
                clientes, das permissões e da manutenção do sistema.
              </p>
            </details>
            <details>
              <summary>Notas para o professor e gabarito do desafio</summary>
              <p>
                Distribuição sugerida: 10 min para o problema e os papéis, 10
                min para demonstrar a tela, 15 min no laboratório, 10 min com o
                HTML e 5 min de discussão. Os alunos consomem uma API pronta:
                ainda não precisam criar o servidor.
              </p>
              <p>
                API significa Interface de Programação de Aplicações. Nem toda
                API é web. Esta é uma API HTTP, organizada em recursos e
                métodos, no estilo REST. JSON é um formato, não o banco de
                dados. Não é obrigatório separar todo sistema em uma API web:
                aqui a separação permite reaproveitar regras e dados em clientes
                diferentes.
              </p>
              <p>
                Gabarito: depois de obter o objeto retornado pelo GET, use{" "}
                <code>
                  const pendentes = dados.dados.filter(emprestimo =&gt;
                  !emprestimo.devolvidoEm);
                </code>
                . O primeiro dados é sua variável; o segundo é o nome da
                propriedade da resposta. Ao recarregar a página, os registros
                continuam porque estão no banco. O navegador guarda apenas a
                chave.
              </p>
              <p>
                Limites da demonstração: chave funciona como senha, sem
                recuperação; até 100 registros por chave; sem login pessoal,
                lembretes automáticos ou controle de abuso de um produto
                comercial. Use dados fictícios. Para evoluir: contas,
                recuperação de acesso, limites por usuário e políticas de dados.
              </p>
            </details>
          </section>
        )}
        {tab !== "aula" && (
          <section className="trace">
            <div className="trace-head">
              <div>
                <Code2 size={17} />
                <strong>Por trás do clique</strong>
                <span>Última chamada à API</span>
              </div>
              {trace && (
                <span
                  className={"status " + (trace.status >= 400 ? "error" : "")}
                >
                  {trace.status} · {trace.ms} ms
                </span>
              )}
            </div>
            {trace ? (
              <div className="trace-grid">
                <div>
                  <span className="code-label">PEDIDO → SERVIDOR</span>
                  <p>
                    <b className="method">{trace.method}</b> {trace.path}
                  </p>
                  <pre>
                    {trace.body
                      ? JSON.stringify(trace.body, null, 2)
                      : "Sem corpo de pedido."}
                  </pre>
                </div>
                <div>
                  <span className="code-label">RESPOSTA ← SERVIDOR</span>
                  <pre>{trace.text}</pre>
                </div>
              </div>
            ) : (
              <p className="hint">
                Envie um pedido para acompanhar a conversa com o servidor.
              </p>
            )}
          </section>
        )}
        <footer>
          <span>
            empresta. <span>Aprender fazendo.</span>
          </span>
          <span>Uma tela. Uma API. Muitas possibilidades.</span>
        </footer>
      </main>
    </>
  );
}
