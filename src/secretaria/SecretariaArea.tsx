import { useRef, useState } from 'react';
import type { CanonicalPayload } from '@/lib/schema';
import { extractDataFromPdf, extractDataFromJson } from '@/lib/pdf-read';
import { consolidate } from '@/lib/certidao';
import { abrirCertidaoParaImpressao } from '@/lib/certidao';
import { LETTER_NAMES } from '@/lib/engine';

type Step = 'upload' | 'revisao' | 'consolidacao' | 'certidao';

interface LoadedLaudo {
  payload: CanonicalPayload;
  hashValid: boolean;
  fileName: string;
}

export default function SecretariaArea() {
  const [step, setStep] = useState<Step>('upload');
  const [social, setSocial] = useState<LoadedLaudo | null>(null);
  const [medical, setMedical] = useState<LoadedLaudo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const socialRef = useRef<HTMLInputElement>(null);
  const medicalRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File, type: 'social' | 'medical') {
    setError(null);
    setLoading(true);
    try {
      const result = file.name.endsWith('.json')
        ? await extractDataFromJson(file)
        : await extractDataFromPdf(file);
      if (result.payload.area !== type) {
        throw new Error(`Arquivo carregado no campo ${type === 'social' ? 'social' : 'médico'} mas contém dados de ${result.payload.area === 'social' ? 'avaliação social' : 'avaliação médica'}. Verifique os arquivos.`);
      }
      const loaded: LoadedLaudo = { payload: result.payload, hashValid: result.hashValid, fileName: file.name };
      if (type === 'social') setSocial(loaded);
      else setMedical(loaded);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const consolidated = social && medical ? consolidate(social.payload, medical.payload) : null;

  const steps: Step[] = ['upload', 'revisao', 'consolidacao', 'certidao'];
  const stepLabels = ['1. Upload', '2. Revisão', '3. Consolidação', '4. Certidão'];
  const stepIdx = steps.indexOf(step);

  return (
    <div>
      {/* Step nav */}
      <nav className="flex gap-1 mb-4">
        {steps.map((s, i) => (
          <button key={s}
            onClick={() => setStep(s)}
            disabled={(i === 1 && (!social || !medical)) || (i >= 2 && (!social || !medical))}
            className={['flex-1 text-xs py-1.5 rounded font-medium disabled:opacity-40',
              s === step ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'].join(' ')}>
            {stepLabels[i]}
          </button>
        ))}
      </nav>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-300 rounded p-3 text-sm text-red-800">
          <strong>Erro:</strong> {error}
          <button onClick={() => setError(null)} className="ml-2 underline text-xs">fechar</button>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-3">
            Carregue os dois laudos (PDF ou JSON) gerados pelos peritos com esta ferramenta.
            Os dados são lidos localmente — nenhum arquivo é enviado a servidores.
          </p>
          {(['social', 'medical'] as const).map((type) => {
            const loaded = type === 'social' ? social : medical;
            const ref = type === 'social' ? socialRef : medicalRef;
            const label = type === 'social' ? 'Laudo Social (Assistente Social)' : 'Laudo Médico-Pericial (Perito Médico)';
            return (
              <div key={type} className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">{label}</h3>
                {loaded ? (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-slate-800 font-medium">{loaded.fileName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Avaliado: {loaded.payload.ident.nome || '—'} · CPF: {loaded.payload.ident.cpf || '—'}
                      </p>
                      <p className={['text-xs mt-0.5 font-medium', loaded.hashValid ? 'text-green-700' : 'text-red-700'].join(' ')}>
                        {loaded.hashValid ? '✓ Hash de integridade válido' : '⚠ Hash inválido — dados podem ter sido alterados'}
                      </p>
                    </div>
                    <button
                      onClick={() => { if (type === 'social') setSocial(null); else setMedical(null); }}
                      className="text-xs text-red-600 hover:text-red-800 underline shrink-0"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={ref}
                      type="file"
                      accept=".pdf,.json"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0], type); e.target.value = ''; }}
                    />
                    <button
                      onClick={() => ref.current?.click()}
                      disabled={loading}
                      className="px-4 py-2 text-sm rounded border border-dashed border-gray-400 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {loading ? 'Carregando...' : 'Selecionar arquivo (PDF ou JSON)'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {social && medical && (
            <button
              onClick={() => setStep('revisao')}
              className="w-full bg-slate-800 text-white text-sm font-semibold py-2.5 rounded"
            >
              Continuar para revisão →
            </button>
          )}
        </div>
      )}

      {/* Step 2: Revisão */}
      {step === 'revisao' && social && medical && (
        <div className="space-y-4">
          {[social, medical].map((l) => {
            const isM = l.payload.area === 'medical';
            return (
              <div key={l.payload.area} className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">
                  {isM ? 'Laudo Médico-Pericial' : 'Laudo Social'} — {l.fileName}
                  {!l.hashValid && <span className="ml-2 text-red-600 font-medium text-xs">⚠ hash inválido</span>}
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <KV k="Nome" v={l.payload.ident.nome} />
                  <KV k="CPF" v={l.payload.ident.cpf} />
                  <KV k="NIT" v={l.payload.ident.nit} />
                  <KV k="Data de nascimento" v={l.payload.ident.dataNascimento} />
                  <KV k="Processo" v={l.payload.ident.processo} />
                  <KV k="Data da avaliação" v={l.payload.ident.dataAvaliacao} />
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Domínios registrados: {Object.keys(l.payload.domainQualifiers).join(', ')}
                </div>
              </div>
            );
          })}
          <button
            onClick={() => setStep('consolidacao')}
            className="w-full bg-slate-800 text-white text-sm font-semibold py-2.5 rounded"
          >
            Confirmar e consolidar →
          </button>
        </div>
      )}

      {/* Step 3: Consolidação */}
      {step === 'consolidacao' && social && medical && consolidated && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Resultado Consolidado</h3>
            <div className="grid grid-cols-3 gap-3">
              <ResultCard title="Fatores Ambientais (e)" letter={consolidated.faLetter} sub={`soma = ${consolidated.faSum} · ${consolidated.faPct.toFixed(1)}%`} />
              <ResultCard title="Atividades e Part. (d)" letter={consolidated.apLetter} sub={`soma = ${consolidated.apSum} · ${consolidated.apPct.toFixed(1)}%`} />
              <ResultCard title="Funções do Corpo (b)" letter={consolidated.fcLetter} sub={consolidated.fcElevated ? `base ${consolidated.fcBaseLetter} · elevado` : `base ${consolidated.fcBaseLetter}`} />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              FA da avaliação social · AP combinada (d1–d5 médico, d6–d9 social) · FC da avaliação médica.
            </p>
          </div>
          <button
            onClick={() => setStep('certidao')}
            className="w-full bg-slate-800 text-white text-sm font-semibold py-2.5 rounded"
          >
            Gerar certidão →
          </button>
        </div>
      )}

      {/* Step 4: Certidão */}
      {step === 'certidao' && social && medical && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Gerar Certidão de Avaliação Biopsicossocial</h3>
            <p className="text-xs text-slate-600 mb-4">
              A certidão será gerada como documento HTML formatado para impressão. Escolha "Salvar como PDF" no destino de impressão.
            </p>
            <button
              onClick={() => abrirCertidaoParaImpressao(social.payload, medical.payload)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold py-2.5 rounded"
            >
              Gerar certidão em PDF (imprimir / salvar como PDF)
            </button>
          </div>
          <button
            onClick={() => {
              setSocial(null); setMedical(null); setError(null); setStep('upload');
            }}
            className="w-full text-slate-600 text-sm py-2 rounded border border-gray-200 hover:bg-slate-50"
          >
            Nova certidão
          </button>
        </div>
      )}

      {/* Bottom nav */}
      {step !== 'upload' && step !== 'certidao' && (
        <div className="flex justify-start mt-4">
          <button onClick={() => setStep(steps[stepIdx - 1])}
            className="px-4 py-2 text-sm rounded border border-gray-300 bg-white">
            ← Anterior
          </button>
        </div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="text-slate-400">{k}: </span>
      <span className="text-slate-700 font-medium">{v || '—'}</span>
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
