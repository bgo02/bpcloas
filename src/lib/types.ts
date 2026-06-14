// Tipos do instrumento de avaliação BPC/LOAS — Portaria Conjunta MDS/INSS nº 2/2015.

export type Qualifier = 0 | 1 | 2 | 3 | 4;
export type Letter = 'N' | 'L' | 'M' | 'G' | 'C';
export type Component = 'FA' | 'AP' | 'FC'; // Fatores Ambientais, Atividades e Participação, Funções do Corpo
export type Evaluator = 'social' | 'medical';
export type AnexoId = 'a1' | 'a2';

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
  minAgeMonths?: number; // só Anexo II (menor de 16) — domínios de Atividades e Participação
  units: Unit[];
}

// Resposta a quesitos médicos de Estrutura/Prognóstico/Resolução
export type SimNao = 'nao' | 'sim';
export type Prognostico = 'nao' | 'nao_possivel' | 'sim';
export type Resolucao2Anos = 'nao' | 'nao_prever' | 'sim';

export interface Identificacao {
  fase: string;
  nome: string;
  nit: string;
  cpf: string;
  nb: string;
  nomeMae: string;
  sexo: string;
  dataNascimento: string;
  idadeMeses: string; // usado no Anexo II para corte etário automático
  grauInstrucao: string;
  dataAvaliacaoSocial: string;
  dataAvaliacaoMedica: string;
  aps: string;
  gex: string;
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
  resolucao2anos: Resolucao2Anos;
  resolucao2anosJustificativa: string;
  observacoes: string;
  peritoMedico: string;
  crm: string;
  localData: string;
}

export type ScoreMap = Record<number, Qualifier>;          // unidade -> qualificador
export type DomainOverride = Record<string, Qualifier>;     // grupo (e1..b8) -> qualificador manual do domínio
