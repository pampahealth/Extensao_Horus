import { enviarParaSupabase } from "./supabase-utils.js";

chrome.runtime.onInstalled.addListener(() => {
  console.log("✅ Coletor Universal de Produtos instalado");
});

// Escuta mensagens do content script sobre coleta automática
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "coletaAutomaticaRealizada") {
    console.log("📦 Coleta automática detectada, enviando para Supabase...");
    
    try {
      // Busca os dados coletados do storage
      const { ultimaColeta } = await chrome.storage.local.get("ultimaColeta");
      
      if (!ultimaColeta) {
        console.error("❌ Nenhum dado encontrado no storage após coleta automática");
        sendResponse({ sucesso: false, erro: "Nenhum dado encontrado" });
        return;
      }

      // Envia para o Supabase
      const resultado = await enviarParaSupabase(ultimaColeta);
      
      if (resultado.sucesso) {
        console.log("✅ Dados enviados automaticamente para Supabase:", resultado.mensagem);
        // Notifica todas as abas do popup (se estiver aberto)
        chrome.runtime.sendMessage({
          action: "dadosEnviadosAutomaticamente",
          resultado: resultado
        }).catch(() => {
          // Ignora erro se popup não estiver aberto
        });
      } else {
        console.error("❌ Erro ao enviar dados automaticamente:", resultado.erro);
      }
      
      sendResponse(resultado);
    } catch (error) {
      console.error("❌ Erro ao processar coleta automática:", error);
      sendResponse({ sucesso: false, erro: error.message });
    }
    
    return true; // Indica resposta assíncrona
  }
  
  return false;
});
