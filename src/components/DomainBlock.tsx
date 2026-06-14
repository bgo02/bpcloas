import type { Domain, Qualifier, ScoreMap, DomainOverride } from '@/lib/types';
import { domainQualifier, LETTERS, LETTER_NAMES } from '@/lib/engine';
import QualifierSelect from './QualifierSelect';

const QUAL_NAME = ['Nenhuma', 'Leve', 'Moderada', 'Grave', 'Completa'];

interface Props {
  domain: Domain;
  scores: ScoreMap;
  override: DomainOverride;
  ageMonths: number | null;
  onScore: (n: number, v: Qualifier) => void;
  onOverride: (group: string, v: Qualifier | undefined) => void;
}

export default function DomainBlock({ domain, scores, override, ageMonths, onScore, onOverride }: Props) {
  const autoMax = domain.minAgeMonths !== undefined && ageMonths !== null && ageMonths < domain.minAgeMonths;
  const effective = domainQualifier(domain, scores, override, ageMonths);
  const computedMax = domain.units.reduce<Qualifier>((m, u) => {
    const s = scores[u.n];
    return s !== undefined && s > m ? s : m;
  }, 0);

  return (
    <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
      <div className="bg-slate-100 px-3 py-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800">
          <span className="text-slate-400 mr-1">{domain.roman}</span>
          {domain.title}
          <span className="ml-2 text-xs font-normal text-slate-400">[{domain.group}]</span>
        </h4>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Qualif. do domínio:</span>
          {autoMax ? (
            <span className="px-2 py-1 rounded bg-red-600 text-white font-semibold" title="Corte etário automático">
              4 — Completa (corte etário)
            </span>
          ) : (
            <select
              className="border border-gray-300 rounded px-1.5 py-1 bg-white"
              value={override[domain.group] ?? ''}
              onChange={(e) => onOverride(domain.group, e.target.value === '' ? undefined : (Number(e.target.value) as Qualifier))}
            >
              <option value="">auto (máx. = {computedMax} · {LETTERS[effective]})</option>
              {[0, 1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>{q} — {QUAL_NAME[q]}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {autoMax ? (
        <p className="px-3 py-2 text-xs text-slate-500">
          Idade inferior ao corte etário do domínio ({domain.minAgeMonths} meses): dificuldade máxima automática
          (qualificador 4 = Completa), conforme Anexo III. Unidades não precisam ser preenchidas.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {domain.units.map((u) => (
            <li key={u.n} className="px-3 py-2 flex items-start gap-3">
              <span className="text-xs font-mono text-slate-400 w-7 shrink-0 pt-1">{u.n}</span>
              <span className="text-xs text-slate-700 flex-1 leading-snug">{u.text}</span>
              <div className="shrink-0 pt-0.5">
                <QualifierSelect value={scores[u.n]} onChange={(v) => onScore(u.n, v)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="px-3 py-1.5 bg-slate-50 text-xs text-slate-500 border-t border-gray-100">
        Qualificador efetivo: <strong className="text-slate-700">{effective} — {LETTER_NAMES[LETTERS[effective]]}</strong>
      </div>
    </div>
  );
}
