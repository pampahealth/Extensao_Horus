# 🗄️ Instruções de Configuração do Banco de Dados

## 📦 Arquivos Criados

1. **`supabase_schema.sql`** - Script SQL completo para criar o banco de dados
2. **`README_DATABASE.md`** - Documentação detalhada do banco
3. **`INSTRUCOES_BANCO.md`** - Este arquivo (instruções rápidas)

## 🚀 Configuração Rápida (5 minutos)

### Passo 1: Acessar Supabase
1. Acesse https://supabase.com
2. Faça login e selecione seu projeto

### Passo 2: Executar o SQL
1. No menu lateral, clique em **SQL Editor**
2. Clique em **New Query**
3. Abra o arquivo `supabase_schema.sql` e copie TODO o conteúdo
4. Cole no editor SQL
5. Clique em **Run** (ou pressione `Ctrl+Enter`)

### Passo 3: Verificar
1. Vá em **Table Editor** no menu lateral
2. Você deve ver duas tabelas:
   - ✅ `dispensacoes`
   - ✅ `dispensacao_itens`

## 📊 Estrutura do Banco

### Tabela Principal: `dispensacoes`
Armazena os dados principais de cada dispensação coletada.

### Tabela Relacionada: `dispensacao_itens`
Armazena os produtos/itens de cada dispensação (relação 1:N).

## 🔧 O Código Já Está Atualizado!

O arquivo `src/popup.js` já foi atualizado para:
- ✅ Detectar dados do SiteHorus
- ✅ Salvar na tabela `dispensacoes`
- ✅ Salvar itens na tabela `dispensacao_itens`
- ✅ Tratar erros adequadamente

## 🧪 Testar

1. Colete dados usando o botão "Coletar dados"
2. Clique em "Salvar no banco"
3. Verifique no Supabase (Table Editor) se os dados foram salvos

## 📝 Exemplo de Consulta

```sql
-- Ver última dispensação com seus itens
SELECT 
    d.*,
    json_agg(di.*) as itens
FROM dispensacoes d
LEFT JOIN dispensacao_itens di ON di.dispensacao_id = d.id
WHERE d.id = (SELECT MAX(id) FROM dispensacoes)
GROUP BY d.id;
```

## ⚠️ Importante

- As políticas RLS (Row Level Security) estão **desabilitadas** por padrão
- Se precisar de segurança, descomente e ajuste as políticas no SQL
- O código já trata campos opcionais (NULL) corretamente

## 🆘 Problemas Comuns

### "relation already exists"
- As tabelas já existem. Tudo certo! ✅

### "permission denied"
- Verifique se você tem permissão de administrador no projeto
- Verifique as políticas RLS se estiverem ativadas

### Dados não aparecem
- Verifique se o botão "Salvar no banco" foi clicado
- Verifique o console do navegador (F12) para erros
- Verifique se as tabelas foram criadas corretamente

## 📚 Mais Informações

Consulte `README_DATABASE.md` para documentação completa.
