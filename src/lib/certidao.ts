// Geração da certidão de consolidação pela Secretaria Judicial.
// Resolução CNJ nº 630/2025 — Instrumento Unificado de Avaliação Biopsicossocial.

import type { Letter } from './types';
import { getDomains, calcFA, calcAP, calcFC, LETTER_NAMES } from './engine';
import type { CanonicalPayload } from './schema';
import type { AvaliacaoMedicaExtra, AvaliacaoSocialExtra } from './types';

export interface ConsolidatedResult {
  faLetter: Letter; faPct: number; faSum: number;
  apLetter: Letter; apPct: number; apSum: number;
  fcLetter: Letter; fcBaseLetter: Letter; fcElevated: boolean;
}

export function consolidate(social: CanonicalPayload, medical: CanonicalPayload): ConsolidatedResult {
  const anexo = medical.anexo;
  const domains = getDomains(anexo);
  const ageMonths = anexo === 'a2' && medical.ident.idadeMeses ? Number(medical.ident.idadeMeses) : null;

  // FA: from social evaluator
  const faDomainQuals = social.domainQualifiers;
  const fa = calcFA(domains, faDomainQuals, ageMonths);

  // AP: d1–d5 from medical, d6–d9 from social
  const apDomainQuals = { ...social.domainQualifiers, ...medical.domainQualifiers };
  const ap = calcAP(domains, apDomainQuals, ageMonths);

  // FC: from medical evaluator
  const medExtra = medical.extra as AvaliacaoMedicaExtra;
  const fc = calcFC(domains, medical.domainQualifiers, { estrutura: medExtra.estrutura, prognostico: medExtra.prognostico });

  return {
    faLetter: fa.letter, faPct: fa.pct, faSum: fa.sum,
    apLetter: ap.letter, apPct: ap.pct, apSum: ap.sum,
    fcLetter: fc.letter, fcBaseLetter: fc.baseLetter, fcElevated: fc.elevated,
  };
}

const CSS = `
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; color: #111; margin: 24px; line-height: 1.4; }
h1 { font-size: 15px; margin: 0 0 2px; }
h2 { font-size: 12px; background: #1f3a5f; color: #fff; padding: 5px 8px; margin: 16px 0 8px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
th { text-align: left; background: #eef1f5; padding: 4px 8px; border: 1px solid #d4d9e0; width: 220px; }
td { padding: 4px 8px; border: 1px solid #d4d9e0; }
.result td { font-size: 13px; font-weight: bold; }
.muted { color: #666; font-size: 9px; }
header.doc { border-bottom: 3px solid #1f3a5f; padding-bottom: 8px; margin-bottom: 10px; }
@media print { body { margin: 12mm; } h2 { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

function esc(s: string) { return (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!)); }
function row(l: string, v: string) { return `<tr><th>${esc(l)}</th><td>${v}</td></tr>`; }

export function buildCertidaoHtml(social: CanonicalPayload, medical: CanonicalPayload, r: ConsolidatedResult): string {
  const ident = medical.ident;
  const socExtra = social.extra as AvaliacaoSocialExtra;
  const medExtra = medical.extra as AvaliacaoMedicaExtra;
  const anexoLabel = medical.anexo === 'a1' ? '16 anos ou mais' : 'menor de 16 anos';

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Certidão — ${esc(ident.nome || 'Avaliado')}</title>
<style>${CSS}</style></head>
<body onload="window.print()">
  <header class="doc">
    <h1>Certidão de Avaliação Biopsicossocial</h1>
    <div class="muted">Resolução CNJ nº 630/2025 · ${esc(anexoLabel)}</div>
  </header>
  <h2>Identificação do Avaliado</h2>
  <table>
    ${row('Processo', esc(ident.processo))}
    ${row('Vara / Juízo', esc(ident.vara))}
    ${row('Município', esc(ident.municipio))}
    ${row('Nome', esc(ident.nome))}
    ${row('CPF', esc(ident.cpf))}
    ${row('NIT', esc(ident.nit))}
    ${row('Data de nascimento', esc(ident.dataNascimento))}
  </table>
  <h2>Resultado Consolidado</h2>
  <table class="result">
    <tr><th>Fatores Ambientais (e)</th><td>${r.faLetter} — ${LETTER_NAMES[r.faLetter]}<br><small style="font-weight:normal;font-size:10px">soma = ${r.faSum} · ${r.faPct.toFixed(1)}%</small></td></tr>
    <tr><th>Atividades e Participação (d)</th><td>${r.apLetter} — ${LETTER_NAMES[r.apLetter]}<br><small style="font-weight:normal;font-size:10px">soma = ${r.apSum} · ${r.apPct.toFixed(1)}%</small></td></tr>
    <tr><th>Funções do Corpo (b)</th><td>${r.fcLetter} — ${LETTER_NAMES[r.fcLetter]}<br><small style="font-weight:normal;font-size:10px">base = ${r.fcBaseLetter}${r.fcElevated ? ' · elevado 1 nível (Estrutura/Prognóstico)' : ''}</small></td></tr>
  </table>
  <h2>Avaliadores</h2>
  <table>
    ${row('Assistente Social', esc(socExtra.assistenteSocial) + ' — CRESS ' + esc(socExtra.cress))}
    ${row('Local e data (social)', esc(socExtra.localData))}
    ${row('Perito Médico', esc(medExtra.peritoMedico) + ' — CRM ' + esc(medExtra.crm))}
    ${row('Local e data (médico)', esc(medExtra.localData))}
  </table>
  <h2>CID</h2>
  <table>
    ${row('CID principal', esc(medExtra.cidPrincipal))}
    ${row('CID secundário(s)', esc(medExtra.cidSecundario))}
  </table>
  <p class="muted">Certidão gerada eletronicamente pela ferramenta ATCPCD. Confira todos os dados antes de assinar e juntar ao processo.</p>
</body></html>`;
}

export function abrirCertidaoParaImpressao(social: CanonicalPayload, medical: CanonicalPayload): void {
  const r = consolidate(social, medical);
  const html = buildCertidaoHtml(social, medical, r);
  const w = window.open('', '_blank');
  if (!w) {
    alert('Não foi possível abrir a janela. Verifique o bloqueador de pop-ups.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
