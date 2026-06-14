import { describe, it, expect } from 'vitest';
import { pctToLetter, preencheRequisitos, avaliar, getDomains } from './engine';
import type { AvaliacaoMedicaExtra, ScoreMap } from './types';

const med = (over: Partial<AvaliacaoMedicaExtra> = {}): AvaliacaoMedicaExtra => ({
  historiaClinica: '', examesLaudos: '', exameFisico: '', cidPrincipal: '', cidSecundario: '',
  estrutura: 'nao', estruturaDescricao: '', prognostico: 'nao', prognosticoDescricao: '',
  resolucao2anos: 'nao', resolucao2anosJustificativa: '', observacoes: '',
  peritoMedico: '', crm: '', localData: '', ...over,
});

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

describe('Tabela Conclusiva (Anexo IV)', () => {
  it('linhas representativas', () => {
    expect(preencheRequisitos('N', 'C', 'C')).toBe(true);   // linha 5
    expect(preencheRequisitos('N', 'L', 'C')).toBe(false);  // linha 20
    expect(preencheRequisitos('C', 'C', 'L')).toBe(false);  // linha 76
    expect(preencheRequisitos('N', 'M', 'G')).toBe(true);   // linha 40
    // célula que depende de Fatores Ambientais: b=M, d=M
    expect(preencheRequisitos('G', 'M', 'M')).toBe(true);   // linha 62
    expect(preencheRequisitos('M', 'M', 'M')).toBe(false);  // linha 63
    expect(preencheRequisitos('C', 'M', 'M')).toBe(true);   // linha 61
    expect(preencheRequisitos('N', 'M', 'M')).toBe(false);  // linha 65
  });

  it('b Nenhuma/Leve sempre indefere; d Nenhuma/Leve sempre indefere', () => {
    for (const e of ['N', 'L', 'M', 'G', 'C'] as const) {
      expect(preencheRequisitos(e, 'C', 'L')).toBe(false);
      expect(preencheRequisitos(e, 'L', 'C')).toBe(false);
    }
  });
});

describe('avaliar — integração', () => {
  it('todos os quesitos completos (4) → deficiente', () => {
    const domains = getDomains('a1');
    const scores: ScoreMap = {};
    for (const d of domains) for (const u of d.units) scores[u.n] = 4;
    const r = avaliar('a1', scores, {}, med(), null);
    expect(r.fa.letter).toBe('C');
    expect(r.ap.letter).toBe('C');
    expect(r.fc.letter).toBe('C');
    expect(r.deficiente).toBe(true);
  });

  it('tudo zero → não deficiente', () => {
    const r = avaliar('a1', {}, {}, med(), null);
    expect(r.deficiente).toBe(false);
    expect(r.fc.letter).toBe('N');
  });

  it('elevação por estrutura sobe o nível de Funções do Corpo', () => {
    const domains = getDomains('a1');
    const scores: ScoreMap = {};
    // pontua um domínio b com grave (3)
    const b1 = domains.find((d) => d.group === 'b1')!;
    for (const u of b1.units) scores[u.n] = 3;
    const base = avaliar('a1', scores, {}, med(), null);
    expect(base.fc.letter).toBe('G');
    const elevated = avaliar('a1', scores, {}, med({ estrutura: 'sim' }), null);
    expect(elevated.fc.letter).toBe('C');
  });

  it('resolução em < 2 anos indefere mesmo preenchendo a tabela', () => {
    const domains = getDomains('a1');
    const scores: ScoreMap = {};
    for (const d of domains) for (const u of d.units) scores[u.n] = 4;
    const r = avaliar('a1', scores, {}, med({ resolucao2anos: 'sim' }), null);
    expect(r.preenche).toBe(true);
    expect(r.deficiente).toBe(false);
  });

  it('Anexo II: corte etário força qualificador 4 em domínios de A&P', () => {
    // criança de 2 meses: domínios A&P com idade mínima > 2 viram Completa
    const r = avaliar('a2', {}, {}, med(), 2);
    expect(r.ap.letter).toBe('C');
  });
});
