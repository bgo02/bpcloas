import { useMemo, useState } from 'react';
import type {
  AnexoId, Area, Qualifier, DomainQualifiers, UnitScores,
  Identificacao, AvaliacaoSocialExtra, AvaliacaoMedicaExtra,
} from '@/lib/types';
import { getDomains, calcFA, calcAP, calcFC, LETTER_NAMES } from '@/lib/engine';
import { abrirLaudoParaImpressao, baixarPayloadJson } from '@/lib/laudo';
import DomainBlock from '@/components/DomainBlock';
import { TextField, TextArea, SelectField } from '@/components/Inputs';

const STEPS = ['Identificação', 'Avaliação', 'Laudo'];

const emptyIdent: Identificacao = {
  fase: 'Inicial', nome: '', nit: '', cpf: '', nb: '', nomeMae: '', sexo: '',
  dataNascimento: '', idadeMeses: '', grauInstrucao: '',
  dataAvaliacao: '', municipio: '', vara: '', processo: '',
};
const emptySocial: AvaliacaoSocialExtra = {
  historiaSocial: '', observacoes: '', assistenteSocial: '', cress: '', localData: '',
};
const emptyMedical: AvaliacaoMedicaExtra = {
  historiaClinica: '', examesLaudos: '', exameFisico: '', cidPrincipal: '', cidSecundario: '',
  estrutura: 'nao', estruturaDescricao: '', prognostico: 'nao', prognosticoDescricao: '',
  observacoes: '', peritoMedico: '', crm: '', localData: '',
};

