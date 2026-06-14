import { useMemo, useState } from 'react';
import type {
  AnexoId, Qualifier, ScoreMap, DomainOverride,
  Identificacao, AvaliacaoSocialExtra, AvaliacaoMedicaExtra, Component,
} from '@/lib/types';
import { avaliar, getDomains, LETTER_NAMES } from '@/lib/engine';
import { abrirLaudoParaImpressao } from '@/lib/laudo';
import DomainBlock from '@/components/DomainBlock';
import { TextField, TextArea, SelectField } from '@/components/Inputs';

const STEPS = ['Identificação', 'Avaliação Social', 'Avaliação Médica', 'Conclusão'];

const emptyIdent: Identificacao = {
  fase: 'Inicial', nome: '', nit: '', cpf: '', nb: '', nomeMae: '', sexo: '',
  dataNascimento: '', idadeMeses: '', grauInstrucao: '',
  dataAvaliacaoSocial: '', dataAvaliacaoMedica: '', aps: '', gex: '',
};
const emptySocial: AvaliacaoSocialExtra = {
  historiaSocial: '', observacoes: '', assistenteSocial: '', cress: '', localData: '',
};
const emptyMedical: AvaliacaoMedicaExtra = {
  historiaClinica: '', examesLaudos: '', exameFisico: '', cidPrincipal: '', cidSecundario: '',
  estrutura: 'nao', estruturaDescricao: '', prognostico: 'nao', prognosticoDescricao: '',
  resolucao2anos: 'nao', resolucao2anosJustificativa: '', observacoes: '',
  peritoMedico: '', crm: '', localData: '',
};

const COMP_TITLE: Record<Component, string> = {
  FA: 'Fatores Ambientais',
  AP: 'Atividades e Participação',
  FC: 'Funções do Corpo',
};

