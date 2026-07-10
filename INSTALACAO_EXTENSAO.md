# Instalação da Extensão v1.1.0 (Banco A na VPS)

## Acesso à API

A extensão grava em:

- **URL:** `http://116.202.27.216/api/horus`
- **Chave:** `ANON_KEY` do `/opt/supabase/.env` na VPS

O caminho `/api/horus` passa pela porta **80** (acessível externamente) e é encaminhado internamente ao PostgREST do Supabase.

## Instalar no Chrome

1. Abra `chrome://extensions`
2. Ative **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `Coletor de dados Horus/`
5. Confirme versão **1.1.0**

## Testar

1. Acesse `horus.saude.gov.br` e abra uma dispensação
2. Use **Coletar dados** → **Salvar no banco**
3. Verifique na VPS: tabela `a001_dispensacoes`

Teste manual da API (qualquer máquina):

```bash
curl -s "http://116.202.27.216/api/horus/rest/v1/a001_dispensacoes?limit=1" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

## Após alterar código

```bash
cd "Coletor de dados Horus"
npm run build
```

Recarregue a extensão no Chrome.