export default function PeritoArea() {
  const [area, setArea] = useState<Area>('social');
  const [anexo, setAnexo] = useState<AnexoId>('a1');
  const [step, setStep] = useState(0);
  const [ident, setIdent] = useState<Identificacao>(emptyIdent);
  const [social, setSocial] = useState<AvaliacaoSocialExtra>(emptySocial);
  const [medical, setMedical] = useState<AvaliacaoMedicaExtra>(emptyMedical);
  const [domainQuals, setDomainQuals] = useState<DomainQualifiers>({});
  const [unitScores, setUnitScores] = useState<UnitScores>({});
  const [generating, setGenerating] = useState(false);

  const ageMonths = anexo === 'a2' && ident.idadeMeses !== '' ? Number(ident.idadeMeses) : null;
  const domains = useMemo(() => getDomains(anexo).filter((d) => d.evaluator === area), [anexo, area]);

  const onDomainQual = (group: string, v: Qualifier) => setDomainQuals((p) => ({ ...p, [group]: v }));
  const onUnitScore = (n: number, v: Qualifier) => setUnitScores((p) => ({ ...p, [n]: v }));
  const setIdentField = (k: keyof Identificacao) => (v: string) => setIdent((p) => ({ ...p, [k]: v }));
  const setSocialField = (k: keyof AvaliacaoSocialExtra) => (v: string) => setSocial((p) => ({ ...p, [k]: v }));
  const setMedicalField = (k: keyof AvaliacaoMedicaExtra) => (v: string) => setMedical((p) => ({ ...p, [k]: v }));

  const allDomains = useMemo(() => getDomains(anexo), [anexo]);
  const fa = useMemo(() => calcFA(allDomains, domainQuals, ageMonths), [allDomains, domainQuals, ageMonths]);
  const ap = useMemo(() => calcAP(allDomains, domainQuals, ageMonths), [allDomains, domainQuals, ageMonths]);
  const fc = useMemo(() => calcFC(allDomains, domainQuals, medical), [allDomains, domainQuals, medical]);

  const reset = () => {
    if (!confirm('Reiniciar? Todos os dados serão perdidos.')) return;
    setIdent(emptyIdent); setSocial(emptySocial); setMedical(emptyMedical);
    setDomainQuals({}); setUnitScores({}); setStep(0);
  };

  const handleGerar = async () => {
    setGenerating(true);
    try {
      const params = area === 'social'
        ? { area: 'social' as const, anexo, ident, domainQuals, unitScores, social, ageMonths }
        : { area: 'medical' as const, anexo, ident, domainQuals, unitScores, medical, ageMonths };
      await abrirLaudoParaImpressao(params);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadJson = async () => {
    setGenerating(true);
    try {
      const params = area === 'social'
        ? { area: 'social' as const, anexo, ident, domainQuals, unitScores, social, ageMonths }
        : { area: 'medical' as const, anexo, ident, domainQuals, unitScores, medical, ageMonths };
      await baixarPayloadJson(params);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      {/* Area/Anexo selectors */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Tipo de avaliação</p>
          <div className="flex gap-2">
            {([['social', 'Social (Assistente Social)'], ['medical', 'Médico-Pericial (Perito Médico)']] as const).map(([id, label]) => (
              <button key={id} onClick={() => { setArea(id); setDomainQuals({}); setUnitScores({}); }}
                className={['flex-1 px-2 py-1.5 rounded border text-xs font-medium',
                  area === id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-gray-300'].join(' ')}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Faixa etária (Anexo)</p>
          <div className="flex gap-2">
            {([['a1', '16 anos ou mais'], ['a2', 'Menor de 16 anos']] as const).map(([id, label]) => (
              <button key={id} onClick={() => { setAnexo(id); setDomainQuals({}); setUnitScores({}); }}
                className={['flex-1 px-2 py-1.5 rounded border text-xs font-medium',
                  anexo === id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-gray-300'].join(' ')}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Steps */}
      <nav className="flex gap-1 mb-4">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)}
            className={['flex-1 text-xs py-1.5 rounded font-medium',
              i === step ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'].join(' ')}>
            {i + 1}. {s}
          </button>
        ))}
      </nav>

      {/* Step 0: Identificação */}
      {step === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Identificação do Avaliado</h3>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Fase" value={ident.fase} onChange={setIdentField('fase')}
              options={['Inicial', 'Recursal', 'Revisão Administrativa', 'Reavaliação', 'Judicial'].map((v) => ({ value: v, label: v }))} />
            <TextField label="Processo (número)" value={ident.processo} onChange={setIdentField('processo')} />
            <TextField label="Vara / Juízo" value={ident.vara} onChange={setIdentField('vara')} />
            <TextField label="Município" value={ident.municipio} onChange={setIdentField('municipio')} />
            <TextField label="Nome do avaliado" value={ident.nome} onChange={setIdentField('nome')} className="col-span-2" />
            <TextField label="CPF" value={ident.cpf} onChange={setIdentField('cpf')} />
            <TextField label="NIT" value={ident.nit} onChange={setIdentField('nit')} />
            <TextField label="NB / Espécie" value={ident.nb} onChange={setIdentField('nb')} />
            <TextField label="Data de nascimento" value={ident.dataNascimento} onChange={setIdentField('dataNascimento')} placeholder="dd/mm/aaaa" />
            {anexo === 'a2' && (
              <TextField label="Idade em meses (corte etário)" type="number" value={ident.idadeMeses} onChange={setIdentField('idadeMeses')} />
            )}
            <TextField label="Data da avaliação" value={ident.dataAvaliacao} onChange={setIdentField('dataAvaliacao')} placeholder="dd/mm/aaaa" />
          </div>
          {area === 'social' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <TextArea label="História social" value={social.historiaSocial} onChange={setSocialField('historiaSocial')} rows={4} />
            </div>
          )}
          {area === 'medical' && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid gap-3">
              <TextArea label="História clínica" value={medical.historiaClinica} onChange={setMedicalField('historiaClinica')} />
              <TextArea label="Exames e laudos apresentados" value={medical.examesLaudos} onChange={setMedicalField('examesLaudos')} rows={2} />
              <TextArea label="Exame físico" value={medical.exameFisico} onChange={setMedicalField('exameFisico')} rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="CID principal" value={medical.cidPrincipal} onChange={setMedicalField('cidPrincipal')} />
                <TextField label="CID secundário(s)" value={medical.cidSecundario} onChange={setMedicalField('cidSecundario')} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Avaliação (domains) */}
      {step === 1 && (
        <div>
          {anexo === 'a2' && (
            <p className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              Anexo II: domínios cujo corte etário seja superior à idade informada recebem automaticamente qualificador 4 = Completa.
            </p>
          )}
          {domains.map((d) => (
            <DomainBlock
              key={d.group + d.roman}
              domain={d}
              domainQuals={domainQuals}
              unitScores={unitScores}
              ageMonths={ageMonths}
              onDomainQual={onDomainQual}
              onUnitScore={onUnitScore}
            />
          ))}

          {/* Medical-specific: estrutura/prognóstico */}
          {area === 'medical' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mt-2">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Estrutura do Corpo e Prognóstico</h3>
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Laudo */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Resultado parcial */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Resultado da avaliação</h3>
            <div className="grid grid-cols-3 gap-3">
              {area === 'social' && (
                <ResultCard title="Fatores Ambientais (e)" letter={fa.letter} sub={`soma = ${fa.sum} · ${fa.pct.toFixed(1)}%`} />
              )}
              {area === 'medical' && (
                <>
                  <ResultCard title="Atividades e Part. (d)" letter={ap.letter} sub={`soma = ${ap.sum} · ${ap.pct.toFixed(1)}%`} />
                  <ResultCard title="Funções do Corpo (b)" letter={fc.letter} sub={fc.elevated ? `base ${fc.baseLetter} · elevado` : `base ${fc.baseLetter}`} />
                </>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Os qualificadores finais serão consolidados pela Secretaria Judicial ao combinar os laudos social e médico.
            </p>
          </div>

          {/* Assinatura / observações */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-2 gap-3">
            <h3 className="col-span-2 text-sm font-bold text-slate-700">Observações e assinatura</h3>
            {area === 'social' && (
              <>
                <div className="col-span-2"><TextArea label="Observações" value={social.observacoes} onChange={setSocialField('observacoes')} /></div>
                <TextField label="Assistente Social" value={social.assistenteSocial} onChange={setSocialField('assistenteSocial')} />
                <TextField label="CRESS" value={social.cress} onChange={setSocialField('cress')} />
                <TextField label="Local e data" value={social.localData} onChange={setSocialField('localData')} className="col-span-2" />
              </>
            )}
            {area === 'medical' && (
              <>
                <div className="col-span-2"><TextArea label="Observações" value={medical.observacoes} onChange={setMedicalField('observacoes')} /></div>
                <TextField label="Perito Médico" value={medical.peritoMedico} onChange={setMedicalField('peritoMedico')} />
                <TextField label="CRM" value={medical.crm} onChange={setMedicalField('crm')} />
                <TextField label="Local e data" value={medical.localData} onChange={setMedicalField('localData')} className="col-span-2" />
              </>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <button
              onClick={handleGerar}
              disabled={generating}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded"
            >
              {generating ? 'Gerando...' : 'Gerar laudo em PDF (imprimir / salvar como PDF)'}
            </button>
            <button
              onClick={handleDownloadJson}
              disabled={generating}
              className="w-full bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-sm font-medium py-2 rounded border border-gray-300"
            >
              Baixar laudo pontuado como JSON
            </button>
            <p className="text-xs text-slate-500">
              O laudo PDF contém um bloco de dados que a Secretaria usará para gerar a certidão. O JSON é uma alternativa.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
          className="px-4 py-2 text-sm rounded border border-gray-300 bg-white disabled:opacity-40">
          ← Anterior
        </button>
        <div className="flex gap-2">
          <button onClick={reset} className="px-3 py-2 text-xs rounded border border-gray-200 text-slate-500">
            Reiniciar
          </button>
          {step < STEPS.length - 1 && (
            <button onClick={() => setStep((s) => s + 1)}
              className="px-4 py-2 text-sm rounded bg-slate-800 text-white">
              Próximo →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ title, letter, sub }: { title: string; letter: string; sub: string }) {
  return (
    <div className="bg-slate-100 rounded-lg p-3 text-center">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-bold text-slate-800">{letter}</div>
      <div className="text-xs text-slate-600">{LETTER_NAMES[letter as keyof typeof LETTER_NAMES]}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}
