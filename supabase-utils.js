import { createClient } from "@supabase/supabase-js";

/* =========================
   CONFIG SUPABASE
========================= */
const SUPABASE_URL = "http://116.202.27.216/api/horus";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjQ4NjU4NDAwLCJleHAiOjE5NjQyMDQ4MDB9.6lkYUrysHAhkm014dj7cx3DgYVAYZzwP2QjiNDwA-sk";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

function normalizarPreco(preco) {
  if (preco === null || preco === undefined) return null;
  return parseFloat(String(preco).replace(",", "."));
}

/**
 * Converte data do formato DD/MM/YYYY para formato ISO (YYYY-MM-DD)
 * @param {string} dataStr - Data no formato DD/MM/YYYY
 * @returns {string|null} - Data no formato YYYY-MM-DD ou null
 */
function converterDataParaISO(dataStr) {
  if (!dataStr || typeof dataStr !== 'string') return null;
  
  // Remove espaços e tenta diferentes formatos
  const dataLimpa = dataStr.trim();
  
  // Formato DD/MM/YYYY
  const matchDMY = dataLimpa.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (matchDMY) {
    const [, dia, mes, ano] = matchDMY;
    return `${ano}-${mes}-${dia}`;
  }
  
  // Formato YYYY-MM-DD (já está no formato correto)
  const matchISO = dataLimpa.match(/^\d{4}-\d{2}-\d{2}$/);
  if (matchISO) {
    return dataLimpa;
  }
  
  return null;
}

/**
 * Converte valor para número inteiro positivo
 * @param {any} valor - Valor a ser convertido
 * @returns {number|null} - Número inteiro positivo ou null
 */
function converterParaInteiroPositivo(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const num = parseInt(String(valor).replace(/[^\d]/g, ''));
  return isNaN(num) || num <= 0 ? null : num;
}

/**
 * Converte valor para número decimal positivo
 * @param {any} valor - Valor a ser convertido
 * @returns {number|null} - Número decimal positivo ou null
 */
