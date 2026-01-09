import { createClient } from "@supabase/supabase-js";

/* =========================
   CONFIG SUPABASE
========================= */
const SUPABASE_URL = "https://asxujexunamamwiriqte.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeHVqZXh1bmFtYW13aXJpcXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDQyNDcsImV4cCI6MjA4MzM4MDI0N30.CrT3BS4ZsfmLLA-sOJEOzge2Q3C_DX-lO5lONl0Pcj4";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

function normalizarPreco(preco) {
  if (preco === null || preco === undefined) return null;
  return parseFloat(String(preco).replace(",", "."));
}

/**
 * Envia dados coletados para o Supabase
 * @param {Object} ultimaColeta - Dados coletados do storage
 * @returns {Promise<Object>} - { sucesso: boolean, dados?: Object, erro?: string }
 */
export async function enviarParaSupabase(ultimaColeta) {
  if (!ultimaColeta) {
    return { sucesso: false, erro: "Nenhum dado para salvar" };
  }

  try {
    // Verifica se é uma dispensação do SiteHorus
    if (ultimaColeta.tipo === "formulario_dispensacao" && ultimaColeta.dados) {
      const dados = ultimaColeta.dados;
      
      // Prepara dados da dispensação com prefixos a001_
      const payloadDispensacao = {
        a001_site: ultimaColeta.site || "horus.saude.gov.br",
        a001_url: ultimaColeta.url,
        a001_tipo: ultimaColeta.tipo || "formulario_dispensacao",
        a001_coletado_em: ultimaColeta.coletadoEm || new Date().toISOString(),
        
        // Dados do Paciente
        a001_co_paciente: dados.coPaciente || null,
        a001_nu_cartao_sus: dados.nuCartaoSus || null,
        a001_no_nome: dados.noNome || null,
        a001_dt_nascimento: dados.dtNascimento || null,
        a001_ds_observacao: dados.dsObservacao || null,
        
        // Dados da Receita
        a001_co_seq_origem_receita: dados.coSeqOrigemReceita?.value || dados.coSeqOrigemReceita || null,
        a001_co_seq_origem_receita_text: dados.coSeqOrigemReceita?.text || null,
        a001_co_subgrupo_origem_receita: dados.coSubgrupoOrigemReceita?.value || dados.coSubgrupoOrigemReceita || null,
        a001_co_subgrupo_origem_receita_text: dados.coSubgrupoOrigemReceita?.text || null,
        a001_co_crm_medico: dados.coCrmMedico || null,
        a001_medico: dados.medico || null,
        a001_no_prescritor: dados.noPrescritor || null,
        a001_nu_conselho: dados.nuConselho || null,
        a001_nu_receita: dados.nuReceita || null,
        a001_dt_receita: dados.dtReceita || null
      };

      console.log("📤 Salvando dispensação:", payloadDispensacao);

      // Insere a dispensação
      const { data: dispensacaoData, error: dispensacaoError } = await supabase
        .from("a001_dispensacoes")
        .insert([payloadDispensacao])
        .select()
        .single();

      if (dispensacaoError) {
        console.error("❌ Erro ao salvar dispensação:", dispensacaoError);
        return { 
          sucesso: false, 
          erro: "Erro ao salvar dispensação: " + JSON.stringify(dispensacaoError, null, 2) 
        };
      }

      console.log("✅ Dispensação salva:", dispensacaoData);

      // Insere os itens se houver
      let itensSalvos = 0;
      if (dados.itens && Array.isArray(dados.itens) && dados.itens.length > 0) {
        const itensPayload = dados.itens.map(item => ({
          a002_dispensacao_id: dispensacaoData.a001_id,
          a002_co_seq_produto: item.produto?.coSeqProduto || null,
          a002_ds_produto: item.produto?.dsProduto || null,
          a002_qt_dose: item.qtDose ? parseFloat(item.qtDose) : null,
          a002_unidade_consumo: item.unidadeConsumo || null,
          a002_frequencia: item.qtPosologia || null,
          a002_qt_duracao_tratam_dia: item.qtDuracaoTratamDia ? parseInt(item.qtDuracaoTratamDia) : null,
          a002_nu_dias_dispensar: item.nuDiasDispensar ? parseInt(item.nuDiasDispensar) : null,
          a002_item_index: item.index !== undefined ? item.index : 0
        }));

        console.log("📤 Salvando itens:", itensPayload);

        const { data: itensData, error: itensError } = await supabase
          .from("a002_dispensacao_itens")
          .insert(itensPayload);

        if (itensError) {
          console.error("❌ Erro ao salvar itens:", itensError);
          return { 
            sucesso: true, 
            dados: dispensacaoData,
            aviso: "Dispensação salva, mas houve erro ao salvar itens: " + JSON.stringify(itensError, null, 2)
          };
        }

        console.log("✅ Itens salvos:", itensData);
        itensSalvos = dados.itens.length;
      }

      return { 
        sucesso: true, 
        dados: dispensacaoData,
        mensagem: `Dados salvos com sucesso! Dispensação ID: ${dispensacaoData.a001_id}, Itens: ${itensSalvos}`
      };
    } else {
      // Fallback para dados de outros sites (formato antigo)
      const payload = {
        site: ultimaColeta.site,
        url: ultimaColeta.url,
        titulo: ultimaColeta.titulo,
        preco: normalizarPreco(ultimaColeta.preco),
        moeda: ultimaColeta.moeda,
        parcelamento:
          typeof ultimaColeta.parcelamento === "number"
            ? ultimaColeta.parcelamento
            : null,
        prazoEntrega: ultimaColeta.prazoEntrega,
        disponibilidade: ultimaColeta.disponibilidade,
        coletadoEm: ultimaColeta.coletadoEm
      };

      console.log("📤 Payload enviado (formato antigo):", payload);

      // Tenta salvar na tabela antiga (se ainda existir)
      const { data, error } = await supabase
        .from("produtos")
        .insert([payload]);

      console.log("📥 Resposta Supabase:", { data, error });

      if (error) {
        return { 
          sucesso: false, 
          erro: "Erro Supabase: " + JSON.stringify(error, null, 2) 
        };
      }

      return { 
        sucesso: true, 
        dados: data,
        mensagem: "Produto salvo com sucesso!" 
      };
    }
  } catch (error) {
    console.error("❌ Erro geral:", error);
    return { 
      sucesso: false, 
      erro: "Erro ao salvar: " + error.message 
    };
  }
}
