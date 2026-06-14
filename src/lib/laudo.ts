// Geração do laudo pericial em HTML para impressão / Salvar como PDF (window.print).

import type {
  AnexoId, Domain, ScoreMap, DomainOverride,
  Identificacao, AvaliacaoSocialExtra, AvaliacaoMedicaExtra, Letter,
} from './types';
import {
  getDomains, domainQualifier, LETTER_NAMES, type AvaliacaoResultado,
} from './engine';

export interface LaudoParams {
  anexo: AnexoId;
  ident: Identificacao;
  social: AvaliacaoSocialExtra;
  medical: AvaliacaoMedicaExtra;
  scores: ScoreMap;
  override: DomainOverride;
  ageMonths: number | null;
  result: AvaliacaoResultado;
}

const QUAL_NAME = ['Nenhuma', 'Leve', 'Moderada', 'Grave', 'Completa'];

function esc(s: string): string {
  return (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}

function nl(s: string): string {
  return esc(s).replace(/\n/g, '<br>');
}

function letterBadge(l: Letter): string {
  return `${l} — ${LETTER_NAMES[l]}`;
}

function row(label: string, value: string): string {
  return `<tr><th>${esc(label)}</th><td>${value || '—'}</td></tr>`;
}

function renderDomainTable(
  domain: Domain, scores: ScoreMap, override: DomainOverride, ageMonths: number | null,
): string {
  const dq = domainQualifier(domain, scores, override, ageMonths);
  const auto = domain.minAgeMonths !== undefined && ageMonths !== null && ageMonths < domain.minAgeMonths;
  const rows = domain.units.map((u) => {
    const s = scores[u.n];
    const val = s === undefined ? '—' : `${s} (${QUAL_NAME[s]})`;
    return `<tr><td class="n">${u.n}</td><td>${esc(u.text)}</td><td class="q">${val}</td></tr>`;
  }).join('');
  return `
    <div class="domain">
      <h4>${esc(domain.roman)} — ${esc(domain.title)} <span class="grp">[${domain.group}]</span></h4>
      <table class="units">
        <thead><tr><th class="n">Nº</th><th>Unidade de classificação (quesito)</th><th class="q">Qualif.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="domq">Qualificador do domínio ${domain.group}: <strong>${dq} (${QUAL_NAME[dq]})</strong>${auto ? ' — atribuição automática por corte etário (idade inferior ao mínimo do domínio).' : ''}</p>
    </div>`;
}

function renderEvaluation(
  title: string, evaluator: 'social' | 'medical', domains: Domain[],
  scores: ScoreMap, override: DomainOverride, ageMonths: number | null,
): string {
  const ds = domains.filter((d) => d.evaluator === evaluator);
  const byComp: Record<string, Domain[]> = {};
  for (const d of ds) (byComp[d.component] ||= []).push(d);
  const compTitle: Record<string, string> = {
    FA: 'Fatores Ambientais', AP: 'Atividades e Participação', FC: 'Funções do Corpo',
  };
  const sections = Object.entries(byComp).map(([comp, list]) =>
    `<h3>${compTitle[comp]}</h3>${list.map((d) => renderDomainTable(d, scores, override, ageMonths)).join('')}`,
  ).join('');
  return `<section class="eval"><h2>${esc(title)}</h2>${sections}</section>`;
}

export function buildLaudoHtml(p: LaudoParams): string {
  const domains = getDomains(p.anexo);
  const anexoLabel = p.anexo === 'a1'
    ? 'Espécie 87 — BPC/LOAS — 16 anos ou mais (Anexo I)'
    : 'Espécie 87 — BPC/LOAS — menor de 16 anos (Anexo II)';
  const r = p.result;

  const ident = `
    <table class="kv">
      ${row('Fase da avaliação', esc(p.ident.fase))}
      ${row('Nome do avaliado', esc(p.ident.nome))}
      ${row('NIT', esc(p.ident.nit))}
      ${row('CPF', esc(p.ident.cpf))}
      ${row('NB / Espécie', esc(p.ident.nb))}
      ${row('Nome da mãe', esc(p.ident.nomeMae))}
      ${row('Sexo', esc(p.ident.sexo))}
      ${row('Data de nascimento', esc(p.ident.dataNascimento))}
      ${p.anexo === 'a2' ? row('Idade (meses)', esc(p.ident.idadeMeses)) : ''}
      ${row('Grau de instrução', esc(p.ident.grauInstrucao))}
      ${row('Data da avaliação social', esc(p.ident.dataAvaliacaoSocial))}
      ${row('Data da avaliação médico-pericial', esc(p.ident.dataAvaliacaoMedica))}
      ${row('APS', esc(p.ident.aps))}
      ${row('GEX', esc(p.ident.gex))}
    </table>`;

  const social = `
    <section class="eval">
      <h2>Avaliação Social da Pessoa com Deficiência</h2>
      <table class="kv">
        ${row('História social', nl(p.social.historiaSocial))}
      </table>
    </section>
    ${renderEvaluation('Avaliação Social — Quesitos e Qualificadores', 'social', domains, p.scores, p.override, p.ageMonths)}
    <section class="eval">
      <table class="kv">
        ${row('Observações do(a) avaliador(a)', nl(p.social.observacoes))}
        ${row('Assistente Social', esc(p.social.assistenteSocial))}
        ${row('CRESS', esc(p.social.cress))}
        ${row('Local e data', esc(p.social.localData))}
      </table>
    </section>`;

  const prognosticoLabel = { nao: 'Não', nao_possivel: 'Não é possível prognosticar', sim: 'Sim' }[p.medical.prognostico];
  const resolucaoLabel = {
    nao: 'Não',
    nao_prever: 'Não é possível prever, mas os efeitos podem se estender por dois anos ou mais',
    sim: 'Sim',
  }[p.medical.resolucao2anos];

  const medical = `
    <section class="eval">
      <h2>Avaliação Médico-Pericial da Pessoa com Deficiência</h2>
      <table class="kv">
        ${row('História clínica', nl(p.medical.historiaClinica))}
        ${row('Informações de exames e laudos apresentados', nl(p.medical.examesLaudos))}
        ${row('Exame físico', nl(p.medical.exameFisico))}
        ${row('CID principal', esc(p.medical.cidPrincipal))}
        ${row('CID secundário(s)', esc(p.medical.cidSecundario))}
      </table>
    </section>
    ${renderEvaluation('Avaliação Médico-Pericial — Quesitos e Qualificadores', 'medical', domains, p.scores, p.override, p.ageMonths)}
    <section class="eval">
      <h3>Estrutura do Corpo, Prognóstico e Resolução</h3>
      <table class="kv">
        ${row('Existem alterações na Estrutura do Corpo que configuram maiores limitações que as de Funções do Corpo?', p.medical.estrutura === 'sim' ? 'Sim' : 'Não')}
        ${p.medical.estrutura === 'sim' ? row('Descrição (estrutura)', nl(p.medical.estruturaDescricao)) : ''}
        ${row('As alterações configuram prognóstico desfavorável?', esc(prognosticoLabel))}
        ${p.medical.prognostico === 'sim' ? row('Descrição (prognóstico)', nl(p.medical.prognosticoDescricao)) : ''}
        ${row('As alterações serão resolvidas em menos de dois anos?', esc(resolucaoLabel))}
        ${p.medical.resolucao2anos === 'sim' ? row('Justificativa (resolução < 2 anos)', nl(p.medical.resolucao2anosJustificativa)) : ''}
      </table>
      <table class="kv">
        ${row('Observações do(a) avaliador(a)', nl(p.medical.observacoes))}
        ${row('Perito Médico', esc(p.medical.peritoMedico))}
        ${row('CRM', esc(p.medical.crm))}
        ${row('Local e data', esc(p.medical.localData))}
      </table>
    </section>`;

  const bGroupCells = Object.keys(r.bGroups).sort().map(
    (g) => `<td><strong>${g}</strong><br>${r.bGroups[g]} (${QUAL_NAME[r.bGroups[g]]})</td>`,
  ).join('');

  const conclusao = `
    <section class="eval conclusao">
      <h2>Conclusão da Avaliação Social e Médico-Pericial</h2>
      <table class="result">
        <tr>
          <th>Fatores Ambientais (e)</th>
          <td>${letterBadge(r.fa.letter)}<br><small>soma e1..e5 = ${r.fa.sum} · ${r.fa.pct.toFixed(1)}%</small></td>
        </tr>
        <tr>
          <th>Atividades e Participação (d)</th>
          <td>${letterBadge(r.ap.letter)}<br><small>soma d1..d9 = ${r.ap.sum} · ${r.ap.pct.toFixed(1)}%</small></td>
        </tr>
        <tr>
          <th>Funções do Corpo (b)</th>
          <td>${letterBadge(r.fc.letter)}<br><small>maior de b1..b8 = ${r.fc.baseLetter}${r.fc.elevated ? ' · elevado 1 nível (Estrutura/Prognóstico)' : ''}</small></td>
        </tr>
      </table>
      <table class="bgroups"><tr>${bGroupCells}</tr></table>
      <div class="decisao ${r.deficiente ? 'sim' : 'nao'}">
        <p><strong>Resultado da Tabela Conclusiva de Qualificadores (Anexo IV):</strong>
          ${r.preenche ? 'preenche' : 'não preenche'} os requisitos pela combinação (e=${r.fa.letter}, d=${r.ap.letter}, b=${r.fc.letter}).</p>
        ${r.preenche && r.resolveEm2Anos ? '<p><strong>Atenção:</strong> indeferido por possibilidade de resolução em menos de dois anos (Art. 8º, III).</p>' : ''}
        <p class="final">${r.deficiente
          ? 'O avaliado <strong>PREENCHE</strong> os requisitos estabelecidos pelo Art. 20, §§ 2º e 10, da Lei nº 8.742/1993, que define pessoa com deficiência para fins de acesso ao BPC.'
          : 'O avaliado <strong>NÃO PREENCHE</strong> os requisitos estabelecidos pelo Art. 20, §§ 2º e 10, da Lei nº 8.742/1993, que define pessoa com deficiência para fins de acesso ao BPC.'}</p>
      </div>
      <table class="kv signatures">
        <tr><th>Assistente Social</th><td>${esc(p.social.assistenteSocial)} — CRESS ${esc(p.social.cress)}</td></tr>
        <tr><th>Perito Médico</th><td>${esc(p.medical.peritoMedico)} — CRM ${esc(p.medical.crm)}</td></tr>
      </table>
    </section>`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Laudo Pericial — ${esc(p.ident.nome || 'Avaliado')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; color: #111; margin: 24px; line-height: 1.4; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  h2 { font-size: 13px; background: #1f3a5f; color: #fff; padding: 5px 8px; margin: 18px 0 8px; }
  h3 { font-size: 12px; border-bottom: 2px solid #1f3a5f; padding-bottom: 2px; margin: 14px 0 6px; }
  h4 { font-size: 11px; margin: 10px 0 4px; }
  .grp { color: #777; font-weight: normal; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .kv th { text-align: left; width: 230px; vertical-align: top; padding: 3px 6px; background: #eef1f5; border: 1px solid #d4d9e0; font-weight: 600; }
  .kv td { padding: 3px 6px; border: 1px solid #d4d9e0; vertical-align: top; }
  table.units { font-size: 10px; }
  table.units th, table.units td { border: 1px solid #d4d9e0; padding: 2px 5px; vertical-align: top; }
  table.units thead th { background: #eef1f5; }
  td.n, th.n { width: 28px; text-align: center; }
  td.q, th.q { width: 90px; text-align: center; white-space: nowrap; }
  .domq { font-size: 10px; margin: 2px 0 4px; }
  .result th { background: #eef1f5; width: 230px; text-align: left; padding: 5px 8px; border: 1px solid #d4d9e0; }
  .result td { padding: 5px 8px; border: 1px solid #d4d9e0; font-size: 13px; }
  .bgroups td { border: 1px solid #d4d9e0; text-align: center; padding: 4px; font-size: 10px; }
  .decisao { border: 2px solid #1f3a5f; padding: 8px 12px; margin: 10px 0; }
  .decisao.sim { background: #e8f5e9; border-color: #2e7d32; }
  .decisao.nao { background: #fdecea; border-color: #c62828; }
  .final { font-size: 12px; }
  .signatures th { width: 160px; }
  header.doc { border-bottom: 3px solid #1f3a5f; padding-bottom: 8px; margin-bottom: 10px; }
  .muted { color: #555; font-size: 10px; }
  @media print { body { margin: 12mm; } h2 { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body onload="window.print()">
  <header class="doc">
    <h1>Avaliação da Pessoa com Deficiência para acesso ao BPC</h1>
    <div class="muted">${esc(anexoLabel)} · Portaria Conjunta MDS/INSS nº 2, de 30/03/2015</div>
  </header>
  <h2>Identificação do Avaliado</h2>
  ${ident}
  ${social}
  ${medical}
  ${conclusao}
  <p class="muted">Documento gerado eletronicamente pela ferramenta ATCPCD para preenchimento pericial. Confira todos os dados antes de assinar.</p>
</body></html>`;
}

export function abrirLaudoParaImpressao(p: LaudoParams): void {
  const html = buildLaudoHtml(p);
  const w = window.open('', '_blank');
  if (!w) {
    alert('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
