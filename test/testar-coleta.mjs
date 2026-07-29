#!/usr/bin/env node
/**
 * Teste local da coleta Hórus — sem instalar a extensão no Chrome.
 *
 * Uso:
 *   npm run test:coleta
 *
 * Carrega SiteHorus.html (snapshot real), executa coleta-horus.js e valida campos.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "SiteHorus.html");
const coletaPath = path.join(root, "coleta-horus.js");

function fail(msg) {
  console.error("❌", msg);
  process.exitCode = 1;
}

function ok(msg) {
  console.log("✅", msg);
}

function assert(cond, msg) {
  if (!cond) fail(msg);
  else ok(msg);
}

async function main() {
  if (!fs.existsSync(htmlPath)) {
    fail(`Arquivo não encontrado: ${htmlPath}`);
    return;
  }
  if (!fs.existsSync(coletaPath)) {
    fail(`Arquivo não encontrado: ${coletaPath}`);
    return;
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const coletaSrc = fs.readFileSync(coletaPath, "utf8");

  // Remove scripts/handlers embutidos do snapshot — só precisamos do DOM dos campos
  const htmlLimpo = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  const dom = new JSDOM(htmlLimpo, {
    url: "https://horus.saude.gov.br/horus/paginas/dispensacao/dispensacao.jsf",
    contentType: "text/html",
    pretendToBeVisual: true,
    runScripts: "dangerously",
  });

  const { window } = dom;
  const { document } = window;

  // Injeta o script no contexto do window (mesmo ambiente da extensão)
  const scriptEl = document.createElement("script");
  scriptEl.textContent = coletaSrc;
  document.documentElement.appendChild(scriptEl);

  console.log("\n=== Teste local de coleta (SiteHorus.html) ===\n");

  assert(
    typeof window.__coletorHorusColetar === "function",
    "window.__coletorHorusColetar foi definido"
  );
  assert(
    document.getElementById("dispensacaoForm") !== null,
    "Formulário #dispensacaoForm presente no HTML"
  );
  assert(
    document.getElementById("dispensacaoForm:coPaciente")?.value === "12421045",
    "Campo coPaciente = 12421045"
  );

  let coleta;
  try {
    coleta = window.__coletorHorusColetar();
  } catch (e) {
    fail(`Coleta lançou erro: ${e.message}`);
    return;
  }

  assert(coleta?.tipo === "formulario_dispensacao", "tipo = formulario_dispensacao");
  assert(coleta?.site === "horus.saude.gov.br", "site = horus.saude.gov.br");
  assert(
    String(coleta?.url || "").includes("horus.saude.gov.br"),
    "url aponta para Hórus"
  );
  assert(coleta?.dados?.coPaciente === "12421045", "dados.coPaciente coletado");
  assert(coleta?.dados?.noNome === "JOAO TESTE", "dados.noNome coletado");
  assert(
    coleta?.dados?.nuCartaoSus === "700005452554607",
    "dados.nuCartaoSus coletado"
  );
  assert(
    Array.isArray(coleta?.dados?.itens) && coleta.dados.itens.length >= 1,
    `itens coletados (>=1): ${coleta?.dados?.itens?.length ?? 0}`
  );

  const item0 = coleta.dados.itens[0];
  assert(
    String(item0?.produto?.dsProduto || "").includes("CARISOPRODOL"),
    "item[0].produto.dsProduto contém CARISOPRODOL"
  );
  assert(item0?.qtDose === "1,00" || item0?.qtDose === "1.00", `item[0].qtDose = ${item0?.qtDose}`);

  console.log("\n--- Preview da coleta ---");
  console.log(
    JSON.stringify(
      {
        site: coleta.site,
        tipo: coleta.tipo,
        paciente: coleta.dados.coPaciente,
        nome: coleta.dados.noNome,
        receita: coleta.dados.nuReceita,
        itens: coleta.dados.itens.map((i) => ({
          index: i.index,
          produto: i.produto?.dsProduto,
          qtDose: i.qtDose,
        })),
      },
      null,
      2
    )
  );

  if (process.exitCode) {
    console.log("\n❌ Teste FALHOU — não envie a extensão ainda.\n");
    process.exit(1);
  } else {
    console.log(
      "\n✅ Teste OK — a lógica de coleta funciona no HTML do Hórus.\n"
    );
    console.log(
      "Próximo passo no navegador: recarregar a extensão (v1.1.3), F5 no Hórus, abrir dispensação, Coletar.\n"
    );
    process.exit(0);
  }
}

main().catch((e) => {
  fail(e.stack || e.message);
});
