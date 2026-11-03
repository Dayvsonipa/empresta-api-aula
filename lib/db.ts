import { neon } from "@neondatabase/serverless";
import type { Query } from "./api";

// Inicialização tardia: o build não precisa conectar ao banco.
export function getQuery(): Query {
  const connection = process.env.DATABASE_URL;
  if (!connection) throw new Error("DATABASE_URL_AUSENTE");
  const sql = neon(connection);
  // Os valores seguem separados do texto SQL: consultas parametrizadas.
  return async (text, values = []) => sql.query(text, values);
}
