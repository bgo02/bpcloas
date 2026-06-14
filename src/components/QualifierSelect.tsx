import type { Qualifier } from '@/lib/types';

const OPTIONS: { v: Qualifier; label: string }[] = [
  { v: 0, label: '0' },
  { v: 1, label: '1' },
  { v: 2, label: '2' },
  { v: 3, label: '3' },
  { v: 4, label: '4' },
];

const COLORS: Record<Qualifier, string> = {
  0: 'bg-emerald-600',
  1: 'bg-lime-600',
  2: 'bg-amber-500',
  3: 'bg-orange-600',
  4: 'bg-red-600',
};

interface Props {
  value: Qualifier | undefined;
  onChange: (v: Qualifier) => void;
  disabled?: boolean;
}

export default function QualifierSelect({ value, onChange, disabled }: Props) {
  return (
    <div className="inline-flex gap-1" role="group">
      {OPTIONS.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.v)}
            className={[
              'w-7 h-7 rounded text-xs font-semibold border transition',
              active ? `${COLORS[o.v]} text-white border-transparent` : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400',
              disabled ? 'opacity-40 cursor-not-allowed' : '',
            ].join(' ')}
            title={['Nenhuma', 'Leve', 'Moderada', 'Grave', 'Completa'][o.v]}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
