import { createClient } from "@supabase/supabase-js";

/* =========================
   CONFIG SUPABASE
========================= */
// IMPORTANTE: a barra final é obrigatória.
// Sem ela, o supabase-js resolve rest/v1 como /api/rest/v1 (remove "horus").
export const SUPABASE_URL = "http://116.202.27.216/api/horus/";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjQ4NjU4NDAwLCJleHAiOjE5NjQyMDQ4MDB9.6lkYUrysHAhkm014dj7cx3DgYVAYZzwP2QjiNDwA-sk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/**
 * Normaliza valor de campo coletado (string | number | {value,text}).
 * @returns {string|null}
 */
function valorTexto(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "object") {
    const v = valor.value ?? valor.text ?? null;
    if (v === null || v === undefined || v === "") return null;
    const s = String(v).trim();
    return s || null;
  }
  const s = String(valor).trim();
  return s || null;
}

function normalizarPreco(preco) {
  if (preco === null || preco === undefined) return null;
  const num = parseFloat(String(preco).replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

/**
 * Converte data DD/MM/YYYY ou YYYY-MM-DD para ISO (YYYY-MM-DD)
 */
function converterDataParaISO(dataStr) {
  const texto = valorTexto(dataStr);
  if (!texto) return null;

  const matchDMY = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (matchDMY) {
    const [, dia, mes, ano] = matchDMY;
    return `${ano}-${mes}-${dia}`;
  }

  const matchISO = texto.match(/^\d{4}-\d{2}-\d{2}$/);
  if (matchISO) return texto;

  return null;
}

function converterParaInteiroPositivo(valor) {
  const texto = valorTexto(valor);
  if (!texto) return null;
  const num = parseInt(texto.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function converterParaDecimalPositivo(valor) {
  const texto = valorTexto(valor);
  if (!texto) return null;
  const num = parseFloat(texto.replace(",", "."));
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Envia dados coletados para o Supabase (Banco A).
 * @param {Object} ultimaColeta
 * @returns {Promise<{sucesso:boolean, dados?:Object, erro?:string, mensagem?:string, aviso?:string, duplicado?:boolean}>}
 */
export async function enviarParaSupabase(ultimaColeta) {
  if (!ultimaColeta) {
    return { sucesso: false, erro: "Nenhum dado para salvar" };
  }

  try {
    if (ultimaColeta.tipo === "formulario_dispensacao" && ultimaColeta.dados) {
      const dados = ultimaColeta.dados;

      const codigoPaciente = valorTexto(dados.coPaciente);
      let codigoReceita = valorTexto(dados.nuReceita);

      if (!codigoPaciente) {
        return {
          sucesso: false,
          erro: "Campo obrigatório ausente: a001_codigo_paciente (coPaciente)",
        };
      }

      if (!codigoReceita) {
        codigoReceita = `AUTO_${codigoPaciente}_${Date.now()}`;
        console.warn(
          "⚠️ Campo nuReceita estava vazio, gerando código automático:",
          codigoReceita
        );
      }

      if (!ultimaColeta.url) {
        return {
          sucesso: false,
          erro: "Campo obrigatório ausente: url da coleta",
        };
      }

      const payloadDispensacao = {
        a001_site: ultimaColeta.site || "horus.saude.gov.br",
        a001_url: ultimaColeta.url,
        a001_tipo: ultimaColeta.tipo || "formulario_dispensacao",
        a001_coletado_em: ultimaColeta.coletadoEm || new Date().toISOString(),
        a001_cod_receita: codigoReceita,
        a001_data_receita: converterDataParaISO(dados.dtReceita),
        a001_estabelecimento_saude: valorTexto(dados.nomeEstabelecimento),
        a001_operador: valorTexto(dados.nomeOperador),
        a001_codigo_paciente: codigoPaciente,
        a001_cod_cartao_sus: valorTexto(dados.nuCartaoSus),
        a001_paciente_nome: valorTexto(dados.noNome),
        a001_paciente_nascimento: converterDataParaISO(dados.dtNascimento),
        a001_observacao: valorTexto(dados.dsObservacao),
        a001_medico_crm: valorTexto(dados.coCrmMedico),
        a001_medico_nome:
          valorTexto(dados.medico) || valorTexto(dados.noPrescritor),
        a001_nmr_conselho: valorTexto(dados.nuConselho),
        a001_codigo_origem_receita: valorTexto(dados.coSeqOrigemReceita),
        a001_local_origem_receita:
          typeof dados.coSeqOrigemReceita === "object"
            ? valorTexto(dados.coSeqOrigemReceita?.text)
            : null,
        a001_cod_subgrupo_origem_receita: valorTexto(
          dados.coSubgrupoOrigemReceita
        ),
        a001_subgrupo_local_origem_receita:
          typeof dados.coSubgrupoOrigemReceita === "object"
            ? valorTexto(dados.coSubgrupoOrigemReceita?.text)
            : null,
      };

      console.log("📤 Salvando dispensação:", payloadDispensacao);

      const { data: dispensacaoExistente, error: erroBusca } = await supabase
        .from("a001_dispensacoes")
        .select("a001_id")
        .eq("a001_codigo_paciente", codigoPaciente)
        .eq("a001_cod_receita", codigoReceita)
        .eq("a001_site", payloadDispensacao.a001_site)
        .maybeSingle();

      if (erroBusca) {
        console.error("❌ Erro ao verificar dispensação existente:", erroBusca);
      }

      if (dispensacaoExistente) {
        return {
          sucesso: false,
          erro: `Dispensação já existe no banco de dados. ID: ${dispensacaoExistente.a001_id}.`,
          dados: dispensacaoExistente,
          duplicado: true,
        };
      }

      const { data: novaDispensacao, error: dispensacaoError } = await supabase
        .from("a001_dispensacoes")
        .insert([payloadDispensacao])
        .select()
        .single();

      if (dispensacaoError) {
        console.error("❌ Erro ao salvar dispensação:", dispensacaoError);
        const erroMsg = JSON.stringify(dispensacaoError);
        if (
          erroMsg.includes("unq_paciente_receita") ||
          erroMsg.includes("duplicate key") ||
          erroMsg.includes("unique constraint")
        ) {
          return {
            sucesso: false,
            erro: "Dispensação duplicada: já existe a mesma combinação de paciente, receita e site.",
            duplicado: true,
          };
        }
        return {
          sucesso: false,
          erro: "Erro ao salvar dispensação: " + erroMsg,
        };
      }

      const dispensacaoData = novaDispensacao;
      console.log("✅ Dispensação salva:", dispensacaoData);

      let itensSalvos = 0;
      let itensComErro = 0;

      if (Array.isArray(dados.itens) && dados.itens.length > 0) {
        const itensPayload = [];

        for (const item of dados.itens) {
          const formulaProduto =
            valorTexto(item.produto?.dsProduto) ||
            valorTexto(item.dsProduto);
          const qtDose = converterParaDecimalPositivo(item.qtDose);
          const frequencia = converterParaInteiroPositivo(item.qtPosologia);
          const duracaoTratamDia = converterParaInteiroPositivo(
            item.qtDuracaoTratamDia
          );
          const nmrDiasDispensar = converterParaInteiroPositivo(
            item.nuDiasDispensar
          );
          const itemIndex =
            item.index !== undefined && item.index >= 0
              ? Number(item.index)
              : 0;

          if (!formulaProduto) {
            console.warn("⚠️ Item ignorado: fórmula do produto obrigatória", item);
            itensComErro++;
            continue;
          }
          if (!qtDose) {
            console.warn("⚠️ Item ignorado: qt_dose inválida", item);
            itensComErro++;
            continue;
          }
          if (!frequencia) {
            console.warn("⚠️ Item ignorado: frequência inválida", item);
            itensComErro++;
            continue;
          }
          if (!duracaoTratamDia) {
            console.warn("⚠️ Item ignorado: duração inválida", item);
            itensComErro++;
            continue;
          }
          if (!nmrDiasDispensar) {
            console.warn("⚠️ Item ignorado: dias a dispensar inválidos", item);
            itensComErro++;
            continue;
          }

          itensPayload.push({
            a002_dispensacao_id_a001: dispensacaoData.a001_id,
            a002_codigo_produto: valorTexto(item.produto?.coSeqProduto),
            a002_formula_produto: formulaProduto,
            a002_qt_dose: qtDose,
            a002_forma_consumo: valorTexto(item.unidadeConsumo),
            a002_frequencia: frequencia,
            a002_duracao_tratam_dia: duracaoTratamDia,
            a002_nmr_dias_dispensar: nmrDiasDispensar,
            a002_item_index: itemIndex,
          });
        }

        if (itensPayload.length > 0) {
          const { data: itensExistentes, error: erroBuscaItens } =
            await supabase
              .from("a002_dispensacao_itens")
              .select("a002_item_index")
              .eq("a002_dispensacao_id_a001", dispensacaoData.a001_id);

          if (erroBuscaItens) {
            console.warn("⚠️ Erro ao verificar itens existentes:", erroBuscaItens);
          }

          const indicesExistentes = new Set(
            (itensExistentes || []).map((i) => i.a002_item_index)
          );
          const itensParaInserir = itensPayload.filter((item) => {
            if (indicesExistentes.has(item.a002_item_index)) {
              console.warn(
                `⚠️ Item índice ${item.a002_item_index} já existe, ignorando...`
              );
              itensComErro++;
              return false;
            }
            return true;
          });

          if (itensParaInserir.length > 0) {
            console.log("📤 Salvando itens:", itensParaInserir);
            const { error: itensError } = await supabase
              .from("a002_dispensacao_itens")
              .insert(itensParaInserir);

            if (itensError) {
              console.error("❌ Erro ao salvar itens:", itensError);
              return {
                sucesso: true,
                dados: dispensacaoData,
                aviso: `Dispensação salva, mas houve erro ao salvar itens: ${JSON.stringify(
                  itensError
                )}. Itens ignorados: ${itensComErro}`,
                mensagem: `Dispensação ID: ${dispensacaoData.a001_id} salva com aviso nos itens.`,
              };
            }
            itensSalvos = itensParaInserir.length;
          }
        } else {
          console.warn("⚠️ Nenhum item válido para salvar.");
        }
      }

      let mensagem = `Dados salvos com sucesso! Dispensação ID: ${dispensacaoData.a001_id}`;
      if (itensSalvos > 0) mensagem += `, Itens salvos: ${itensSalvos}`;
      if (itensComErro > 0) mensagem += `, Itens ignorados: ${itensComErro}`;

      return {
        sucesso: true,
        dados: dispensacaoData,
        mensagem,
      };
    }

    // Formato antigo (outros sites) — não suportado no Banco A atual
    return {
      sucesso: false,
      erro:
        "Coleta não é uma dispensação do Hórus (tipo formulario_dispensacao). Abra a tela de dispensação e clique em Coletar dados.",
    };
  } catch (error) {
    console.error("❌ Erro geral:", error);
    return {
      sucesso: false,
      erro: "Erro ao salvar: " + (error?.message || String(error)),
    };
  }
}
