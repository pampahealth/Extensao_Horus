# Guia de Configuração do Banco de Dados - Supabase

Este guia explica como configurar o banco de dados no Supabase para armazenar os dados coletados pelo plugin.

## 📋 Pré-requisitos

1. Conta no Supabase (https://supabase.com)
2. Projeto criado no Supabase
3. Acesso ao SQL Editor do Supabase

## 🚀 Passo a Passo

### 1. Acessar o SQL Editor

1. Faça login no Supabase
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Clique em **New Query**

### 2. Executar o Schema

1. Copie todo o conteúdo do arquivo `supabase_schema.sql`
2. Cole no SQL Editor do Supabase
3. Clique em **Run** ou pressione `Ctrl+Enter` (Windows/Linux) ou `Cmd+Enter` (Mac)

### 3. Verificar as Tabelas

Após executar o script, você deve ver duas tabelas criadas:

- `dispensacoes` - Tabela principal com dados da dispensação
- `dispensacao_itens` - Tabela com os itens/produtos de cada dispensação

### 4. Configurar Políticas de Segurança (Opcional)

Por padrão, as políticas RLS (Row Level Security) estão comentadas. Se você quiser ativar:

1. Descomente as linhas de política no arquivo SQL
2. Ajuste conforme suas necessidades de segurança
3. Execute novamente apenas as linhas de política

## 📊 Estrutura das Tabelas

### Tabela: `dispensacoes`

Armazena os dados principais da dispensação:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL | ID único (chave primária) |
| site | VARCHAR(255) | Site de origem (ex: horus.saude.gov.br) |
| url | TEXT | URL completa da página |
| tipo | VARCHAR(100) | Tipo de coleta (formulario_dispensacao) |
| coletado_em | TIMESTAMP | Data/hora da coleta |
| co_paciente | VARCHAR(50) | Código do paciente |
| nu_cartao_sus | VARCHAR(20) | Número do CNS |
| no_nome | VARCHAR(255) | Nome do paciente |
| dt_nascimento | VARCHAR(20) | Data de nascimento |
| ds_observacao | TEXT | Observações |
| co_seq_origem_receita | VARCHAR(50) | Código origem receita |
| co_subgrupo_origem_receita | VARCHAR(50) | Código subgrupo |
| co_crm_medico | VARCHAR(50) | Código CRM |
| medico | VARCHAR(255) | Nome do médico |
| nu_receita | VARCHAR(20) | Número da receita |
| dt_receita | VARCHAR(20) | Data da receita |

### Tabela: `dispensacao_itens`

Armazena os produtos/itens de cada dispensação:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL | ID único (chave primária) |
| dispensacao_id | BIGINT | ID da dispensação (chave estrangeira) |
| co_seq_produto | VARCHAR(50) | Código do produto |
| ds_produto | TEXT | Descrição do produto |
| qt_dose | VARCHAR(20) | Quantidade da dose |
| qt_posologia | VARCHAR(10) | Frequência |
| qt_duracao_tratam_dia | VARCHAR(10) | Duração em dias |
| nu_dias_dispensar | VARCHAR(10) | Dias para dispensar |
| estoque_atual | VARCHAR(20) | Estoque no momento |

## 🔍 Consultas Úteis

### Ver todas as dispensações
```sql
SELECT * FROM dispensacoes ORDER BY coletado_em DESC;
```

### Ver dispensação com itens
```sql
SELECT 
    d.*,
    di.*
FROM dispensacoes d
LEFT JOIN dispensacao_itens di ON di.dispensacao_id = d.id
WHERE d.id = 1;
```

### Usar a view criada
```sql
SELECT * FROM vw_dispensacoes_completa 
ORDER BY coletado_em DESC 
LIMIT 10;
```

### Contar dispensações por dia
```sql
SELECT 
    DATE(coletado_em) as data,
    COUNT(*) as total
FROM dispensacoes
GROUP BY DATE(coletado_em)
ORDER BY data DESC;
```

## 🔐 Configuração de Segurança

### Políticas RLS (Row Level Security)

Se você quiser ativar segurança por linha:

1. **Descomente** as linhas de política no SQL
2. **Ajuste** conforme necessário:
   - Leitura pública: `FOR SELECT USING (true)`
   - Inserção pública: `FOR INSERT WITH CHECK (true)`
   - Apenas autenticados: `FOR SELECT USING (auth.role() = 'authenticated')`

### Exemplo de Política Restritiva

```sql
-- Permitir apenas inserção para usuários autenticados
CREATE POLICY "Inserção autenticada" 
ON dispensacoes 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
```

## 📝 Próximos Passos

Após criar as tabelas:

1. ✅ Atualize o código do plugin para usar essas tabelas
2. ✅ Teste a inserção de dados
3. ✅ Configure políticas de segurança conforme necessário
4. ✅ Crie dashboards ou relatórios conforme necessário

## 🆘 Troubleshooting

### Erro: "relation already exists"
- As tabelas já existem. Use `DROP TABLE` se quiser recriar (cuidado: apaga dados!)

### Erro: "permission denied"
- Verifique as permissões do usuário no Supabase
- Verifique se as políticas RLS estão configuradas corretamente

### Erro ao inserir dados
- Verifique se todas as colunas NOT NULL estão preenchidas
- Verifique os tipos de dados (especialmente datas)
