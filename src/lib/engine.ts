// Motor de cálculo conforme Anexo III e Tabela Conclusiva (Anexo IV) da
// Portaria Conjunta MDS/INSS nº 2/2015.

import type {
  AnexoId, Domain, Letter, Qualifier, ScoreMap, DomainOverride,
  AvaliacaoMedicaExtra,
} from './types';
import { ANEXO1_DOMAINS, ANEXO2_DOMAINS } from './instrument-data';

export const LETTERS: Letter[] = ['N', 'L', 'M', 'G', 'C'];
export const LETTER_NAMES: Record<Letter, string> = {
  N: 'Nenhuma', L: 'Leve', M: 'Moderada', G: 'Grave', C: 'Completa',
};

export function getDomains(anexo: AnexoId): Domain[] {
  return anexo === 'a1' ? ANEXO1_DOMAINS : ANEXO2_DOMAINS;
}

export function idx(l: Letter): number {
  return LETTERS.indexOf(l);
}

// Converte percentual (0-100) em letra conforme as faixas da CIF.
// N: 0-4% | L: 5-24% | M: 25-49% | G: 50-95% | C: 96-100%
export function pctToLetter(pct: number): Letter {
  const p = Math.max(0, pct);
  if (p < 5) return 'N';
  if (p < 25) return 'L';
  if (p < 50) return 'M';
  if (p < 96) return 'G';
  return 'C';
}

// Qualificador efetivo de um domínio: override manual, ou o maior qualificador
// das unidades preenchidas. No Anexo II, idade inferior ao corte etário do
// domínio implica dificuldade máxima automática (qualificador 4 = C).
export function domainQualifier(
  domain: Domain,
  scores: ScoreMap,
  override: DomainOverride,
  ageMonths: number | null,
): Qualifier {
  if (
    domain.minAgeMonths !== undefined &&
    ageMonths !== null &&
    ageMonths < domain.minAgeMonths
  ) {
    return 4;
  }
  if (override[domain.group] !== undefined) return override[domain.group];
  let max = 0;
  let any = false;
  for (const u of domain.units) {
    const s = scores[u.n];
    if (s !== undefined) {
      any = true;
      if (s > max) max = s;
    }
  }
  return (any ? max : 0) as Qualifier;
}

// Qualificador final de Fatores Ambientais: média dos 5 domínios e1..e5.
// Fórmula da Portaria: [(e1+e2+e3+e4+e5) x 5] - 0,1, expressa em letra.
export function fatoresAmbientaisLetter(
  domains: Domain[], scores: ScoreMap, override: DomainOverride, ageMonths: number | null,
): { sum: number; pct: number; letter: Letter } {
  const fa = domains.filter((d) => d.component === 'FA');
  const sum = fa.reduce((acc, d) => acc + domainQualifier(d, scores, override, ageMonths), 0);
  const pct = sum * 5 - 0.1;
  return { sum, pct, letter: pctToLetter(pct) };
}

// Qualificador final de Atividades e Participação: média dos 9 domínios d1..d9.
// Fórmula da Portaria: [(d1+...+d9) x 2,77777...] - 0,1, expressa em letra.
export function atividadesParticipacaoLetter(
  domains: Domain[], scores: ScoreMap, override: DomainOverride, ageMonths: number | null,
): { sum: number; pct: number; letter: Letter } {
  const ap = domains.filter((d) => d.component === 'AP');
  const sum = ap.reduce((acc, d) => acc + domainQualifier(d, scores, override, ageMonths), 0);
  const pct = sum * (100 / 36) - 0.1;
  return { sum, pct, letter: pctToLetter(pct) };
}

// Qualificadores b1..b8 (cada grupo é o maior qualificador entre as seções que o compõem).
export function bGroupQualifiers(
  domains: Domain[], scores: ScoreMap, override: DomainOverride,
): Record<string, Qualifier> {
  const result: Record<string, Qualifier> = {};
  for (const d of domains.filter((x) => x.component === 'FC')) {
    const q = domainQualifier(d, scores, override, null);
    if (result[d.group] === undefined || q > result[d.group]) result[d.group] = q;
  }
  return result;
}

// Qualificador final de Funções do Corpo: maior qualificador entre b1..b8,
// elevado em um nível (não cumulativo) se houver alteração de Estrutura do Corpo
// e/ou prognóstico desfavorável.
export function funcoesCorpoLetter(
  domains: Domain[], scores: ScoreMap, override: DomainOverride, med: AvaliacaoMedicaExtra,
): { baseQual: Qualifier; baseLetter: Letter; elevated: boolean; letter: Letter } {
  const groups = bGroupQualifiers(domains, scores, override);
  const baseQual = Object.values(groups).reduce((m, q) => (q > m ? q : m), 0 as Qualifier);
  const elevated = med.estrutura === 'sim' || med.prognostico === 'sim';
  const finalIdx = elevated ? Math.min(baseQual + 1, 4) : baseQual;
  return {
    baseQual,
    baseLetter: LETTERS[baseQual],
    elevated,
    letter: LETTERS[finalIdx],
  };
}

// Tabela Conclusiva de Qualificadores (Anexo IV). Retorna se o avaliado preenche
// os requisitos de pessoa com deficiência (Art. 20, §§ 2º e 10, da Lei 8.742/1993).
// e = Fatores Ambientais, d = Atividades e Participação, b = Funções do Corpo.
export function preencheRequisitos(e: Letter, d: Letter, b: Letter): boolean {
  const bi = idx(b), di = idx(d), ei = idx(e);
  if (bi <= 1) return false;       // Funções do Corpo Nenhuma ou Leve
  if (di <= 1) return false;       // Atividades e Participação Nenhuma ou Leve
  if (bi >= 3) return true;        // b Grave/Completa e d >= Moderada
  if (di >= 3) return true;        // b Moderada e d Grave/Completa
  return ei >= 3;                  // b Moderada e d Moderada: depende de e (Grave/Completa)
}

export interface AvaliacaoResultado {
  fa: { sum: number; pct: number; letter: Letter };
  ap: { sum: number; pct: number; letter: Letter };
  fc: { baseQual: Qualifier; baseLetter: Letter; elevated: boolean; letter: Letter };
  bGroups: Record<string, Qualifier>;
  preenche: boolean;          // pela Tabela Conclusiva
  resolveEm2Anos: boolean;    // indefere mesmo preenchendo (Art. 8º, III)
  deficiente: boolean;        // decisão final
}

export function avaliar(
  anexo: AnexoId,
  scores: ScoreMap,
  override: DomainOverride,
  med: AvaliacaoMedicaExtra,
  ageMonths: number | null,
): AvaliacaoResultado {
  const domains = getDomains(anexo);
  const fa = fatoresAmbientaisLetter(domains, scores, override, ageMonths);
  const ap = atividadesParticipacaoLetter(domains, scores, override, ageMonths);
  const fc = funcoesCorpoLetter(domains, scores, override, med);
  const bGroups = bGroupQualifiers(domains, scores, override);
  const preenche = preencheRequisitos(fa.letter, ap.letter, fc.letter);
  const resolveEm2Anos = med.resolucao2anos === 'sim';
  const deficiente = preenche && !resolveEm2Anos;
  return { fa, ap, fc, bGroups, preenche, resolveEm2Anos, deficiente };
}