function converterParaDecimalPositivo(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const num = parseFloat(String(valor).replace(',', '.'));
  return isNaN(num) || num <= 0 ? null : num;
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
      
      // Valida campos obrigatórios
      const codigoPaciente = dados.coPaciente || null;
      let codigoReceita = dados.nuReceita || null;
      
      if (!codigoPaciente) {
        return { 
          sucesso: false, 
          erro: "Campo obrigatório ausente: a001_codigo_paciente (coPaciente)" 
        };
      }
      
      // Se nuReceita estiver vazio, gera um valor único baseado em timestamp e dados do paciente
      if (!codigoReceita || codigoReceita.trim() === "") {
        // Gera um código de receita único usando timestamp e código do paciente
        const timestamp = Date.now();
        const codigoUnico = `AUTO_${codigoPaciente}_${timestamp}`;
        codigoReceita = codigoUnico;
        console.warn("⚠️ Campo nuReceita estava vazio, gerando código automático:", codigoReceita);
      }
      
      // Prepara dados da dispensação com prefixos a001_ conforme schema
      const payloadDispensacao = {
        // Origem da captura
        a001_site: ultimaColeta.site || "horus.saude.gov.br",
        a001_url: ultimaColeta.url,
        a001_tipo: ultimaColeta.tipo || "formulario_dispensacao",
        a001_coletado_em: ultimaColeta.coletadoEm || new Date().toISOString(),
        
        // Receita (campos obrigatórios)
        a001_cod_receita: codigoReceita,
        a001_data_receita: converterDataParaISO(dados.dtReceita),
        
        // Estabelecimento / Operador
        a001_estabelecimento_saude: dados.nomeEstabelecimento || null,
        a001_operador: dados.nomeOperador || null,
        
        // Paciente (a001_codigo_paciente é obrigatório)
        a001_codigo_paciente: codigoPaciente,
        a001_cod_cartao_sus: dados.nuCartaoSus || null,
        a001_paciente_nome: dados.noNome || null,
        a001_paciente_nascimento: converterDataParaISO(dados.dtNascimento),
        a001_observacao: dados.dsObservacao || null,
        
        // Médico
        a001_medico_crm: dados.coCrmMedico || null,
        a001_medico_nome: dados.medico || null,
        a001_nmr_conselho: dados.nuConselho || null,
        
        // Origem da receita
        a001_codigo_origem_receita: dados.coSeqOrigemReceita?.value || dados.coSeqOrigemReceita || null,
        a001_local_origem_receita: dados.coSeqOrigemReceita?.text || null,
        a001_cod_subgrupo_origem_receita: dados.coSubgrupoOrigemReceita?.value || dados.coSubgrupoOrigemReceita || null,
        a001_subgrupo_local_origem_receita: dados.coSubgrupoOrigemReceita?.text || null
      };

      console.log("📤 Salvando dispensação:", payloadDispensacao);

      // Verifica se já existe uma dispensação com a mesma combinação (constraint UNIQUE)
      const { data: dispensacaoExistente, error: erroBusca } = await supabase
        .from("a001_dispensacoes")
        .select("a001_id")
        .eq("a001_codigo_paciente", codigoPaciente)
        .eq("a001_cod_receita", codigoReceita)
        .eq("a001_site", payloadDispensacao.a001_site)
        .maybeSingle();

      if (erroBusca) {
        console.error("❌ Erro ao verificar dispensação existente:", erroBusca);
        // Continua tentando inserir mesmo com erro na busca
      }

      let dispensacaoData;
      
      if (dispensacaoExistente) {
        // Dispensação já existe - retorna informação amigável
        console.warn("⚠️ Dispensação já existe no banco:", dispensacaoExistente.a001_id);
        dispensacaoData = dispensacaoExistente;
        
        return {
          sucesso: false,
          erro: `Dispensação já existe no banco de dados. ID: ${dispensacaoExistente.a001_id}. A constraint UNIQUE (paciente, receita, site) impede duplicatas.`,
          dados: dispensacaoExistente,
          duplicado: true
        };
      }

      // Insere a dispensação
      const { data: novaDispensacao, error: dispensacaoError } = await supabase
        .from("a001_dispensacoes")
        .insert([payloadDispensacao])
        .select()
        .single();

      if (dispensacaoError) {
        console.error("❌ Erro ao salvar dispensação:", dispensacaoError);
        
        // Verifica se é erro de violação de constraint UNIQUE
        const erroMsg = JSON.stringify(dispensacaoError);
        if (erroMsg.includes("unq_paciente_receita") || 
            erroMsg.includes("duplicate key") || 
            erroMsg.includes("unique constraint")) {
          return {
            sucesso: false,
            erro: "Dispensação duplicada: já existe uma dispensação com a mesma combinação de paciente, receita e site no banco de dados.",
            duplicado: true
          };
        }
        
        return { 
          sucesso: false, 
          erro: "Erro ao salvar dispensação: " + JSON.stringify(dispensacaoError, null, 2) 
        };
      }

      dispensacaoData = novaDispensacao;

      console.log("✅ Dispensação salva:", dispensacaoData);

      // Insere os itens se houver
      let itensSalvos = 0;
      let itensComErro = 0;
      
      if (dados.itens && Array.isArray(dados.itens) && dados.itens.length > 0) {
        const itensPayload = [];
        
        for (const item of dados.itens) {
          // Valida campos obrigatórios
          const formulaProduto = item.produto?.dsProduto || null;
          const qtDose = converterParaDecimalPositivo(item.qtDose);
          const frequencia = converterParaInteiroPositivo(item.qtPosologia);
          const duracaoTratamDia = converterParaInteiroPositivo(item.qtDuracaoTratamDia);
          const nmrDiasDispensar = converterParaInteiroPositivo(item.nuDiasDispensar);
          const itemIndex = item.index !== undefined && item.index >= 0 ? item.index : 0;
          
          // Valida se todos os campos obrigatórios estão presentes
          if (!formulaProduto) {
            console.warn("⚠️ Item ignorado: a002_formula_produto é obrigatório", item);
            itensComErro++;
            continue;
          }
          
          if (!qtDose) {
            console.warn("⚠️ Item ignorado: a002_qt_dose deve ser maior que 0", item);
            itensComErro++;
            continue;
          }
          
          if (!frequencia) {
            console.warn("⚠️ Item ignorado: a002_frequencia deve ser maior que 0", item);
            itensComErro++;
            continue;
          }
          
          if (!duracaoTratamDia) {
            console.warn("⚠️ Item ignorado: a002_duracao_tratam_dia deve ser maior que 0", item);
            itensComErro++;
            continue;
          }
          
          if (!nmrDiasDispensar) {
            console.warn("⚠️ Item ignorado: a002_nmr_dias_dispensar deve ser maior que 0", item);
            itensComErro++;
            continue;
          }
          
          itensPayload.push({
            a002_dispensacao_id_a001: dispensacaoData.a001_id,
            a002_codigo_produto: item.produto?.coSeqProduto || null,
            a002_formula_produto: formulaProduto,
            a002_qt_dose: qtDose,
            a002_forma_consumo: item.unidadeConsumo || null,
            a002_frequencia: frequencia,
            a002_duracao_tratam_dia: duracaoTratamDia,
            a002_nmr_dias_dispensar: nmrDiasDispensar,
            a002_item_index: itemIndex
          });
        }

        if (itensPayload.length > 0) {
          // Verifica se já existem itens para esta dispensação
          const { data: itensExistentes, error: erroBuscaItens } = await supabase
            .from("a002_dispensacao_itens")
            .select("a002_item_index")
            .eq("a002_dispensacao_id_a001", dispensacaoData.a001_id);

          if (erroBuscaItens) {
            console.warn("⚠️ Erro ao verificar itens existentes:", erroBuscaItens);
          }

          // Filtra itens que já existem (evita violação de constraint UNIQUE)
          const indicesExistentes = new Set((itensExistentes || []).map(i => i.a002_item_index));
          const itensParaInserir = itensPayload.filter(item => {
            if (indicesExistentes.has(item.a002_item_index)) {
              console.warn(`⚠️ Item com índice ${item.a002_item_index} já existe, ignorando...`);
              itensComErro++;
              return false;
            }
            return true;
          });

          if (itensParaInserir.length === 0) {
            console.warn("⚠️ Todos os itens já existem no banco ou foram filtrados");
          } else {
            console.log("📤 Salvando itens:", itensParaInserir);

            const { data: itensData, error: itensError } = await supabase
              .from("a002_dispensacao_itens")
              .insert(itensParaInserir);

            if (itensError) {
              console.error("❌ Erro ao salvar itens:", itensError);
              
              // Verifica se é erro de violação de constraint UNIQUE
              const erroMsg = JSON.stringify(itensError);
              if (erroMsg.includes("unq_item_por_dispensacao") || 
                  erroMsg.includes("duplicate key") || 
                  erroMsg.includes("unique constraint")) {
                return { 
                  sucesso: true, 
                  dados: dispensacaoData,
                  aviso: `Dispensação salva, mas alguns itens não foram salvos por já existirem no banco (constraint UNIQUE). Itens ignorados por validação: ${itensComErro}`
                };
              }
              
              return { 
                sucesso: true, 
                dados: dispensacaoData,
                aviso: `Dispensação salva, mas houve erro ao salvar itens: ${JSON.stringify(itensError, null, 2)}. Itens ignorados por validação: ${itensComErro}`
              };
            }

            console.log("✅ Itens salvos:", itensData);
            itensSalvos = itensParaInserir.length;
          }
        } else {
          console.warn("⚠️ Nenhum item válido para salvar. Todos os itens foram ignorados por validação.");
        }
        
        if (itensComErro > 0) {
          console.warn(`⚠️ ${itensComErro} item(ns) foram ignorados por não atenderem aos requisitos de validação`);
        }
      }

      let mensagem = `Dados salvos com sucesso! Dispensação ID: ${dispensacaoData.a001_id}`;
      if (itensSalvos > 0) {
        mensagem += `, Itens salvos: ${itensSalvos}`;
      }
      if (itensComErro > 0) {
        mensagem += `, Itens ignorados: ${itensComErro}`;
      }
      
      return { 
        sucesso: true, 
        dados: dispensacaoData,
        mensagem: mensagem
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
