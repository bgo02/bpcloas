// Motor de cálculo — Instrumento Unificado de Avaliação Biopsicossocial
// Resolução CNJ nº 630/2025 (Anexos I–IV).

import type {
  AnexoId, Domain, Letter, Qualifier, DomainQualifiers, AvaliacaoMedicaExtra,
} from './types';
import { ANEXO1_DOMAINS, ANEXO2_DOMAINS } from './instrument-data';

export const LETTERS: Letter[] = ['N', 'L', 'M', 'G', 'C'];
export const LETTER_NAMES: Record<Letter, string> = {
  N: 'Nenhuma', L: 'Leve', M: 'Moderada', G: 'Grave', C: 'Completa',
};

export function getDomains(anexo: AnexoId): Domain[] {
  return anexo === 'a1' ? ANEXO1_DOMAINS : ANEXO2_DOMAINS;
}

// Converte percentual (0-100) em letra conforme as faixas da CIF.
// N: 0–4% | L: 5–24% | M: 25–49% | G: 50–95% | C: 96–100%
export function pctToLetter(pct: number): Letter {
  const p = Math.max(0, pct);
  if (p < 5) return 'N';
  if (p < 25) return 'L';
  if (p < 50) return 'M';
  if (p < 96) return 'G';
  return 'C';
}

// Qualificador efetivo de um domínio: valor direto em domainQuals.
// No Anexo II, idade inferior ao corte etário do domínio implica qualificador 4 (automático).
export function effectiveDomainQualifier(
  domain: Domain,
  domainQuals: DomainQualifiers,
  ageMonths: number | null,
): Qualifier {
  if (
    domain.minAgeMonths !== undefined &&
    ageMonths !== null &&
    ageMonths < domain.minAgeMonths
  ) {
    return 4;
  }
  return domainQuals[domain.group] ?? 0;
}

// Fatores Ambientais: [(e1+e2+e3+e4+e5) × 5] − 0,1
export function calcFA(
  domains: Domain[], domainQuals: DomainQualifiers, ageMonths: number | null,
): { sum: number; pct: number; letter: Letter } {
  const fa = domains.filter((d) => d.component === 'FA');
  const sum = fa.reduce((acc, d) => acc + effectiveDomainQualifier(d, domainQuals, ageMonths), 0);
  const pct = sum * 5 - 0.1;
  return { sum, pct, letter: pctToLetter(pct) };
}

// Atividades e Participação: [(d1+…+d9) × (100/36)] − 0,1
export function calcAP(
  domains: Domain[], domainQuals: DomainQualifiers, ageMonths: number | null,
): { sum: number; pct: number; letter: Letter } {
  const ap = domains.filter((d) => d.component === 'AP');
  const sum = ap.reduce((acc, d) => acc + effectiveDomainQualifier(d, domainQuals, ageMonths), 0);
  const pct = sum * (100 / 36) - 0.1;
  return { sum, pct, letter: pctToLetter(pct) };
}

// Funções do Corpo: base = max(b1..b8), elevado +1 se estrutura=sim OU prognóstico=sim (não cumulativo).
export function calcFC(
  domains: Domain[], domainQuals: DomainQualifiers, med: Pick<AvaliacaoMedicaExtra, 'estrutura' | 'prognostico'>,
): { baseQual: Qualifier; baseLetter: Letter; elevated: boolean; letter: Letter } {
  const fc = domains.filter((d) => d.component === 'FC');
  // b groups: each domain has a group (b1..b8); take max per group, then overall max
  const groupMax: Record<string, Qualifier> = {};
  for (const d of fc) {
    const q = domainQuals[d.group] ?? 0;
    if (groupMax[d.group] === undefined || q > groupMax[d.group]) groupMax[d.group] = q;
  }
  const baseQual = (Object.values(groupMax).reduce((m, q) => (q > m ? q : m), 0)) as Qualifier;
  const elevated = med.estrutura === 'sim' || med.prognostico === 'sim';
  const finalIdx = elevated ? Math.min(baseQual + 1, 4) : baseQual;
  return {
    baseQual,
    baseLetter: LETTERS[baseQual],
    elevated,
    letter: LETTERS[finalIdx] as Letter,
  };
}
