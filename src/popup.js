import { enviarParaSupabase } from "../supabase-utils.js";

/* =========================
   UTILIDADES
========================= */
function mostrarResultado(obj) {
  document.getElementById("resultado").textContent =
    JSON.stringify(obj, null, 2);
}

/* =========================
   MODAL
========================= */
function mostrarModal(dados, resultado = null) {
  const modal = document.getElementById("modalDados");
  const modalConteudo = document.getElementById("modalDadosConteudo");
  const modalStatus = document.getElementById("modalStatus");
  const closeBtn = document.querySelector(".close");
  
  // Mostra os dados coletados
  modalConteudo.textContent = JSON.stringify(dados, null, 2);
  
  // Mostra status do envio se houver
  if (resultado) {
    if (resultado.sucesso) {
      modalStatus.innerHTML = `<div class="status-sucesso">✅ ${resultado.mensagem || "Dados salvos com sucesso!"}</div>`;
    } else {
      modalStatus.innerHTML = `<div class="status-erro">❌ ${resultado.erro || "Erro ao salvar dados"}</div>`;
    }
  } else {
    modalStatus.innerHTML = "";
  }
  
  // Abre o modal
  modal.style.display = "block";
  
  // Fecha o modal quando clicar no X
  closeBtn.onclick = () => {
    modal.style.display = "none";
  };
  
  // Fecha o modal quando clicar fora
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const btnColetar = document.getElementById("coletar");
  const btnSalvar = document.getElementById("salvar");
  const btnLimpar = document.getElementById("limpar");
  const resultadoEl = document.getElementById("resultado");

  chrome.storage.local.get("ultimaColeta", ({ ultimaColeta }) => {
    if (ultimaColeta) {
      mostrarResultado(ultimaColeta);
    } else {
      resultadoEl.textContent = "Nenhum produto coletado.";
    }
  });

  /* =========================
     COLETAR DADOS MANUALMENTE
  ========================= */
  btnColetar.addEventListener("click", async () => {
    btnColetar.disabled = true;
    btnColetar.textContent = "Coletando...";
    
    try {
      // Obtém a aba ativa
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Verifica se é uma URL válida (não chrome://, about:, etc)
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
        btnColetar.disabled = false;
        btnColetar.textContent = "Coletar dados";
        alert("❌ Não é possível coletar dados desta página.");
        return;
      }

      // Função para executar a coleta diretamente na página
      const executarColeta = async () => {
        try {
          // Injeta e executa a função de coleta diretamente
          const resultados = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: async () => {
              // Importa as funções necessárias do contexto da página
              const coletarCamposSiteHorus = () => {
                const form = document.getElementById("dispensacaoForm");
                if (!form) return null;

                const formatarTexto = (str) => {
                  if (!str) return null;
                  return str.replace(/\s+/g, " ").trim();
                };

                const getFieldValue = (id) => {
                  const field = document.getElementById(id);
                  if (!field) return null;
                  
                  if (field.tagName === "SELECT") {
                    const selectedOption = field.options[field.selectedIndex];
                    return {
                      value: field.value,
                      text: selectedOption ? selectedOption.text : null
                    };
                  }
                  
                  if (field.tagName === "TEXTAREA") {
                    return field.value;
                  }
                  
                  // Retorna o valor, mas trata string vazia como null
                  const valor = field.value;
                  return valor && valor.trim() !== "" ? valor.trim() : null;
                };

                const getNomeOperador = () => {
                  const tabelaNavegacao = document.getElementById("navegacao");
                  if (!tabelaNavegacao) return null;
                  
                  const celulas = tabelaNavegacao.querySelectorAll("td");
                  for (const celula of celulas) {
                    const texto = celula.textContent || celula.innerText;
                    if (texto && texto.includes("Operador:")) {
                      const match = texto.match(/Operador:\s*(.+)/i);
                      if (match && match[1]) {
                        return formatarTexto(match[1]);
                      }
                    }
                  }
                  return null;
                };

                const getNomeEstabelecimento = () => {
                  const tabelaNavegacao = document.getElementById("navegacao");
                  if (!tabelaNavegacao) return null;
                  
                  const celulas = tabelaNavegacao.querySelectorAll("td");
                  for (const celula of celulas) {
                    const texto = celula.textContent || celula.innerText;
                    if (texto && (texto.includes("Estabelecimentos") || texto.includes("Estabelecimento"))) {
                      const match = texto.match(/Estabelecimentos?\s*(?:de\s*Saúde)?:?\s*(.+)/i);
                      if (match && match[1]) {
                        return formatarTexto(match[1]);
                      }
                    }
                  }
                  return null;
                };

                const coletarItensProdutos = () => {
                  const itens = [];
                  const table = document.getElementById("dispensacaoForm:itens");
                  if (!table) return itens;

                  const produtoFields = document.querySelectorAll('[id^="dispensacaoForm:itens:"][id*=":item_produto_dsProduto"]');
                  
                  produtoFields.forEach((produtoField) => {
                    const idMatch = produtoField.id.match(/dispensacaoForm:itens:(\d+):/);
                    if (!idMatch) return;
                    
                    const index = idMatch[1];
                    const dsProduto = produtoField.value || produtoField.textContent;
                    
                    if (!dsProduto || dsProduto.trim() === "") return;
                    
                    const item = {
                      index: parseInt(index),
                      produto: {
                        coSeqProduto: getFieldValue(`dispensacaoForm:itens:${index}:item_produto_coSeqProduto`),
                        dsProduto: dsProduto.trim()
                      },
                      qtDose: getFieldValue(`dispensacaoForm:itens:${index}:item_qtDose`),
                      unidadeConsumo: getFieldValue(`dispensacaoForm:itens:${index}:item_unidadeConsumo`),
                      qtPosologia: getFieldValue(`dispensacaoForm:itens:${index}:item_qtPosologia`),
                      qtDuracaoTratamDia: getFieldValue(`dispensacaoForm:itens:${index}:item_qtDuracaoTratamDia`),
                      nuDiasDispensar: getFieldValue(`dispensacaoForm:itens:${index}:item_nuDiasDispensar`),
                      coStatusTramiteDetalhe: getFieldValue(`dispensacaoForm:itens:${index}:coStatusTramiteDetalhe`),
                      estoqueAtual: (() => {
                        const estoqueEl = document.getElementById(`dispensacaoForm:itens:${index}:estoqueAtual`);
                        return estoqueEl ? estoqueEl.textContent.trim() : null;
                      })()
                    };
                    
                    itens.push(item);
                  });

                  return itens;
                };

                const dados = {
                  // Dados do Estabelecimento e Operador
                  nomeEstabelecimento: getNomeEstabelecimento(),
                  nomeOperador: getNomeOperador(),
                  
                  // Dados do Paciente
                  nuCartaoSus: getFieldValue("dispensacaoForm:nuCartaoSus"),
                  coPaciente: getFieldValue("dispensacaoForm:coPaciente"),
                  noNome: getFieldValue("dispensacaoForm:noNome"),
                  dtNascimento: getFieldValue("dispensacaoForm:dtNascimento"),
                  dsObservacao: getFieldValue("dispensacaoForm:dsObservacao"),
                  
                  // Dados da Receita
                  coSeqOrigemReceita: getFieldValue("dispensacaoForm:coSeqOrigemReceita"),
                  coSubgrupoOrigemReceita: getFieldValue("dispensacaoForm:coSubgrupoOrigemReceita"),
                  coCrmMedico: getFieldValue("dispensacaoForm:coCrmMedico"),
                  medico: getFieldValue("dispensacaoForm:medico"),
                  noPrescritor: getFieldValue("dispensacaoForm:noPrescritor"),
                  nuConselho: getFieldValue("dispensacaoForm:nuConselho"),
                  nuReceita: getFieldValue("dispensacaoForm:nuReceita"),
                  dtReceita: getFieldValue("dispensacaoForm:dtReceitaInputDate"),
                  
                  // Produtos/Itens
                  itens: coletarItensProdutos()
                };

                return dados;
              };

              const isSiteHorus = location.hostname.includes("horus.saude.gov.br") || 
                                   document.getElementById("dispensacaoForm") !== null;

              if (isSiteHorus) {
                const dadosHorus = coletarCamposSiteHorus();
                
                if (dadosHorus) {
                  return {
                    site: "horus.saude.gov.br",
                    url: location.href,
                    tipo: "formulario_dispensacao",
                    dados: dadosHorus,
                    coletadoEm: new Date().toISOString()
                  };
                }
              }

              // Coleta padrão para outros sites
              const h1 = document.querySelector("h1");
              const titulo = h1 ? h1.innerText.replace(/\s+/g, " ").trim() : document.title;
              
              const precoEl = document.querySelector("[itemprop='price'], [class*='price'], #priceblock_ourprice, #priceblock_dealprice");
              let preco = null;
              if (precoEl) {
                const match = precoEl.innerText.match(/[\d,.]+/);
                preco = match ? match[0].replace(",", ".") : null;
              }

              const body = document.body.innerText.toLowerCase();
              let disponibilidade = "Não informado";
              if (body.includes("em estoque")) disponibilidade = "Em estoque";
              else if (body.includes("esgotado") || body.includes("indisponível")) disponibilidade = "Indisponível";

              return {
                site: location.hostname,
                url: location.href,
                titulo: titulo,
                preco: preco,
                moeda: body.includes("r$") ? "BRL" : null,
                disponibilidade: disponibilidade,
                coletadoEm: new Date().toISOString()
              };
            }
          });

          if (resultados && resultados[0] && resultados[0].result) {
            const coleta = resultados[0].result;
            await chrome.storage.local.set({ ultimaColeta: coleta });
            
            btnColetar.disabled = false;
            btnColetar.textContent = "Coletar dados";
            mostrarResultado(coleta);
            alert("✅ Dados coletados com sucesso!");
          } else {
            throw new Error("Nenhum dado foi coletado");
          }
        } catch (error) {
          btnColetar.disabled = false;
          btnColetar.textContent = "Coletar dados";
          alert("❌ Erro ao coletar dados: " + error.message);
        }
      };

      // Tenta primeiro enviar mensagem ao content script
      try {
        chrome.tabs.sendMessage(tab.id, { action: "coletarDados" }, async (response) => {
          if (chrome.runtime.lastError) {
            // Se falhar, executa diretamente
            await executarColeta();
          } else if (response && response.sucesso) {
            btnColetar.disabled = false;
            btnColetar.textContent = "Coletar dados";
            chrome.storage.local.get("ultimaColeta", ({ ultimaColeta }) => {
              if (ultimaColeta) {
                mostrarResultado(ultimaColeta);
                alert("✅ Dados coletados com sucesso!");
              }
            });
          } else {
            await executarColeta();
          }
        });
      } catch (error) {
        // Se houver erro, executa diretamente
        await executarColeta();
      }
    } catch (error) {
      btnColetar.disabled = false;
      btnColetar.textContent = "Coletar dados";
      alert("❌ Erro: " + error.message);
    }
  });

  // Escuta mensagens do content script sobre coleta realizada
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "coletaRealizada" && request.sucesso) {
      // Atualiza a exibição quando coleta automática é realizada
      chrome.storage.local.get("ultimaColeta", ({ ultimaColeta }) => {
        if (ultimaColeta) {
          mostrarResultado(ultimaColeta);
        }
      });
    }
    
    // Escuta mensagens do background sobre envio automático
    if (request.action === "dadosEnviadosAutomaticamente") {
      chrome.storage.local.get("ultimaColeta", ({ ultimaColeta }) => {
        if (ultimaColeta) {
          // Mostra o modal com os dados e o resultado do envio automático
          mostrarModal(ultimaColeta, request.resultado);
        }
      });
    }
    
    sendResponse({ recebido: true });
  });

  /* =========================
     SALVAR NO SUPABASE
  ========================= */
  btnSalvar.addEventListener("click", async () => {
    chrome.storage.local.get("ultimaColeta", async ({ ultimaColeta }) => {
      if (!ultimaColeta) {
        alert("❌ Nenhum dado para salvar");
        return;
      }

      // Mostra o modal com os dados coletados ANTES de salvar
      mostrarModal(ultimaColeta);

      try {
        // Envia para o Supabase usando a função compartilhada
        const resultado = await enviarParaSupabase(ultimaColeta);
        
        // Atualiza o modal com o resultado
        mostrarModal(ultimaColeta, resultado);
        
        if (!resultado.sucesso) {
          console.error("❌ Erro ao salvar:", resultado.erro);
        } else {
          console.log("✅ Dados salvos:", resultado.mensagem);
        }
      } catch (error) {
        console.error("❌ Erro geral:", error);
        mostrarModal(ultimaColeta, { 
          sucesso: false, 
          erro: "Erro ao salvar: " + error.message 
        });
      }
    });
  });

  /* =========================
     SALVAR COMO JSON
  ========================= */
  const btnSalvarJson = document.getElementById("salvarJson");
  btnSalvarJson.addEventListener("click", () => {
    chrome.storage.local.get("ultimaColeta", ({ ultimaColeta }) => {
      if (!ultimaColeta) {
        alert("❌ Nenhum dado para salvar");
        return;
      }

      const jsonString = JSON.stringify(ultimaColeta, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `coleta_${timestamp}.json`;
      
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert("✅ Arquivo JSON salvo com sucesso!");
    });
  });

  /* =========================
     LIMPAR
  ========================= */
  btnLimpar.addEventListener("click", () => {
    chrome.storage.local.remove("ultimaColeta", () => {
      resultadoEl.textContent = "Coleta limpa.";
    });
  });
});
