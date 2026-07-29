# Instalação da Extensão v1.3.0 (Banco A na VPS)

## Acesso à API

A extensão grava em:

- **URL base:** `http://116.202.27.216/api/horus/` (**barra final obrigatória**)
- **Chave:** `ANON_KEY` do `/opt/supabase/.env` na VPS

## Instalar / atualizar no Chrome

1. Abra `chrome://extensions`
2. Ative **Modo do desenvolvedor**
3. **Carregar sem compactação** → pasta `Coletor de dados Horus/` (ou `release/Coletor de dados Horus/`)
4. Confirme versão **1.3.0**
5. **Recarregue a aba do Hórus (F5)** após instalar/atualizar

## Uso

A extensão funciona **automaticamente**, sem menu ou botões.

Ao clicar em **Dispensar todos automaticamente** no Hórus, ela coleta os dados da dispensação e envia para o Banco A na VPS.

## Após alterar código

```bash
cd "Coletor de dados Horus"
npm run check
npm run build
npm run pack
```
