#!/usr/bin/env python3
import json, re

d = json.load(open('/tmp/instrument.json', encoding='utf-8'))

# Light OCR fixes for line-wrap artifacts
fixes = {
    'diet a especial': 'dieta especial',
    'qualif icação': 'qualificação',
    'indiv íduo': 'indivíduo',
    'indi víduo': 'indivíduo',
    ' c om ': ' com ',
    'qu e': 'que',
}
def fix(t):
    for a, b in fixes.items():
        t = t.replace(a, b)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

# Domain age cut-offs (months) for Anexo II (menor de 16) — Anexo III
A2_MINAGE = {
    'd6': 84, 'd7': 12, 'd8': 6, 'd9': 36,   # social AP
    'd1': 6,  'd2': 6,  'd3': 12, 'd4': 6, 'd5': 36,  # medical AP
}

def comp_and_eval(group):
    if group.startswith('e'):
        return 'FA', 'social'
    if group.startswith('b'):
        return 'FC', 'medical'
    n = int(group[1:])
    if n >= 6:
        return 'AP', 'social'   # d6-d9
    return 'AP', 'medical'      # d1-d5

def title_case(t):
    # keep as-is (uppercase headings look fine); convert to Title-ish
    return t

def emit(anx_key, anx_id):
    doms = d[anx_key]
    out = []
    for dom in doms:
        group = dom['group']
        comp, ev = comp_and_eval(group)
        minage = A2_MINAGE.get(group) if anx_id == 'a2' else None
        units = ',\n      '.join(
            '{ n: %d, text: %s }' % (u['n'], json.dumps(fix(u['text']), ensure_ascii=False))
            for u in dom['units']
        )
        ma = ('' if minage is None else ' minAgeMonths: %d,' % minage)
        out.append(
            '  {\n'
            '    group: %s, roman: %s, component: %s, evaluator: %s,%s\n'
            '    title: %s,\n'
            '    units: [\n      %s,\n    ],\n'
            '  }'
            % (json.dumps(group), json.dumps(dom['roman']), json.dumps(comp),
               json.dumps(ev), ma, json.dumps(title_case(dom['title']), ensure_ascii=False), units)
        )
    return '[\n' + ',\n'.join(out) + ',\n]'

header = '''// AUTO-GERADO a partir da Portaria Conjunta MDS/INSS nº 2, de 30/03/2015 (Anexos I e II).
// Não editar manualmente — regenerar via scripts de parsing da portaria.
import type { Domain } from './types';

export const ANEXO1_DOMAINS: Domain[] = %s;

export const ANEXO2_DOMAINS: Domain[] = %s;
''' % (emit('anexo1', 'a1'), emit('anexo2', 'a2'))

open('/home/user/atcpcd/src/lib/instrument-data.ts', 'w', encoding='utf-8').write(header)
print('wrote src/lib/instrument-data.ts (%d bytes)' % len(header))
