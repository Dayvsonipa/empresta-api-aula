-- Execute este arquivo completo no SQL Editor de um projeto Neon dedicado.
-- Cria somente o schema empresta; não altera tabelas de outros sistemas.
BEGIN;
CREATE SCHEMA IF NOT EXISTS empresta;
CREATE TABLE IF NOT EXISTS empresta.emprestimos (
  id uuid PRIMARY KEY,
  dono text NOT NULL CHECK (dono ~ '^[a-f0-9]{64}$'),
  item text NOT NULL CHECK (length(btrim(item)) BETWEEN 1 AND 100),
  pessoa text NOT NULL CHECK (length(btrim(pessoa)) BETWEEN 1 AND 100),
  data_emprestimo date NOT NULL,
  data_prevista date NOT NULL,
  devolvido_em timestamptz,
  observacao text NOT NULL DEFAULT '' CHECK (length(observacao) <= 500),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (data_prevista >= data_emprestimo)
);
CREATE INDEX IF NOT EXISTS emprestimos_dono_idx
  ON empresta.emprestimos (dono, criado_em DESC);

-- O bloqueio por chave serializa cadastros da mesma lista.
-- Assim duas requisições simultâneas não ultrapassam o limite de 100.
CREATE OR REPLACE FUNCTION empresta.criar_emprestimo(
  p_id uuid, p_dono text, p_item text, p_pessoa text,
  p_data_emprestimo date, p_data_prevista date, p_observacao text
) RETURNS SETOF empresta.emprestimos
LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = pg_catalog, empresta
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_dono, 0));
  IF (SELECT count(*) FROM empresta.emprestimos WHERE dono = p_dono) >= 100 THEN
    RAISE EXCEPTION 'LIMITE_EMPRESTIMOS' USING ERRCODE = 'P0001';
  END IF;
  RETURN QUERY
    INSERT INTO empresta.emprestimos
      (id, dono, item, pessoa, data_emprestimo, data_prevista, observacao)
    VALUES
      (p_id, p_dono, p_item, p_pessoa, p_data_emprestimo, p_data_prevista, p_observacao)
    RETURNING *;
END;
$$;
COMMIT;

-- Conferência: deve retornar o nome empresta.emprestimos.
SELECT to_regclass('empresta.emprestimos') AS tabela_criada;
