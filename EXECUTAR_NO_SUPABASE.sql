-- =========================================================
-- SCRIPT PARA EXECUTAR NO SUPABASE SQL EDITOR
-- =========================================================
-- Este script corrige o erro "permission denied for table a001_dispensacoes"
-- Execute este script completo no SQL Editor do Supabase
-- =========================================================

-- =========================================================
-- 1. Permissões nas tabelas
-- =========================================================
-- Concede permissões nas tabelas para usuários anônimos e autenticados
GRANT ALL ON public.a001_dispensacoes TO anon;
GRANT ALL ON public.a001_dispensacoes TO authenticated;
GRANT ALL ON public.a001_dispensacoes TO service_role;

GRANT ALL ON public.a002_dispensacao_itens TO anon;
GRANT ALL ON public.a002_dispensacao_itens TO authenticated;
GRANT ALL ON public.a002_dispensacao_itens TO service_role;

-- =========================================================
-- 2. Permissões nas sequences (se necessário)
-- =========================================================
-- Primeiro, verifique os nomes das sequences executando:
-- SELECT sequence_name FROM information_schema.sequences 
-- WHERE sequence_schema = 'public' 
-- AND (sequence_name LIKE '%a001%' OR sequence_name LIKE '%a002%');

-- Depois, execute os GRANTs com os nomes corretos (exemplo):
-- GRANT USAGE ON SEQUENCE public.a001_dispensacoes_a001_id_seq TO anon, authenticated, service_role;
-- GRANT USAGE ON SEQUENCE public.a002_dispensacao_itens_a002_id_seq TO anon, authenticated, service_role;

-- =========================================================
-- 3. Habilita RLS (Row Level Security)
-- =========================================================
ALTER TABLE public.a001_dispensacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.a002_dispensacao_itens ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 4. Políticas RLS para a001_dispensacoes
-- =========================================================
-- Remove políticas antigas se existirem (ignora erro se não existirem)
DROP POLICY IF EXISTS "Permitir SELECT em a001_dispensacoes" ON public.a001_dispensacoes;
DROP POLICY IF EXISTS "Permitir INSERT em a001_dispensacoes" ON public.a001_dispensacoes;
DROP POLICY IF EXISTS "Permitir UPDATE em a001_dispensacoes" ON public.a001_dispensacoes;
DROP POLICY IF EXISTS "Permitir DELETE em a001_dispensacoes" ON public.a001_dispensacoes;

-- Cria novas políticas
CREATE POLICY "Permitir SELECT em a001_dispensacoes"
ON public.a001_dispensacoes
FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "Permitir INSERT em a001_dispensacoes"
ON public.a001_dispensacoes
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY "Permitir UPDATE em a001_dispensacoes"
ON public.a001_dispensacoes
FOR UPDATE
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir DELETE em a001_dispensacoes"
ON public.a001_dispensacoes
FOR DELETE
TO anon, authenticated, service_role
USING (true);

-- =========================================================
-- 5. Políticas RLS para a002_dispensacao_itens
-- =========================================================
-- Remove políticas antigas se existirem (ignora erro se não existirem)
DROP POLICY IF EXISTS "Permitir SELECT em a002_dispensacao_itens" ON public.a002_dispensacao_itens;
DROP POLICY IF EXISTS "Permitir INSERT em a002_dispensacao_itens" ON public.a002_dispensacao_itens;
DROP POLICY IF EXISTS "Permitir UPDATE em a002_dispensacao_itens" ON public.a002_dispensacao_itens;
DROP POLICY IF EXISTS "Permitir DELETE em a002_dispensacao_itens" ON public.a002_dispensacao_itens;

-- Cria novas políticas
CREATE POLICY "Permitir SELECT em a002_dispensacao_itens"
ON public.a002_dispensacao_itens
FOR SELECT
TO anon, authenticated, service_role
USING (true);

CREATE POLICY "Permitir INSERT em a002_dispensacao_itens"
ON public.a002_dispensacao_itens
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY "Permitir UPDATE em a002_dispensacao_itens"
ON public.a002_dispensacao_itens
FOR UPDATE
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir DELETE em a002_dispensacao_itens"
ON public.a002_dispensacao_itens
FOR DELETE
TO anon, authenticated, service_role
USING (true);

-- =========================================================
-- FIM DO SCRIPT
-- =========================================================
-- Após executar este script, a extensão deve funcionar corretamente
-- =========================================================
