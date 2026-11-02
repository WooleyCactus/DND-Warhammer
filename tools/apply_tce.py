"""Insert tools/tce_block.js into index.html and guide.html and wire up infusions + career-limited styles.
Safe to re-run: replaces an existing TCE block, skips edits already applied."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
block = (root / 'tools' / 'tce_block.js').read_text(encoding='utf8').strip() + '\n'

EDITS = [
 # infusion group for artificers
 ("if(cls==='fighter'&&sub==='Battle Master'){const n=manCount(level);if(n)g.push({id:'maneuvers',label:'Manoeuvres',max:n});}\n return g;",
  "if(cls==='fighter'&&sub==='Battle Master'){const n=manCount(level);if(n)g.push({id:'maneuvers',label:'Manoeuvres',max:n});}\n if(cls==='artificer'&&typeof INFUSIONS!=='undefined'){const n=infusionCount(level);if(n)g.push({id:'infusions',label:'Machine Blessings (Infusions)',max:n});}\n return g;"),
 ("rows=`<p class=\"note\" style=\"margin-top:0\">${s.dice} superiority dice (d${s.size}), regained on a short or long rest.</p>`+Object.entries(MANEUVERS).map(([k,v])=>row(k,v[1],v[0],v[2],false)).join('');}",
  "rows=`<p class=\"note\" style=\"margin-top:0\">${s.dice} superiority dice (d${s.size}), regained on a short or long rest.</p>`+Object.entries(MANEUVERS).map(([k,v])=>row(k,v[1],v[0],v[2],false)).join('');}\n  if(gp.id==='infusions')rows=`<p class=\"note\" style=\"margin-top:0\">Blessings known. You can keep ${infusedItems(level)} items blessed at once; re-bless them after a long rest.</p>`+Object.entries(INFUSIONS).map(([k,v])=>row(k,v[1],v[0],v[3],level<v[2],level<v[2]?`artificer level ${v[2]}`:'')).join('');"),
 (" (o.maneuvers||[]).forEach(k=>{const v=MANEUVERS[k];if(v)out.push([v[1],v[0],v[2]]);});\n return out;",
  " (o.maneuvers||[]).forEach(k=>{const v=MANEUVERS[k];if(v)out.push([v[1],v[0],v[2]]);});\n (o.infusions||[]).forEach(k=>{const v=typeof INFUSIONS!=='undefined'&&INFUSIONS[k];if(v)out.push([v[1],`Machine Blessing (${v[0]})`,v[3]]);});\n return out;"),
 # styles limited to their careers
 ("${Object.entries(STYLES).map(([k,s])=>bCard(b.style===k,'bstyle'",
  "${Object.entries(STYLES).filter(([k,s])=>!s[3]||s[3].includes(b.cls)).map(([k,s])=>bCard(b.style===k,'bstyle'"),
 ("${Object.entries(STYLES).map(([k,s])=>bCard(lu.style===k,'lustyle'",
  "${Object.entries(STYLES).filter(([k,s])=>!s[3]||s[3].includes(lu.cls)).map(([k,s])=>bCard(lu.style===k,'lustyle'"),
]

for f in ['index.html', 'guide.html']:
    p = root / f
    s = p.read_text(encoding='utf8')
    if '/* TCE-START' in s:
        s = re.sub(r'/\* TCE-START.*?/\* TCE-END \*/\n', lambda m: block, s, flags=re.S)
    else:
        anchor = 'function manCount('
        if s.count(anchor) != 1:
            sys.exit(f'{f}: anchor found {s.count(anchor)} times')
        s = s.replace(anchor, block + anchor)
    for old, new in EDITS:
        if new in s:
            continue
        n = s.count(old)
        print(f'{f}: {old[:50]!r} x{n}')
        s = s.replace(old, new)
    p.write_text(s, encoding='utf8')
print('done')
