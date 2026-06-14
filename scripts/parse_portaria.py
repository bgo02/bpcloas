#!/usr/bin/env python3
import re, json

lines = open('/tmp/portaria.txt', encoding='utf-8').read().split('\n')

# Strip line-number prefix produced by `Read`? No: this is raw pdftotext output. Keep as-is.

# Determine anexo boundaries by marker lines
def find(sub, start=0):
    for i in range(start, len(lines)):
        if sub in lines[i]:
            return i
    return -1

a1_start = find('ANEXO I')
a2_start = find('ANEXO II')
a3_start = find('ANEXO III')

anexo1_lines = lines[a1_start:a2_start]
anexo2_lines = lines[a2_start:a3_start]

footer_re = re.compile(r'Avaliação da Pessoa com Deficiência para acesso ao BPC')
qualify_re = re.compile(r'^\s*\(Qualifique de 0 a 4')
domhdr_re = re.compile(r'^\s*([IVXLC]+)\s*[–-]\s*(.+?)\s*[–-]\s*([edb]\d)\s*:')
unit_re = re.compile(r'^\s*(\d+)\.\s+(.*)$')
qualdom_re = re.compile(r'Qualificador do domínio')

def parse(anexo_lines):
    domains = []  # list of dict: group,title,roman,units[]
    cur = None
    cur_unit = None
    expected_next = 1
    for raw in anexo_lines:
        line = raw.rstrip()
        if footer_re.search(line):
            continue
        if qualify_re.match(line):
            continue
        m = domhdr_re.match(line)
        if m:
            # finalize pending unit
            cur_unit = None
            roman, title, group = m.group(1), m.group(2).strip(), m.group(3)
            cur = {'group': group, 'roman': roman, 'title': title, 'units': []}
            domains.append(cur)
            continue
        if qualdom_re.search(line):
            cur_unit = None
            continue
        um = unit_re.match(line)
        if um and cur is not None:
            num = int(um.group(1))
            # avoid catching stray numbers (years etc). Accept only sequential-ish unit numbers.
            txt = um.group(2).strip()
            cur_unit = {'n': num, 'text': txt}
            cur['units'].append(cur_unit)
            continue
        # continuation line of current unit
        if cur_unit is not None and line.strip():
            cur_unit['text'] += ' ' + line.strip()
    return domains

def clean(domains):
    for d in domains:
        good = []
        for u in d['units']:
            t = re.sub(r'\s+', ' ', u['text']).strip()
            t = t.replace('- ', '-') if False else t
            u['text'] = t
            good.append(u)
        d['units'] = good
    return domains

d1 = clean(parse(anexo1_lines))
d2 = clean(parse(anexo2_lines))

def summarize(name, doms):
    print(f"=== {name} ===")
    total = 0
    for d in doms:
        nums = [u['n'] for u in d['units']]
        total += len(nums)
        rng = f"{nums[0]}-{nums[-1]}" if nums else "EMPTY"
        print(f"  {d['group']:3} ({d['roman']:>5}) {d['title'][:40]:40} units={len(nums):2} [{rng}]")
    print(f"  TOTAL units = {total}")

summarize("ANEXO I", d1)
summarize("ANEXO II", d2)

json.dump({'anexo1': d1, 'anexo2': d2}, open('/tmp/instrument.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
print("\nwrote /tmp/instrument.json")
