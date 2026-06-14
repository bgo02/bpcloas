import { useState } from 'react';
import type { Domain, Qualifier, DomainQualifiers, UnitScores } from '@/lib/types';
import { effectiveDomainQualifier, LETTER_NAMES, LETTERS } from '@/lib/engine';
import QualifierSelect from './QualifierSelect';

interface Props {
  domain: Domain;
  domainQuals: DomainQualifiers;
  unitScores: UnitScores;
  ageMonths: number | null;
  onDomainQual: (group: string, v: Qualifier) => void;
  onUnitScore: (n: number, v: Qualifier) => void;
}

export default function DomainBlock({ domain, domainQuals, unitScores, ageMonths, onDomainQual, onUnitScore }: Props) {
  const [unitsOpen, setUnitsOpen] = useState(false);
  const autoMax = domain.minAgeMonths !== undefined && ageMonths !== null && ageMonths < domain.minAgeMonths;
  const effective = effectiveDomainQualifier(domain, domainQuals, ageMonths);

  return (
    <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
      <div className="bg-slate-100 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-800">
            <span className="text-slate-400 mr-1">{domain.roman}</span>
            {domain.title}
            <span className="ml-2 text-xs font-normal text-slate-400">[{domain.group}]</span>
          </h4>
          {!autoMax && (
            <button
              onClick={() => setUnitsOpen((o) => !o)}
              className="text-xs text-slate-500 hover:text-slate-700 underline shrink-0"
            >
              {unitsOpen ? 'Ocultar unidades' : `Ver ${domain.units.length} unidades`}
            </button>
          )}
        </div>

        <div className="mt-2">
          {autoMax ? (
            <span className="inline-block px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold" title="Corte etário automático">
              4 — Completa (corte etário automático)
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">Qualificador do domínio:</span>
              <QualifierSelect
                value={domainQuals[domain.group] ?? 0}
                onChange={(v) => onDomainQual(domain.group, v)}
              />
              <span className="text-xs text-slate-500">
                → {effective} ({LETTER_NAMES[LETTERS[effective]]})
              </span>
            </div>
          )}
        </div>
      </div>

      {autoMax && (
        <p className="px-3 py-2 text-xs text-slate-500">
          Idade inferior ao corte etário do domínio ({domain.minAgeMonths} meses): qualificador 4 = Completa automático.
        </p>
      )}

      {!autoMax && unitsOpen && (
        <div>
          <p className="px-3 pt-2 text-xs text-amber-700 bg-amber-50 border-t border-amber-200">
            Unidades para referência. O qualificador do domínio acima é o valor registrado no laudo.
          </p>
          <ul className="divide-y divide-gray-100">
            {domain.units.map((u) => (
              <li key={u.n} className="px-3 py-2 flex items-start gap-3">
                <span className="text-xs font-mono text-slate-400 w-7 shrink-0 pt-1">{u.n}</span>
                <span className="text-xs text-slate-700 flex-1 leading-snug">{u.text}</span>
                <div className="shrink-0 pt-0.5">
                  <QualifierSelect value={unitScores[u.n] ?? 0} onChange={(v) => onUnitScore(u.n, v)} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
