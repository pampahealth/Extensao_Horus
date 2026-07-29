import { enviarParaSupabase } from "./supabase-utils.js";

chrome.runtime.onInstalled.addListener(() => {
  console.log("✅ Coletor Universal de Produtos instalado");
});

// NÃO usar async diretamente no listener — o return true precisa ser síncrono
// para o Chrome manter o canal aberto até sendResponse.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "coletaAutomaticaRealizada") {
    return false;
  }

  console.log("📦 Coleta automática detectada, enviando para Supabase...");

  (async () => {
    try {
      const { ultimaColeta } = await chrome.storage.local.get("ultimaColeta");

      if (!ultimaColeta) {
        console.error("❌ Nenhum dado encontrado no storage após coleta automática");
        sendResponse({ sucesso: false, erro: "Nenhum dado encontrado" });
        return;
      }

      const resultado = await enviarParaSupabase(ultimaColeta);

      if (resultado.sucesso) {
        console.log(
          "✅ Dados enviados automaticamente para Supabase:",
          resultado.mensagem
        );
      } else {
        console.error(
          "❌ Erro ao enviar dados automaticamente:",
          resultado.erro
        );
      }

      sendResponse(resultado);
    } catch (error) {
      console.error("❌ Erro ao processar coleta automática:", error);
      sendResponse({
        sucesso: false,
        erro: error?.message || String(error),
      });
    }
  })();

  return true;
});
