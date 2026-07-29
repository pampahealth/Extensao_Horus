function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function setUltimaColeta(coleta) {
  return chrome.storage.local.set({ ultimaColeta: coleta });
}

function notifyRuntime(message) {
  try {
    chrome.runtime.sendMessage(message, () => {
      void chrome.runtime.lastError;
    });
  } catch (_) {
    // contexto invalidado
  }
}

async function waitForForm(timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (document.getElementById("dispensacaoForm")) return true;
    await sleep(250);
  }
  return false;
}

async function coletarProdutoUniversal() {
  if (typeof window.__coletorHorusColetar !== "function") {
    throw new Error("Módulo de coleta não carregado. Recarregue a extensão.");
  }

  const host = location.hostname || "";
  if (host.includes("horus.saude.gov.br")) {
    await waitForForm();
  }

  const coleta = window.__coletorHorusColetar();
  await setUltimaColeta(coleta);
  console.log("📦 Dados do SiteHorus coletados:", coleta);
  return coleta;
}

function configurarColetaAutomatica() {
  if (!document.body) return;

  const seletoresBotoes = [
    'button[value*="automatica" i]',
    'button[value*="automática" i]',
    'input[value*="automatica" i]',
    'input[value*="automática" i]',
    'button[id*="automatica" i]',
    'button[id*="automática" i]',
    'input[id*="automatica" i]',
    'input[id*="automática" i]',
  ];

  async function coletarAposClick() {
    console.log("🔍 Dispensação automática detectada, coletando...");
    await sleep(500);
    try {
      await coletarProdutoUniversal();
      notifyRuntime({ action: "coletaAutomaticaRealizada" });
    } catch (error) {
      console.error("❌ Coleta automática falhou:", error);
    }
  }

  function adicionarListeners() {
    seletoresBotoes.forEach((seletor) => {
      try {
        document.querySelectorAll(seletor).forEach((botao) => {
          const textoBotao = (
            botao.value ||
            botao.textContent ||
            botao.innerText ||
            ""
          ).toLowerCase();
          const idBotao = (botao.id || "").toLowerCase();

          if (
            textoBotao.includes("automatica") ||
            textoBotao.includes("automática") ||
            textoBotao.includes("dispensar todos") ||
            idBotao.includes("automatica") ||
            idBotao.includes("automática")
          ) {
            botao.removeEventListener("click", coletarAposClick, true);
            botao.addEventListener("click", coletarAposClick, true);
          }
        });
      } catch (_) {}
    });

    document
      .querySelectorAll('button, input[type="button"], input[type="submit"]')
      .forEach((botao) => {
        const texto = (
          botao.value ||
          botao.textContent ||
          botao.innerText ||
          ""
        ).toLowerCase();
        if (
          texto.includes("dispensar todos automaticamente") ||
          texto.includes("dispensar todos automatica")
        ) {
          botao.removeEventListener("click", coletarAposClick, true);
          botao.addEventListener("click", coletarAposClick, true);
        }
      });
  }

  adicionarListeners();
  new MutationObserver(() => adicionarListeners()).observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", configurarColetaAutomatica);
} else {
  configurarColetaAutomatica();
}
