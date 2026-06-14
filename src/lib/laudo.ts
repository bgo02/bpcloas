// Geração do laudo pericial em HTML para impressão / Salvar como PDF.
// Inclui bloco Base64 com payload canônico para extração pela Secretaria.
// Resolução CNJ nº 630/2025 — Instrumento Unificado de Avaliação Biopsicossocial.

import type {
  AnexoId, Domain, DomainQualifiers, UnitScores,
  Identificacao, AvaliacaoSocialExtra, AvaliacaoMedicaExtra, Letter,
} from './types';
import { getDomains, effectiveDomainQualifier, calcFA, calcAP, calcFC, LETTER_NAMES } from './engine';
import { buildAndHashPayload, encodePayload } from './schema';

export interface LaudoSocialParams {
  area: 'social';
  anexo: AnexoId;
  ident: Identificacao;
  domainQuals: DomainQualifiers;
  unitScores: UnitScores;
  social: AvaliacaoSocialExtra;
  ageMonths: number | null;
}

export interface LaudoMedicalParams {
  area: 'medical';
  anexo: AnexoId;
  ident: Identificacao;
  domainQuals: DomainQualifiers;
  unitScores: UnitScores;
  medical: AvaliacaoMedicaExtra;
  ageMonths: number | null;
}

export type LaudoParams = LaudoSocialParams | LaudoMedicalParams;

const QUAL_NAME = ['Nenhuma', 'Leve', 'Moderada', 'Grave', 'Completa'];
const MARKER_START = '===CNJ-BPC-DADOS-INICIO===';
const MARKER_END = '===CNJ-BPC-DADOS-FIM===';

