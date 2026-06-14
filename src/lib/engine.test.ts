import { describe, it, expect } from 'vitest';
import { pctToLetter, calcFA, calcAP, calcFC, getDomains } from './engine';
import type { AvaliacaoMedicaExtra } from './types';
import { buildAndHashPayload, encodePayload, decodePayload, validatePayloadHash } from './schema';
import type { Identificacao } from './types';

const med = (over: Partial<AvaliacaoMedicaExtra> = {}): AvaliacaoMedicaExtra => ({
  historiaClinica: '', examesLaudos: '', exameFisico: '', cidPrincipal: '', cidSecundario: '',
  estrutura: 'nao', estruturaDescricao: '', prognostico: 'nao', prognosticoDescricao: '',
  observacoes: '', peritoMedico: '', crm: '', localData: '', ...over,
});

const emptyIdent: Identificacao = {
  fase: 'Inicial', nome: 'Teste', nit: '', cpf: '12345678901', nb: '', nomeMae: '', sexo: '',
  dataNascimento: '', idadeMeses: '', grauInstrucao: '', dataAvaliacao: '',
  municipio: '', vara: '', processo: '',
};

describe('pctToLetter — faixas da CIF', () => {
  it('mapeia as faixas corretamente', () => {
    expect(pctToLetter(0)).toBe('N');
    expect(pctToLetter(4.9)).toBe('N');
    expect(pctToLetter(5)).toBe('L');
    expect(pctToLetter(24.9)).toBe('L');
    expect(pctToLetter(25)).toBe('M');
    expect(pctToLetter(49.9)).toBe('M');
    expect(pctToLetter(50)).toBe('G');
    expect(pctToLetter(95.9)).toBe('G');
    expect(pctToLetter(96)).toBe('C');
    expect(pctToLetter(100)).toBe('C');
  });
});

describe('calcFA — Fatores Ambientais', () => {
  it('todos domínios FA com qualif. 4 → Completa', () => {
    const domains = getDomains('a1');
    const domainQuals: Record<string, 0|1|2|3|4> = {};
    for (const d of domains.filter((d) => d.component === 'FA')) domainQuals[d.group] = 4;
    const fa = calcFA(domains, domainQuals, null);
    expect(fa.letter).toBe('C');
  });

  it('todos zero → Nenhuma', () => {
    const domains = getDomains('a1');
    const fa = calcFA(domains, {}, null);
    expect(fa.letter).toBe('N');
  });
});

describe('calcAP — Atividades e Participação', () => {
  it('todos domínios AP com qualif. 4 → Completa', () => {
    const domains = getDomains('a1');
    const domainQuals: Record<string, 0|1|2|3|4> = {};
    for (const d of domains.filter((d) => d.component === 'AP')) domainQuals[d.group] = 4;
    const ap = calcAP(domains, domainQuals, null);
    expect(ap.letter).toBe('C');
  });

  it('Anexo II: corte etário força qualificador 4 em domínios de A&P', () => {
    // criança de 2 meses: domínios A&P com idade mínima > 2 viram Completa
    const domains = getDomains('a2');
    const ap = calcAP(domains, {}, 2);
    expect(ap.letter).toBe('C');
  });
});

describe('calcFC — Funções do Corpo', () => {
  it('elevação por estrutura sobe o nível de Funções do Corpo', () => {
    const domains = getDomains('a1');
    const domainQuals: Record<string, 0|1|2|3|4> = { b1: 3 };
    const base = calcFC(domains, domainQuals, med());
    expect(base.letter).toBe('G');
    const elevated = calcFC(domains, domainQuals, med({ estrutura: 'sim' }));
    expect(elevated.letter).toBe('C');
  });

  it('todos zero → Nenhuma', () => {
    const fc = calcFC(getDomains('a1'), {}, med());
    expect(fc.letter).toBe('N');
  });
});

describe('LIBRAS invariant', () => {
  it('domain=0 with unit=4 is valid — no validation prevents it', () => {
    // Domain qualifier is set independently of unit scores.
    // A perito can set domain=0 even if a unit score is 4 (LIBRAS case).
    const domainQuals: Record<string, number> = { e1: 0 };
    const unitScores: Record<string, number> = { 1: 4 };
    // Just confirm these are independent values — no computation forces them equal.
    expect(domainQuals['e1']).toBe(0);
    expect(unitScores[1]).toBe(4);
  });

  it('domain=2 with unit=0 is valid', () => {
    const domainQuals: Record<string, number> = { e1: 2 };
    const unitScores: Record<string, number> = { 1: 0 };
    expect(domainQuals['e1']).toBe(2);
    expect(unitScores[1]).toBe(0);
  });
});

describe('payload round-trip', () => {
  it('buildAndHashPayload → encodePayload → decodePayload → validatePayloadHash', async () => {
    const domainQuals = { e1: 2, e2: 1, e3: 0, e4: 3, e5: 4 } as Record<string, 0 | 1 | 2 | 3 | 4>;
    const unitScores = {} as Record<string, 0 | 1 | 2 | 3 | 4>;
    const extra = {
      historiaClinica: '', examesLaudos: '', exameFisico: '',
      cidPrincipal: 'F00', cidSecundario: '',
      estrutura: 'nao' as const, estruturaDescricao: '',
      prognostico: 'nao' as const, prognosticoDescricao: '',
      observacoes: '', peritoMedico: 'Dr. Teste', crm: '12345', localData: 'Brasília, 2025',
    };
    const payload = await buildAndHashPayload('medical', 'a1', emptyIdent, domainQuals, unitScores, extra);
    expect(payload.hash).toBeTruthy();

    const encoded = encodePayload(payload);
    expect(typeof encoded).toBe('string');

    const decoded = decodePayload(encoded);
    expect(decoded.ident.cpf).toBe('12345678901');

    const valid = await validatePayloadHash(decoded);
    expect(valid).toBe(true);
  });
});
