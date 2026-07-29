/**
 * Coleta de dispensação Hórus — lógica pura DOM (sem APIs Chrome).
 * Carregado antes de scrape_universal.js como content script.
 */
(function () {
  function formatarTexto(str) {
    if (!str) return null;
    const t = String(str).replace(/\s+/g, " ").trim();
    return t || null;
  }

  function getFieldValue(id) {
    const field = document.getElementById(id);
    if (!field) return null;

    if (field.tagName === "SELECT") {
      const selectedOption = field.options[field.selectedIndex];
      return {
        value: field.value,
        text: selectedOption ? selectedOption.text : null,
      };
    }

    if (field.tagName === "TEXTAREA") {
      const v = field.value;
      return v && String(v).trim() !== "" ? String(v).trim() : null;
    }

    const valor = field.value;
    return valor && String(valor).trim() !== ""
      ? String(valor).trim()
      : null;
  }

  function getNomeOperador() {
    const tabelaNavegacao = document.getElementById("navegacao");
    if (!tabelaNavegacao) return null;

    for (const celula of tabelaNavegacao.querySelectorAll("td")) {
      const texto = celula.textContent || celula.innerText;
      if (texto && texto.includes("Operador:")) {
        const match = texto.match(/Operador:\s*(.+)/i);
        if (match && match[1]) return formatarTexto(match[1]);
      }
    }
    return null;
  }

  function getNomeEstabelecimento() {
    const tabelaNavegacao = document.getElementById("navegacao");
    if (!tabelaNavegacao) return null;

    for (const celula of tabelaNavegacao.querySelectorAll("td")) {
      const texto = celula.textContent || celula.innerText;
      if (
        texto &&
        (texto.includes("Estabelecimentos") ||
          texto.includes("Estabelecimento"))
      ) {
        const match = texto.match(
          /Estabelecimentos?\s*(?:de\s*Saúde)?:?\s*(.+)/i
        );
        if (match && match[1]) return formatarTexto(match[1]);
      }
    }
    return null;
  }

  function getEstoqueAtual(index) {
    const estoqueEl = document.getElementById(
      `dispensacaoForm:itens:${index}:estoqueAtual`
    );
    return estoqueEl ? estoqueEl.textContent.trim() : null;
  }

  function coletarItensProdutos() {
    const itens = [];
    const table = document.getElementById("dispensacaoForm:itens");
    if (!table) return itens;

    const produtoFields = document.querySelectorAll(
      '[id^="dispensacaoForm:itens:"][id*=":item_produto_dsProduto"]'
    );

    produtoFields.forEach((produtoField) => {
      const idMatch = produtoField.id.match(/dispensacaoForm:itens:(\d+):/);
      if (!idMatch) return;

      const index = idMatch[1];
      const dsProduto = produtoField.value || produtoField.textContent;
      if (!dsProduto || String(dsProduto).trim() === "") return;

      itens.push({
        index: parseInt(index, 10),
        produto: {
          coSeqProduto: getFieldValue(
            `dispensacaoForm:itens:${index}:item_produto_coSeqProduto`
          ),
          dsProduto: String(dsProduto).trim(),
        },
        qtDose: getFieldValue(`dispensacaoForm:itens:${index}:item_qtDose`),
        unidadeConsumo: getFieldValue(
          `dispensacaoForm:itens:${index}:item_unidadeConsumo`
        ),
        qtPosologia: getFieldValue(
          `dispensacaoForm:itens:${index}:item_qtPosologia`
        ),
        qtDuracaoTratamDia: getFieldValue(
          `dispensacaoForm:itens:${index}:item_qtDuracaoTratamDia`
        ),
        nuDiasDispensar: getFieldValue(
          `dispensacaoForm:itens:${index}:item_nuDiasDispensar`
        ),
        coStatusTramiteDetalhe: getFieldValue(
          `dispensacaoForm:itens:${index}:coStatusTramiteDetalhe`
        ),
        estoqueAtual: getEstoqueAtual(index),
      });
    });

    return itens;
  }

  function coletarCamposSiteHorus() {
    const form = document.getElementById("dispensacaoForm");
    if (!form) return null;

    return {
      nomeEstabelecimento: getNomeEstabelecimento(),
      nomeOperador: getNomeOperador(),
      nuCartaoSus: getFieldValue("dispensacaoForm:nuCartaoSus"),
      coPaciente: getFieldValue("dispensacaoForm:coPaciente"),
      noNome: getFieldValue("dispensacaoForm:noNome"),
      dtNascimento: getFieldValue("dispensacaoForm:dtNascimento"),
      dsObservacao: getFieldValue("dispensacaoForm:dsObservacao"),
      coSeqOrigemReceita: getFieldValue("dispensacaoForm:coSeqOrigemReceita"),
      coSubgrupoOrigemReceita: getFieldValue(
        "dispensacaoForm:coSubgrupoOrigemReceita"
      ),
      coCrmMedico: getFieldValue("dispensacaoForm:coCrmMedico"),
      medico: getFieldValue("dispensacaoForm:medico"),
      noPrescritor: getFieldValue("dispensacaoForm:noPrescritor"),
      nuConselho: getFieldValue("dispensacaoForm:nuConselho"),
      nuReceita: getFieldValue("dispensacaoForm:nuReceita"),
      dtReceita: getFieldValue("dispensacaoForm:dtReceitaInputDate"),
      itens: coletarItensProdutos(),
    };
  }

  function coletarDispensacaoHorus() {
    const host = location.hostname || "";
    const isHorus =
      host.includes("horus.saude.gov.br") ||
      document.getElementById("dispensacaoForm") !== null;

    if (!isHorus) {
      throw new Error(
        "Esta página não é o Hórus. Abra horus.saude.gov.br na tela de dispensação."
      );
    }

    const dados = coletarCamposSiteHorus();
    if (!dados) {
      throw new Error(
        "Formulário de dispensação não encontrado. Abra uma dispensação no Hórus (dispensacao.jsf) e clique em Coletar novamente."
      );
    }

    if (!dados.coPaciente) {
      throw new Error(
        "Paciente não identificado (coPaciente vazio). Selecione o paciente na dispensação antes de coletar."
      );
    }

    return {
      site: "horus.saude.gov.br",
      url: location.href,
      tipo: "formulario_dispensacao",
      dados,
      coletadoEm: new Date().toISOString(),
    };
  }

  const root =
    typeof window !== "undefined"
      ? window
      : typeof globalThis !== "undefined"
        ? globalThis
        : this;
  root.__coletorHorusColetar = coletarDispensacaoHorus;
})();
