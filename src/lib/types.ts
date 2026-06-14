// Tipos do Instrumento Unificado de Avaliação Biopsicossocial — Resolução CNJ nº 630/2025.

export type Qualifier = 0 | 1 | 2 | 3 | 4;
export type Letter = 'N' | 'L' | 'M' | 'G' | 'C';
export type Component = 'FA' | 'AP' | 'FC'; // Fatores Ambientais, Atividades e Participação, Funções do Corpo
export type Evaluator = 'social' | 'medical';
export type AnexoId = 'a1' | 'a2';
export type Area = 'social' | 'medical';

export interface Unit {
  n: number;
  text: string;
}

export interface Domain {
  group: string; // e1..e5, d1..d9, b1..b8
  roman: string;
  title: string;
  component: Component;
  evaluator: Evaluator;
  minAgeMonths?: number; // só Anexo II — domínios de Atividades e Participação
  units: Unit[];
}

export type SimNao = 'nao' | 'sim';
export type Prognostico = 'nao' | 'nao_possivel' | 'sim';

export interface Identificacao {
  fase: string;
  nome: string;
  nit: string;
  cpf: string;
  nb: string;
  nomeMae: string;
  sexo: string;
  dataNascimento: string;
  idadeMeses: string;
  grauInstrucao: string;
  dataAvaliacao: string;
  municipio: string;
  vara: string;
  processo: string;
}

export interface AvaliacaoSocialExtra {
  historiaSocial: string;
  observacoes: string;
  assistenteSocial: string;
  cress: string;
  localData: string;
}

export interface AvaliacaoMedicaExtra {
  historiaClinica: string;
  examesLaudos: string;
  exameFisico: string;
  cidPrincipal: string;
  cidSecundario: string;
  estrutura: SimNao;
  estruturaDescricao: string;
  prognostico: Prognostico;
  prognosticoDescricao: string;
  observacoes: string;
  peritoMedico: string;
  crm: string;
  localData: string;
}

// domínio -> qualificador (entrada primária do perito)
export type DomainQualifiers = Record<string, Qualifier>;
// unidade -> qualificador (entrada auxiliar, não determina o domínio)
export type UnitScores = Record<number, Qualifier>;