export default function App() {
  const [anexo, setAnexo] = useState<AnexoId>('a1');
  const [step, setStep] = useState(0);
  const [ident, setIdent] = useState<Identificacao>(emptyIdent);
  const [social, setSocial] = useState<AvaliacaoSocialExtra>(emptySocial);
  const [medical, setMedical] = useState<AvaliacaoMedicaExtra>(emptyMedical);
  const [scores, setScores] = useState<ScoreMap>({});
  const [override, setOverride] = useState<DomainOverride>({});

  const ageMonths = anexo === 'a2' && ident.idadeMeses !== '' ? Number(ident.idadeMeses) : null;
  const domains = useMemo(() => getDomains(anexo), [anexo]);

  const result = useMemo(
    () => avaliar(anexo, scores, override, medical, ageMonths),
    [anexo, scores, override, medical, ageMonths],
  );

  const setIdentField = (k: keyof Identificacao) => (v: string) => setIdent((p) => ({ ...p, [k]: v }));
  const setSocialField = (k: keyof AvaliacaoSocialExtra) => (v: string) => setSocial((p) => ({ ...p, [k]: v }));
  const setMedicalField = (k: keyof AvaliacaoMedicaExtra) => (v: string) => setMedical((p) => ({ ...p, [k]: v }));

  const onScore = (n: number, v: Qualifier) => setScores((p) => ({ ...p, [n]: v }));
  const onOverride = (group: string, v: Qualifier | undefined) =>
    setOverride((p) => {
      const next = { ...p };
      if (v === undefined) delete next[group];
      else next[group] = v;
      return next;
    });

  const reset = () => {
    if (!confirm('Reiniciar a avaliação? Todos os dados preenchidos serão perdidos.')) return;
    setIdent(emptyIdent); setSocial(emptySocial); setMedical(emptyMedical);
    setScores({}); setOverride({}); setStep(0);
  };

  function renderEvaluation(evaluator: 'social' | 'medical') {
    const ds = domains.filter((d) => d.evaluator === evaluator);
    const comps = [...new Set(ds.map((d) => d.component))] as Component[];
    return comps.map((comp) => (
      <div key={comp} className="mb-6">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide border-b-2 border-slate-300 pb-1 mb-3">
          {COMP_TITLE[comp]}
        </h3>
        {ds.filter((d) => d.component === comp).map((d) => (
          <DomainBlock
            key={d.group + d.roman}
            domain={d}
            scores={scores}
            override={override}
            ageMonths={ageMonths}
            onScore={onScore}
            onOverride={onOverride}
          />
        ))}
      </div>
    ));
  }

  return (
    <div className="min-h-screen">
      <header className="bg-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">ATCPCD — Avaliação BPC/LOAS da Pessoa com Deficiência</h1>
            <p className="text-xs text-slate-300">Portaria Conjunta MDS/INSS nº 2, de 30/03/2015 · preenchimento pericial</p>
          </div>
          <button onClick={reset} className="text-xs text-slate-300 hover:text-white underline">Reiniciar</button>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-2 flex gap-1">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={[
                'flex-1 text-xs py-1.5 rounded font-medium',
                i === step ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-5">
        {step === 0 && (
          <section>
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <h2 className="text-sm font-bold text-slate-700 mb-2">Instrumento de avaliação</h2>
              <div className="flex gap-2">
                {([['a1', '16 anos ou mais (Anexo I)'], ['a2', 'Menor de 16 anos (Anexo II)']] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => { setAnexo(id); setScores({}); setOverride({}); }}
                    className={[
                      'flex-1 px-3 py-2 rounded border text-sm font-medium',
                      anexo === id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-gray-300',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-slate-700 mb-3">Identificação do Avaliado</h2>
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Fase da avaliação" value={ident.fase} onChange={setIdentField('fase')}
                  options={['Inicial', 'Recursal', 'Revisão Administrativa', 'Reavaliação Bienal', 'Judicial'].map((v) => ({ value: v, label: v }))} />
                <TextField label="Nome do avaliado" value={ident.nome} onChange={setIdentField('nome')} />
                <TextField label="NIT" value={ident.nit} onChange={setIdentField('nit')} />
                <TextField label="CPF" value={ident.cpf} onChange={setIdentField('cpf')} />
                <TextField label="NB / Espécie" value={ident.nb} onChange={setIdentField('nb')} />
                <TextField label="Nome da mãe" value={ident.nomeMae} onChange={setIdentField('nomeMae')} />
                <TextField label="Sexo" value={ident.sexo} onChange={setIdentField('sexo')} />
                <TextField label="Data de nascimento" value={ident.dataNascimento} onChange={setIdentField('dataNascimento')} placeholder="dd/mm/aaaa" />
                {anexo === 'a2' && (
                  <TextField label="Idade (meses) — usada no corte etário" type="number" value={ident.idadeMeses} onChange={setIdentField('idadeMeses')} />
                )}
                <TextField label="Grau de instrução" value={ident.grauInstrucao} onChange={setIdentField('grauInstrucao')} />
                <TextField label="Data da avaliação social" value={ident.dataAvaliacaoSocial} onChange={setIdentField('dataAvaliacaoSocial')} placeholder="dd/mm/aaaa" />
                <TextField label="Data da avaliação médico-pericial" value={ident.dataAvaliacaoMedica} onChange={setIdentField('dataAvaliacaoMedica')} placeholder="dd/mm/aaaa" />
                <TextField label="APS" value={ident.aps} onChange={setIdentField('aps')} />
                <TextField label="GEX" value={ident.gex} onChange={setIdentField('gex')} />
              </div>
              {anexo === 'a2' && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  No Anexo II, domínios de Atividades e Participação cuja idade mínima seja superior à idade informada
                  recebem automaticamente o qualificador máximo (4 = Completa), conforme Anexo III.
                </p>
              )}
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <h2 className="text-sm font-bold text-slate-700 mb-2">Avaliação Social — Assistente Social</h2>
              <TextArea label="História social" value={social.historiaSocial} onChange={setSocialField('historiaSocial')} rows={4} />
            </div>
            {renderEvaluation('social')}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mt-2 grid grid-cols-2 gap-3">
              <div className="col-span-2"><TextArea label="Observações do(a) avaliador(a)" value={social.observacoes} onChange={setSocialField('observacoes')} /></div>
              <TextField label="Assistente Social" value={social.assistenteSocial} onChange={setSocialField('assistenteSocial')} />
              <TextField label="CRESS" value={social.cress} onChange={setSocialField('cress')} />
              <TextField label="Local e data" value={social.localData} onChange={setSocialField('localData')} />
            </div>
            <PartialResult label="Fatores Ambientais (e)" letter={result.fa.letter} extra={`soma = ${result.fa.sum} · ${result.fa.pct.toFixed(1)}%`} />
          </section>
        )}

        {step === 2 && (
          <section>
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 grid grid-cols-2 gap-3">
              <h2 className="col-span-2 text-sm font-bold text-slate-700">Avaliação Médico-Pericial — Perito Médico</h2>
              <div className="col-span-2"><TextArea label="História clínica" value={medical.historiaClinica} onChange={setMedicalField('historiaClinica')} /></div>
              <div className="col-span-2"><TextArea label="Informações de exames e laudos apresentados" value={medical.examesLaudos} onChange={setMedicalField('examesLaudos')} rows={2} /></div>
              <div className="col-span-2"><TextArea label="Exame físico" value={medical.exameFisico} onChange={setMedicalField('exameFisico')} rows={2} /></div>
              <TextField label="CID principal (obrigatório)" value={medical.cidPrincipal} onChange={setMedicalField('cidPrincipal')} />
              <TextField label="CID secundário(s)" value={medical.cidSecundario} onChange={setMedicalField('cidSecundario')} />
            </div>
            {renderEvaluation('medical')}

            <div className="bg-white rounded-lg border border-gray-200 p-4 mt-2">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Estrutura do Corpo, Prognóstico e Resolução</h3>
              <div className="space-y-3">
                <SelectField
                  label="Existem alterações na Estrutura do Corpo que configuram maiores limitações que as de Funções do Corpo? (eleva 1 nível)"
                  value={medical.estrutura} onChange={setMedicalField('estrutura')}
                  options={[{ value: 'nao', label: 'Não' }, { value: 'sim', label: 'Sim' }]} />
                {medical.estrutura === 'sim' && (
                  <TextArea label="Descrição (estrutura)" value={medical.estruturaDescricao} onChange={setMedicalField('estruturaDescricao')} rows={2} />
                )}
                <SelectField
                  label="As alterações configuram prognóstico desfavorável? (eleva 1 nível, não cumulativo)"
                  value={medical.prognostico} onChange={setMedicalField('prognostico')}
                  options={[
                    { value: 'nao', label: 'Não' },
                    { value: 'nao_possivel', label: 'Não é possível prognosticar' },
                    { value: 'sim', label: 'Sim' },
                  ]} />
                {medical.prognostico === 'sim' && (
                  <TextArea label="Descrição (prognóstico)" value={medical.prognosticoDescricao} onChange={setMedicalField('prognosticoDescricao')} rows={2} />
                )}
                <SelectField
                  label="As alterações serão resolvidas em menos de dois anos? (Sim indefere — Art. 8º, III)"
                  value={medical.resolucao2anos} onChange={setMedicalField('resolucao2anos')}
                  options={[
                    { value: 'nao', label: 'Não' },
                    { value: 'nao_prever', label: 'Não é possível prever, mas os efeitos podem se estender por dois anos ou mais' },
                    { value: 'sim', label: 'Sim' },
                  ]} />
                {medical.resolucao2anos === 'sim' && (
                  <TextArea label="Justificativa (resolução < 2 anos)" value={medical.resolucao2anosJustificativa} onChange={setMedicalField('resolucao2anosJustificativa')} rows={2} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="col-span-2"><TextArea label="Observações do(a) avaliador(a)" value={medical.observacoes} onChange={setMedicalField('observacoes')} rows={2} /></div>
                <TextField label="Perito Médico" value={medical.peritoMedico} onChange={setMedicalField('peritoMedico')} />
                <TextField label="CRM" value={medical.crm} onChange={setMedicalField('crm')} />
                <TextField label="Local e data" value={medical.localData} onChange={setMedicalField('localData')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <PartialResult label="Funções do Corpo (b)" letter={result.fc.letter}
                extra={`base = ${result.fc.baseLetter}${result.fc.elevated ? ' · elevado 1 nível' : ''}`} />
              <PartialResult label="Atividades e Participação (d)" letter={result.ap.letter}
                extra={`soma = ${result.ap.sum} · ${result.ap.pct.toFixed(1)}%`} />
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-slate-700 mb-3">Conclusão da Avaliação</h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <ResultCard title="Fatores Ambientais (e)" letter={result.fa.letter} sub={`${result.fa.sum} · ${result.fa.pct.toFixed(1)}%`} />
                <ResultCard title="Atividades e Part. (d)" letter={result.ap.letter} sub={`${result.ap.sum} · ${result.ap.pct.toFixed(1)}%`} />
                <ResultCard title="Funções do Corpo (b)" letter={result.fc.letter} sub={result.fc.elevated ? `base ${result.fc.baseLetter} · elevado` : `base ${result.fc.baseLetter}`} />
              </div>

              <div className={[
                'rounded-lg border-2 p-4',
                result.deficiente ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500',
              ].join(' ')}>
                <p className="text-xs text-slate-600 mb-1">
                  Tabela Conclusiva (Anexo IV) para (e={result.fa.letter}, d={result.ap.letter}, b={result.fc.letter}):
                  <strong> {result.preenche ? 'preenche' : 'não preenche'}</strong> os requisitos.
                </p>
                {result.preenche && result.resolveEm2Anos && (
                  <p className="text-xs text-red-700 mb-1">Indeferido por resolução em menos de dois anos (Art. 8º, III).</p>
                )}
                <p className="text-sm font-bold text-slate-800">
                  {result.deficiente
                    ? 'O avaliado PREENCHE os requisitos de pessoa com deficiência (Art. 20, §§ 2º e 10, Lei 8.742/1993).'
                    : 'O avaliado NÃO PREENCHE os requisitos de pessoa com deficiência (Art. 20, §§ 2º e 10, Lei 8.742/1993).'}
                </p>
              </div>

              <button
                onClick={() => abrirLaudoParaImpressao({ anexo, ident, social, medical, scores, override, ageMonths, result })}
                className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold py-2.5 rounded"
              >
                Gerar laudo em PDF (imprimir / salvar como PDF)
              </button>
              <p className="mt-2 text-xs text-slate-500">
                Abre o laudo formatado em nova aba e aciona a impressão do navegador. Escolha “Salvar como PDF” no destino.
              </p>
            </div>
          </section>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4 py-2 text-sm rounded border border-gray-300 bg-white disabled:opacity-40"
          >
            ← Anterior
          </button>
          {step < STEPS.length - 1 && (
            <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="px-4 py-2 text-sm rounded bg-slate-800 text-white">
              Próximo →
            </button>
          )}
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-6 text-xs text-slate-400">
        Ferramenta de apoio ao preenchimento pericial. As pontuações e a conclusão seguem os Anexos III e IV da
        Portaria Conjunta MDS/INSS nº 2/2015. Confira sempre os dados antes de assinar o laudo.
      </footer>
    </div>
  );
}

function PartialResult({ label, letter, extra }: { label: string; letter: keyof typeof LETTER_NAMES; extra: string }) {
  return (
    <div className="mt-3 bg-slate-100 rounded-lg p-3 text-sm">
      <span className="text-slate-600">{label}: </span>
      <strong className="text-slate-800">{letter} — {LETTER_NAMES[letter]}</strong>
      <span className="text-xs text-slate-500 ml-2">({extra})</span>
    </div>
  );
}

function ResultCard({ title, letter, sub }: { title: string; letter: keyof typeof LETTER_NAMES; sub: string }) {
  return (
    <div className="bg-slate-100 rounded-lg p-3 text-center">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-bold text-slate-800">{letter}</div>
      <div className="text-xs text-slate-600">{LETTER_NAMES[letter]}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}
