# Locus — PROJECT_CONTEXT

## Visão geral
**Locus** é um hub imobiliário (mobile) com foco em conectar vendedores e compradores com uma experiência estilo “map-first” (Airbnb), mostrando imóveis no mapa e uma lista abaixo.

## Stack
- React Native (Expo)
- Expo Router (rotas por pastas)
- Firebase Auth + Firestore

## Rotas (estrutura)
- `app/(auth)/`
  - `login.tsx`
  - `register.tsx`
  - `_layout.tsx`
- `app/(onboarding)/`
  - `index.tsx` (2 etapas: funções + local)
  - `_layout.tsx`
- `app/(tabs)/`
  - `index.tsx` (Home)
  - `explore.tsx` (pode virar pasta depois)
  - `profile/`
    - `_layout.tsx`
    - `index.tsx`
    - `preferencias.tsx`

## Regras do produto (MVP)
- Usuário pode ser:
  - **Comprador**
  - **Vendedor**
  - **Ambos**
- Onboarding captura intenção e localização preferida (UF + Cidade).
- Home padrão (para comprador/ambos/pulado): **mapa em cima + lista de imóveis abaixo**.
- Para vendedor-only: planejar home diferente depois (ex: CTA “Criar anúncio”, “Meus imóveis”, insights).

## Firebase / Firestore — padrão em Português
**Importante:** tudo no Firestore em **português**, sem acentos e sem espaços (ex.: `nomeCompleto`, `precoCentavos`, `criadoEm`).

### Coleções
- `usuarios/{uid}`
- `imoveis/{imovelId}`

### Documento `usuarios/{uid}` (principal)
Campos esperados:
- `primeiroNome` (string)
- `sobrenome` (string)
- `nomeCompleto` (string)
- `telefone` (string | null) — WhatsApp
- `email` (string)
- `funcoes`:
  - `comprador` (boolean)
  - `vendedor` (boolean)
- `preferencias`:
  - `uf` (string, ex: "SC")
  - `cidade` (string, ex: "Barra Velha")
  - `estadoNome` (string | null)
  - `idEstado` (number | null) — IBGE
  - `idMunicipio` (number | null) — IBGE
- `onboardingConcluido` (boolean)
- `onboardingPulado` (boolean)
- `criadoEm` (serverTimestamp)
- `atualizadoEm` (serverTimestamp)

### Documento `imoveis/{imovelId}` (MVP)
Campos esperados:
- `idDono` (string) — uid do usuário
- `titulo` (string)
- `descricao` (string | opcional)
- `precoCentavos` (number)
- `moeda` ("BRL")
- `tipo` ("casa" | "apartamento" | "terreno")
- `cidade` (string)
- `uf` (string)
- `status` ("rascunho" | "publicado" | "arquivado")
- `imagens` (string[] | opcional)
- `localizacao`:
  - `latitude` (number)
  - `longitude` (number)
  - `geohash` (string) — usado para busca por raio
- `criadoEm` (serverTimestamp)
- `atualizadoEm` (serverTimestamp)

## Auth Guard (Root)
No `app/_layout.tsx`:
- Não logado → `/(auth)/login`
- Logado e `onboardingConcluido !== true` → `/(onboarding)`
- Logado e onboarding ok → `/(tabs)`

## Login / Migração automática
Após login:
- Garantir que exista `usuarios/{uid}`.
- Se existir doc antigo em `users/{uid}`, migrar para `usuarios/{uid}`.

## Onboarding (UF + Cidade)
- UF primeiro (lista IBGE).
- Cidade com autocomplete IBGE filtrado pela UF.
- Cidade deve ser **selecionada da lista** (para consistência).
- Salvar `idEstado` e `idMunicipio` quando possível.

## UI/Estética
- Estilo clean/minimalista.
- Paleta base:
  - `#5A9F78` (verde)
  - `#D7EBDD` (verde claro)
  - `#F8F8F6` (quase branco)
  - `#DADADA` (cinza claro)
  - `#5B5B5B` (cinza escuro)

## Objetivo atual (MVP 1)
1) Home “Airbnb-like”
   - Mapa em cima
   - Lista embaixo
   - Pegar localização do usuário (expo-location)
   - Mostrar imóveis próximos (geohash + geofire-common)
   - Permitir “trocar local” (via Preferências)
2) Criar anúncio
   - salvar no Firestore com `localizacao.geohash`
3) “Meus imóveis”
4) Explore (listagem pública / filtros)

## Preferência de implementação
- Sempre priorizar o caminho mais “MVP + escalável”.
- Manter consistência: nomes pt-BR no Firestore.
- Mostrar diffs claros e evitar refactor desnecessário.