function esc(s: string): string {
  return (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
}
function nl(s: string): string { return esc(s).replace(/\n/g, '<br>'); }
function row(label: string, value: string): string {
  return `<tr><th>${esc(label)}</th><td>${value || '—'}</td></tr>`;
}
function letterBadge(l: Letter): string { return `${l} — ${LETTER_NAMES[l]}`; }

function renderDomainTable(
  domain: Domain, domainQuals: DomainQualifiers, unitScores: UnitScores, ageMonths: number | null,
): string {
  const dq = effectiveDomainQualifier(domain, domainQuals, ageMonths);
  const auto = domain.minAgeMonths !== undefined && ageMonths !== null && ageMonths < domain.minAgeMonths;
  const rows = domain.units.map((u) => {
    const s = unitScores[u.n];
    const val = s === undefined ? '—' : `${s} (${QUAL_NAME[s]})`;
    return `<tr><td class="n">${u.n}</td><td>${esc(u.text)}</td><td class="q">${val}</td></tr>`;
  }).join('');
  return `
    <div class="domain">
      <h4>${esc(domain.roman)} — ${esc(domain.title)} <span class="grp">[${domain.group}]</span></h4>
      <table class="units">
        <thead><tr><th class="n">Nº</th><th>Unidade de classificação</th><th class="q">Qualif.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="domq">Qualificador do domínio ${domain.group}: <strong>${dq} (${QUAL_NAME[dq]})</strong>${auto ? ' — atribuição automática por corte etário.' : ''}</p>
    </div>`;
}

function renderDomainSection(
  domains: Domain[], domainQuals: DomainQualifiers, unitScores: UnitScores, ageMonths: number | null,
): string {
  const byComp: Record<string, { title: string; domains: Domain[] }> = {
    FA: { title: 'Fatores Ambientais', domains: [] },
    AP: { title: 'Atividades e Participação', domains: [] },
    FC: { title: 'Funções do Corpo', domains: [] },
  };
  for (const d of domains) byComp[d.component].domains.push(d);
  return Object.entries(byComp)
    .filter(([, v]) => v.domains.length > 0)
    .map(([, v]) => `<h3>${v.title}</h3>${v.domains.map((d) => renderDomainTable(d, domainQuals, unitScores, ageMonths)).join('')}`)
    .join('');
}

const CSS = `
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; color: #111; margin: 24px; line-height: 1.4; }
h1 { font-size: 15px; margin: 0 0 2px; }
h2 { font-size: 12px; background: #1f3a5f; color: #fff; padding: 5px 8px; margin: 16px 0 8px; }
h3 { font-size: 11px; border-bottom: 2px solid #1f3a5f; padding-bottom: 2px; margin: 12px 0 5px; }
h4 { font-size: 10px; margin: 8px 0 3px; }
.grp { color: #777; font-weight: normal; }
table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
.kv th { text-align: left; width: 220px; vertical-align: top; padding: 3px 6px; background: #eef1f5; border: 1px solid #d4d9e0; font-weight: 600; }
.kv td { padding: 3px 6px; border: 1px solid #d4d9e0; vertical-align: top; }
table.units { font-size: 10px; }
table.units th, table.units td { border: 1px solid #d4d9e0; padding: 2px 5px; vertical-align: top; }
table.units thead th { background: #eef1f5; }
td.n, th.n { width: 28px; text-align: center; }
td.q, th.q { width: 90px; text-align: center; white-space: nowrap; }
.domq { font-size: 10px; margin: 2px 0 4px; }
.result th { background: #eef1f5; width: 220px; text-align: left; padding: 5px 8px; border: 1px solid #d4d9e0; }
.result td { padding: 5px 8px; border: 1px solid #d4d9e0; font-size: 12px; }
.data-block { font-size: 8px; word-break: break-all; background: #f5f5f5; border: 1px solid #ccc; padding: 4px; margin-top: 12px; }
.muted { color: #555; font-size: 9px; }
header.doc { border-bottom: 3px solid #1f3a5f; padding-bottom: 8px; margin-bottom: 10px; }
@media print { body { margin: 12mm; } h2 { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

async function buildHtml(p: LaudoParams, b64: string): Promise<string> {
  const anexoLabel = p.anexo === 'a1' ? '16 anos ou mais' : 'menor de 16 anos';
  const areaLabel = p.area === 'social' ? 'Avaliação Social' : 'Avaliação Médico-Pericial';
  const domains = getDomains(p.anexo).filter((d) => d.evaluator === p.area);

  const identRows = `
    ${row('Processo', esc(p.ident.processo))}
    ${row('Vara / Juízo', esc(p.ident.vara))}
    ${row('Município', esc(p.ident.municipio))}
    ${row('Fase', esc(p.ident.fase))}
    ${row('Nome do avaliado', esc(p.ident.nome))}
    ${row('CPF', esc(p.ident.cpf))}
    ${row('NIT', esc(p.ident.nit))}
    ${row('NB / Espécie', esc(p.ident.nb))}
    ${row('Data de nascimento', esc(p.ident.dataNascimento))}
    ${p.anexo === 'a2' ? row('Idade (meses)', esc(p.ident.idadeMeses)) : ''}
    ${row('Data da avaliação', esc(p.ident.dataAvaliacao))}
  `;

  let specificContent = '';
  if (p.area === 'social') {
    const s = (p as LaudoSocialParams).social;
    const fa = calcFA(getDomains(p.anexo), p.domainQuals, p.ageMonths);
    specificContent = `
      <table class="kv">${row('História social', nl(s.historiaSocial))}</table>
      ${renderDomainSection(domains, p.domainQuals, p.unitScores, p.ageMonths)}
      <table class="result">
        <tr><th>Fatores Ambientais (e)</th><td>${letterBadge(fa.letter)}<br><small>soma e1..e5 = ${fa.sum} · ${fa.pct.toFixed(1)}%</small></td></tr>
      </table>
      <table class="kv">
        ${row('Observações', nl(s.observacoes))}
        ${row('Assistente Social', esc(s.assistenteSocial))}
        ${row('CRESS', esc(s.cress))}
        ${row('Local e data', esc(s.localData))}
      </table>`;
  } else {
    const m = (p as LaudoMedicalParams).medical;
    const ap = calcAP(getDomains(p.anexo), p.domainQuals, p.ageMonths);
    const fc = calcFC(getDomains(p.anexo), p.domainQuals, m);
    const progLabel = { nao: 'Não', nao_possivel: 'Não é possível prognosticar', sim: 'Sim' }[m.prognostico];
    specificContent = `
      <table class="kv">
        ${row('História clínica', nl(m.historiaClinica))}
        ${row('Exames e laudos apresentados', nl(m.examesLaudos))}
        ${row('Exame físico', nl(m.exameFisico))}
        ${row('CID principal', esc(m.cidPrincipal))}
        ${row('CID secundário(s)', esc(m.cidSecundario))}
      </table>
      ${renderDomainSection(domains, p.domainQuals, p.unitScores, p.ageMonths)}
      <h3>Estrutura do Corpo e Prognóstico</h3>
      <table class="kv">
        ${row('Alterações na Estrutura do Corpo (eleva 1 nível)?', m.estrutura === 'sim' ? 'Sim' : 'Não')}
        ${m.estrutura === 'sim' ? row('Descrição (estrutura)', nl(m.estruturaDescricao)) : ''}
        ${row('Prognóstico desfavorável (eleva 1 nível)?', esc(progLabel))}
        ${m.prognostico === 'sim' ? row('Descrição (prognóstico)', nl(m.prognosticoDescricao)) : ''}
      </table>
      <table class="result">
        <tr><th>Atividades e Participação (d)</th><td>${letterBadge(ap.letter)}<br><small>soma d1..d9 = ${ap.sum} · ${ap.pct.toFixed(1)}%</small></td></tr>
        <tr><th>Funções do Corpo (b)</th><td>${letterBadge(fc.letter)}<br><small>base = ${fc.baseLetter}${fc.elevated ? ' · elevado 1 nível' : ''}</small></td></tr>
      </table>
      <table class="kv">
        ${row('Observações', nl(m.observacoes))}
        ${row('Perito Médico', esc(m.peritoMedico))}
        ${row('CRM', esc(m.crm))}
        ${row('Local e data', esc(m.localData))}
      </table>`;
  }

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Laudo — ${esc(p.ident.nome || 'Avaliado')} — ${areaLabel}</title>
<style>${CSS}</style></head>
<body onload="window.print()">
  <header class="doc">
    <h1>Instrumento Unificado de Avaliação Biopsicossocial — ${areaLabel}</h1>
    <div class="muted">Resolução CNJ nº 630/2025 · ${esc(anexoLabel)}</div>
  </header>
  <h2>Identificação do Avaliado</h2>
  <table class="kv">${identRows}</table>
  <h2>${areaLabel}</h2>
  ${specificContent}
  <div class="data-block">
    <p class="muted">Bloco de dados estruturados para uso exclusivo da Secretaria Judicial. Não altere.</p>
    <pre>${MARKER_START}
${b64}
${MARKER_END}</pre>
  </div>
  <p class="muted">Documento gerado eletronicamente. Confira todos os dados antes de assinar.</p>
</body></html>`;
}

export async function abrirLaudoParaImpressao(p: LaudoParams): Promise<void> {
  const extra = p.area === 'social'
    ? (p as LaudoSocialParams).social
    : (p as LaudoMedicalParams).medical;
  const payload = await buildAndHashPayload(
    p.area, p.anexo, p.ident,
    p.domainQuals,
    Object.fromEntries(Object.entries(p.unitScores).map(([k, v]) => [k, v])),
    extra,
  );
  const b64 = encodePayload(payload);
  const html = await buildHtml(p, b64);
  const w = window.open('', '_blank');
  if (!w) {
    alert('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export async function baixarPayloadJson(p: LaudoParams): Promise<void> {
  const extra = p.area === 'social'
    ? (p as LaudoSocialParams).social
    : (p as LaudoMedicalParams).medical;
  const payload = await buildAndHashPayload(
    p.area, p.anexo, p.ident,
    p.domainQuals,
    Object.fromEntries(Object.entries(p.unitScores).map(([k, v]) => [k, v])),
    extra,
  );
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `laudo-cnj-${p.area}-${p.ident.cpf || 'avaliado'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
