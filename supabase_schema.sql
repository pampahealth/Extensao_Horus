-- ============================================
-- SCHEMA DO BANCO DE DADOS PARA COLETOR HORUS
-- ============================================
-- Este arquivo contém a estrutura completa do banco de dados
-- para armazenar os dados coletados do SiteHorus
-- ============================================

-- Tabela principal de dispensações
CREATE TABLE IF NOT EXISTS dispensacoes (
    id BIGSERIAL PRIMARY KEY,
    
    -- Dados de identificação da coleta
    site VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    tipo VARCHAR(100) DEFAULT 'formulario_dispensacao',
    coletado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Dados do Paciente
    co_paciente VARCHAR(50),
    nu_cartao_sus VARCHAR(20),
    no_nome VARCHAR(255),
    dt_nascimento VARCHAR(20),
    ds_observacao TEXT,
    
    -- Dados da Receita
    co_seq_origem_receita VARCHAR(50),
    co_seq_origem_receita_text VARCHAR(255),
    co_subgrupo_origem_receita VARCHAR(50),
    co_subgrupo_origem_receita_text VARCHAR(255),
    co_crm_medico VARCHAR(50),
    medico VARCHAR(255),
    no_prescritor VARCHAR(255),
    nu_conselho VARCHAR(20),
    nu_receita VARCHAR(20),
    dt_receita VARCHAR(20),
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de itens da dispensação
CREATE TABLE IF NOT EXISTS dispensacao_itens (
    id BIGSERIAL PRIMARY KEY,
    dispensacao_id BIGINT NOT NULL REFERENCES dispensacoes(id) ON DELETE CASCADE,
    
    -- Dados do produto
    co_seq_produto VARCHAR(50),
    ds_produto TEXT NOT NULL,
    
    -- Dados da prescrição
    qt_dose VARCHAR(20),
    unidade_consumo VARCHAR(50),
    qt_posologia VARCHAR(10),
    qt_duracao_tratam_dia VARCHAR(10),
    nu_dias_dispensar VARCHAR(10),
    
    -- Status
    co_status_tramite_detalhe VARCHAR(10),
    co_status_tramite_detalhe_text VARCHAR(255),
    estoque_atual VARCHAR(20),
    
    -- Ordem do item
    item_index INTEGER NOT NULL DEFAULT 0,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- ============================================

-- Índices na tabela dispensacoes
CREATE INDEX IF NOT EXISTS idx_dispensacoes_coletado_em ON dispensacoes(coletado_em DESC);
CREATE INDEX IF NOT EXISTS idx_dispensacoes_nu_cartao_sus ON dispensacoes(nu_cartao_sus);
CREATE INDEX IF NOT EXISTS idx_dispensacoes_co_paciente ON dispensacoes(co_paciente);
CREATE INDEX IF NOT EXISTS idx_dispensacoes_nu_receita ON dispensacoes(nu_receita);
CREATE INDEX IF NOT EXISTS idx_dispensacoes_site ON dispensacoes(site);
CREATE INDEX IF NOT EXISTS idx_dispensacoes_tipo ON dispensacoes(tipo);

-- Índices na tabela dispensacao_itens
CREATE INDEX IF NOT EXISTS idx_dispensacao_itens_dispensacao_id ON dispensacao_itens(dispensacao_id);
CREATE INDEX IF NOT EXISTS idx_dispensacao_itens_co_seq_produto ON dispensacao_itens(co_seq_produto);
CREATE INDEX IF NOT EXISTS idx_dispensacao_itens_item_index ON dispensacao_itens(dispensacao_id, item_index);

-- ============================================
-- FUNÇÃO PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_dispensacoes_updated_at 
    BEFORE UPDATE ON dispensacoes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dispensacao_itens_updated_at 
    BEFORE UPDATE ON dispensacao_itens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTÁRIOS NAS TABELAS E COLUNAS
-- ============================================

COMMENT ON TABLE dispensacoes IS 'Tabela principal para armazenar dados de dispensações coletadas do SiteHorus';
COMMENT ON TABLE dispensacao_itens IS 'Tabela para armazenar os itens/produtos de cada dispensação';

COMMENT ON COLUMN dispensacoes.co_paciente IS 'Código sequencial do paciente no sistema';
COMMENT ON COLUMN dispensacoes.nu_cartao_sus IS 'Número do Cartão Nacional de Saúde (CNS)';
COMMENT ON COLUMN dispensacoes.no_nome IS 'Nome completo do paciente';
COMMENT ON COLUMN dispensacoes.dt_nascimento IS 'Data de nascimento do paciente (formato DD/MM/YYYY)';
COMMENT ON COLUMN dispensacoes.ds_observacao IS 'Observações sobre o paciente';
COMMENT ON COLUMN dispensacoes.co_seq_origem_receita IS 'Código da origem da receita';
COMMENT ON COLUMN dispensacoes.co_subgrupo_origem_receita IS 'Código do subgrupo da origem da receita';
COMMENT ON COLUMN dispensacoes.co_crm_medico IS 'Código do CRM do médico';
COMMENT ON COLUMN dispensacoes.medico IS 'Nome do médico';
COMMENT ON COLUMN dispensacoes.no_prescritor IS 'Nome de outro tipo de prescritor (se houver)';
COMMENT ON COLUMN dispensacoes.nu_conselho IS 'Número do conselho do prescritor';
COMMENT ON COLUMN dispensacoes.nu_receita IS 'Número da receita/notificação';
COMMENT ON COLUMN dispensacoes.dt_receita IS 'Data da receita (formato DD/MM/YYYY)';

COMMENT ON COLUMN dispensacao_itens.co_seq_produto IS 'Código sequencial do produto';
COMMENT ON COLUMN dispensacao_itens.ds_produto IS 'Descrição completa do produto';
COMMENT ON COLUMN dispensacao_itens.qt_dose IS 'Quantidade da dose';
COMMENT ON COLUMN dispensacao_itens.unidade_consumo IS 'Unidade de consumo (ex: CAPS, COMP, etc)';
COMMENT ON COLUMN dispensacao_itens.qt_posologia IS 'Frequência de uso';
COMMENT ON COLUMN dispensacao_itens.qt_duracao_tratam_dia IS 'Duração do tratamento em dias';
COMMENT ON COLUMN dispensacao_itens.nu_dias_dispensar IS 'Número de dias para dispensar';
COMMENT ON COLUMN dispensacao_itens.estoque_atual IS 'Estoque atual do produto no momento da coleta';

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================
-- Descomente e ajuste conforme necessário para segurança

-- ALTER TABLE dispensacoes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dispensacao_itens ENABLE ROW LEVEL SECURITY;

-- Exemplo de política: permitir leitura pública (ajuste conforme necessário)
-- CREATE POLICY "Permitir leitura pública" ON dispensacoes FOR SELECT USING (true);
-- CREATE POLICY "Permitir inserção pública" ON dispensacoes FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Permitir leitura pública" ON dispensacao_itens FOR SELECT USING (true);
-- CREATE POLICY "Permitir inserção pública" ON dispensacao_itens FOR INSERT WITH CHECK (true);

-- ============================================
-- VIEW PARA CONSULTAS FACILITADAS
-- ============================================

CREATE OR REPLACE VIEW vw_dispensacoes_completa AS
SELECT 
    d.id,
    d.site,
    d.url,
    d.tipo,
    d.coletado_em,
    d.co_paciente,
    d.nu_cartao_sus,
    d.no_nome,
    d.dt_nascimento,
    d.ds_observacao,
    d.co_seq_origem_receita,
    d.co_seq_origem_receita_text,
    d.co_subgrupo_origem_receita,
    d.co_subgrupo_origem_receita_text,
    d.co_crm_medico,
    d.medico,
    d.no_prescritor,
    d.nu_conselho,
    d.nu_receita,
    d.dt_receita,
    COUNT(di.id) as total_itens,
    d.created_at,
    d.updated_at
FROM dispensacoes d
LEFT JOIN dispensacao_itens di ON di.dispensacao_id = d.id
GROUP BY d.id;

COMMENT ON VIEW vw_dispensacoes_completa IS 'View que agrega informações das dispensações com contagem de itens';
