# ATCPCD — Avaliação BPC/LOAS da Pessoa com Deficiência

Aplicação web para **preenchimento pericial dos laudos social e médico** da avaliação da
pessoa com deficiência requerente do **Benefício de Prestação Continuada (BPC/LOAS)**, com
geração do **laudo em PDF** conforme os quesitos e qualificadores.

Base normativa: **Portaria Conjunta MDS/INSS nº 2, de 30 de março de 2015** (Anexos I a IV).

> Ferramenta de apoio ao preenchimento. As pontuações e a conclusão seguem os Anexos III
> (cálculo) e IV (Tabela Conclusiva) da Portaria. Confira sempre os dados antes de assinar.

## Escopo

- **Anexo I** — Espécie 87, BPC/LOAS, **16 anos ou mais** (127 quesitos).
- **Anexo II** — Espécie 87, BPC/LOAS, **menor de 16 anos** (129 quesitos), com corte etário
  automático nos domínios de Atividades e Participação (Anexo III).
- Preenchimento do **laudo social** (Assistente Social) e do **laudo médico-pericial** (Perito Médico).
- **Não** há upload de laudos nem geração de certidão — apenas os formulários de preenchimento
  pelos peritos e a geração do PDF.

## Como funciona o cálculo (Anexo III / IV)

Cada **unidade de classificação (quesito)** recebe um qualificador de 0 a 4
(`0=N Nenhuma`, `1=L Leve`, `2=M Moderada`, `3=G Grave`, `4=C Completa`).

- **Qualificador do domínio**: maior qualificador entre suas unidades (editável pelo perito);
  no Anexo II, idade inferior ao corte etário do domínio força `4 = Completa`.
- **Fatores Ambientais (e)**: `[(e1+e2+e3+e4+e5) × 5] − 0,1` → percentual → letra.
- **Atividades e Participação (d)**: `[(d1+…+d9) × 2,7778] − 0,1` → percentual → letra
  (combina os domínios médicos `d1–d5` e sociais `d6–d9`).
- **Funções do Corpo (b)**: maior qualificador entre `b1–b8`, **elevado em um nível**
  (não cumulativo) se houver alteração de Estrutura do Corpo **e/ou** prognóstico desfavorável.
- A combinação **(e, d, b)** é confrontada com a **Tabela Conclusiva de Qualificadores (Anexo IV)**.
- Indefere-se ainda que a tabela conclua "Sim" quando o perito responder que as alterações
  serão **resolvidas em menos de dois anos** (Art. 8º, III).

A faixa percentual → letra: `N 0–4% · L 5–24% · M 25–49% · G 50–95% · C 96–100%`.

## Stack

Vite + React + TypeScript + Tailwind CSS. Sem dependências de PDF: o laudo é gerado como
HTML formatado e impresso pelo navegador (**Salvar como PDF**).

```bash
npm install
npm run dev      # ambiente de desenvolvimento
npm test         # testes do motor de cálculo (Vitest)
npm run build    # build de produção
```

## Dados do instrumento

Os quesitos em `src/lib/instrument-data.ts` são **gerados automaticamente** a partir do texto
da Portaria. Os scripts de extração estão em `scripts/` (`parse_portaria.py` lê o texto extraído
do PDF da Portaria; `gen_ts.py` emite o arquivo TypeScript). Não edite `instrument-data.ts`
manualmente — regenere pelos scripts.
