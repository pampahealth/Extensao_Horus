function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function formatarTexto(str) {
  if (!str) return "-";
  return str.replace(/\s+/g, " ").trim();
}

async function waitForAny(selectors, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const sel of selectors) {
      if (document.querySelector(sel)) return true;
    }
    await sleep(200);
  }
  return false;
}

function getTitulo() {
  const h1 = document.querySelector("h1");
  return h1 ? formatarTexto(h1.innerText) : document.title;
}

function getPreco() {
  const el = document.querySelector(
    "[itemprop='price'], [class*='price'], #priceblock_ourprice, #priceblock_dealprice"
  );
  if (!el) return null;
  const match = el.innerText.match(/[\d,.]+/);
  return match ? match[0].replace(",", ".") : null;
}

function getDisponibilidade() {
  const body = document.body.innerText.toLowerCase();
  if (body.includes("em estoque")) return "Em estoque";
  if (body.includes("esgotado") || body.includes("indisponível")) return "Indisponível";
  return "Não informado";
}

function coletarCamposSiteHorus() {
  const form = document.getElementById("dispensacaoForm");
  if (!form) return null;

  const dados = {
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
}

function getFieldValue(id) {
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
  
  return field.value || null;
}

function coletarItensProdutos() {
  const itens = [];
  const table = document.getElementById("dispensacaoForm:itens");
  if (!table) return itens;

  // Procura por todos os campos de produto para identificar os índices reais
  const produtoFields = document.querySelectorAll('[id^="dispensacaoForm:itens:"][id*=":item_produto_dsProduto"]');
  
  produtoFields.forEach((produtoField) => {
    // Extrai o índice do ID (formato: dispensacaoForm:itens:0:item_produto_dsProduto)
    const idMatch = produtoField.id.match(/dispensacaoForm:itens:(\d+):/);
    if (!idMatch) return;
    
    const index = idMatch[1];
    const dsProduto = produtoField.value || produtoField.textContent;
    
    // Só processa se tiver produto preenchido
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
      estoqueAtual: getEstoqueAtual(index)
    };
    
    itens.push(item);
  });

  return itens;
}

function getEstoqueAtual(index) {
  const estoqueEl = document.getElementById(`dispensacaoForm:itens:${index}:estoqueAtual`);
  return estoqueEl ? estoqueEl.textContent.trim() : null;
}

async function coletarProdutoUniversal() {
  // Verifica se é a página do SiteHorus
  const isSiteHorus = location.hostname.includes("horus.saude.gov.br") || 
                       document.getElementById("dispensacaoForm") !== null;

  if (isSiteHorus) {
    // Aguarda o formulário estar disponível
    await waitForAny(["#dispensacaoForm", "form[id*='dispensacaoForm']"]);
    
    const dadosHorus = coletarCamposSiteHorus();
    
    if (dadosHorus) {
      const coleta = {
        site: "horus.saude.gov.br",
        url: location.href,
        tipo: "formulario_dispensacao",
        dados: dadosHorus,
        coletadoEm: new Date().toISOString()
      };

      chrome.storage.local.set({ ultimaColeta: coleta });
      console.log("📦 Dados do SiteHorus coletados:", coleta);
      
      // Notifica o popup que a coleta foi realizada
      chrome.runtime.sendMessage({ 
        action: "coletaRealizada", 
        sucesso: true 
      });
      
      return;
    }
  }

  // Coleta padrão para outros sites
  await waitForAny(["h1", "[class*='price']"]);

  const produto = {
    site: location.hostname,
    url: location.href,
    titulo: getTitulo(),
    preco: getPreco(),
    moeda: document.body.innerText.includes("R$") ? "BRL" : null,
    disponibilidade: getDisponibilidade(),
    coletadoEm: new Date().toISOString()
  };

  chrome.storage.local.set({ ultimaColeta: produto });
  console.log("📦 Produto coletado:", produto);
  
  // Notifica o popup que a coleta foi realizada
  chrome.runtime.sendMessage({ 
    action: "coletaRealizada", 
    sucesso: true 
  });
}

// Função para detectar e coletar automaticamente quando botão de dispensar é clicado
function configurarColetaAutomatica() {
  // Lista de seletores para botões relacionados a dispensação automática
  const seletoresBotoes = [
    'button[value*="automatica" i]',
    'button[value*="automática" i]',
    'input[value*="automatica" i]',
    'input[value*="automática" i]',
    'button[id*="automatica" i]',
    'button[id*="automática" i]',
    'input[id*="automatica" i]',
    'input[id*="automática" i]'
  ];

  // Função para adicionar listener aos botões
  function adicionarListeners() {
    seletoresBotoes.forEach(seletor => {
      try {
        const botoes = document.querySelectorAll(seletor);
        botoes.forEach(botao => {
          // Verifica se o texto do botão contém palavras-chave
          const textoBotao = (botao.value || botao.textContent || botao.innerText || '').toLowerCase();
          const idBotao = (botao.id || '').toLowerCase();
          
          if (textoBotao.includes('automatica') || 
              textoBotao.includes('automática') ||
              textoBotao.includes('dispensar todos') ||
              idBotao.includes('automatica') ||
              idBotao.includes('automática')) {
            
            // Remove listener anterior se existir
            botao.removeEventListener('click', coletarAposClick);
            // Adiciona novo listener
            botao.addEventListener('click', coletarAposClick, true);
          }
        });
      } catch (e) {
        // Ignora erros de seletor inválido
      }
    });

    // Também procura por botões com texto específico
    const todosBotoes = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
    todosBotoes.forEach(botao => {
      const texto = (botao.value || botao.textContent || botao.innerText || '').toLowerCase();
      if (texto.includes('dispensar todos automaticamente') || 
          texto.includes('dispensar todos automatica')) {
        botao.removeEventListener('click', coletarAposClick);
        botao.addEventListener('click', coletarAposClick, true);
      }
    });
  }

  // Função que será chamada quando o botão for clicado
  async function coletarAposClick(event) {
    console.log("🔍 Botão de dispensação automática detectado, coletando dados...");
    // Aguarda um pouco para garantir que os dados estejam atualizados
    await sleep(500);
    await coletarProdutoUniversal();
    
    // Notifica o background script para enviar automaticamente ao Supabase
    try {
      chrome.runtime.sendMessage({ 
        action: "coletaAutomaticaRealizada" 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Erro ao notificar background:", chrome.runtime.lastError);
        } else if (response && response.sucesso) {
          console.log("✅ Dados enviados automaticamente para Supabase!");
        } else if (response && !response.sucesso) {
          console.error("❌ Erro ao enviar dados automaticamente:", response.erro);
        }
      });
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem para background:", error);
    }
  }

  // Adiciona listeners inicialmente
  adicionarListeners();

  // Observa mudanças no DOM para adicionar listeners a novos botões
  const observer = new MutationObserver(() => {
    adicionarListeners();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Escuta mensagens do popup para coleta manual
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "coletarDados") {
    // Executa a coleta de forma assíncrona
    (async () => {
      try {
        await coletarProdutoUniversal();
        sendResponse({ sucesso: true });
      } catch (error) {
        console.error("Erro ao coletar dados:", error);
        sendResponse({ sucesso: false, erro: error.message });
      }
    })();
    return true; // Indica que a resposta será assíncrona
  }
  return false;
});

// Configura coleta automática quando a página carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    configurarColetaAutomatica();
  });
} else {
  configurarColetaAutomatica();
}
