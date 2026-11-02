"""Insert tools/export_block.js into index.html and wire the buttons, file loading and print styles.
Safe to re-run."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
p = root / 'index.html'
s = p.read_text(encoding='utf8')
block = (root / 'tools' / 'export_block.js').read_text(encoding='utf8').strip() + '\n'

if '/* EXPORT-START' in s:
    s = re.sub(r'/\* EXPORT-START.*?/\* EXPORT-END \*/\n', lambda m: block, s, flags=re.S)
else:
    anchor = '/* ---------- events ---------- */'
    assert s.count(anchor) == 1, 'events anchor'
    s = s.replace(anchor, block + anchor)

CSS = """/* EXPORT-CSS */
#printout{display:none}
@media print{
 @page{margin:12mm}
 body.printing>*:not(#printout){display:none!important}
 html:has(body.printing),body.printing{background:#fff!important;background-image:none!important;color-scheme:light!important}
 body.printing #printout{display:block}
}
#printout .pr{font:10.5pt/1.35 Georgia,'Times New Roman',serif;color:#111;background:#fff}
#printout h1{font:700 20pt/1.1 'Cinzel',Georgia,serif;margin:2px 0 4px;color:#111}
#printout h2{font:700 9.5pt/1.2 'Cinzel',Georgia,serif;letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid #999;margin:10px 0 4px;padding-bottom:2px;color:#111}
#printout p{margin:2px 0}
#printout small{color:#555}
#printout .pr-h{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #111;padding-bottom:6px}
#printout .pr-eyebrow{font-size:8pt;letter-spacing:.12em;text-transform:uppercase;color:#555}
#printout .pr-sub{font-size:9pt;color:#333}
#printout .pr-lvl{text-align:center;font-size:8pt;text-transform:uppercase}
#printout .pr-lvl b{display:block;font-size:22pt}
#printout .pr-vitals{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:8px 0}
#printout .pr-vitals div{border:1px solid #999;padding:4px;text-align:center}
#printout .pr-vitals span{display:block;font-size:7.5pt;text-transform:uppercase;color:#555}
#printout .pr-vitals b{font-size:13pt}
#printout .pr-vitals i{display:block;font-size:7.5pt;font-style:normal;color:#555;margin-top:2px}
#printout .pr-cols{display:grid;grid-template-columns:1fr 1.5fr;gap:14px}
#printout .pr-t{border-collapse:collapse;width:100%;font-size:9pt}
#printout .pr-t th,#printout .pr-t td{border-bottom:1px solid #ddd;padding:1px 4px;text-align:left;vertical-align:top}
#printout .pr-t th{font-size:7.5pt;text-transform:uppercase;color:#555}
#printout .pr-sk td:first-child{width:12px}
#printout .pr-pw{font-size:9pt;margin:2px 0}
#printout .pr-feat{font-size:9.5pt}
#printout section,#printout .pr-t tr{break-inside:avoid-page}
#printout .pr-foot{margin-top:10px;font-size:7.5pt;color:#777;border-top:1px solid #ccc;padding-top:3px}
/* /EXPORT-CSS */
"""
if '/* EXPORT-CSS */' in s:
    s = re.sub(r'/\* EXPORT-CSS \*/.*?/\* /EXPORT-CSS \*/\n', lambda m: CSS, s, flags=re.S)
else:
    i = s.find('</style>')
    s = s[:i] + CSS + s[i:]

EDITS = [
 # buttons on the sheet (also for the example character)
 ("<button class=\"btn ghost\" data-act=\"edit\">Edit 5e source</button>",
  "<button class=\"btn ghost\" data-act=\"edit\">Edit 5e source</button><button class=\"btn ghost\" data-act=\"savefile\">Save to file</button><button class=\"btn ghost\" data-act=\"printsheet\">Print</button>"),
 # click handling
 (" if(a==='levelup'){const c=cur();",
  " if(a==='savefile'||a==='printsheet'){const c=S.cur==='example'?exampleChar():cur();if(c){if(a==='savefile')backupChar(c);else printSheet(c);}return;}\n if(a==='levelup'){const c=cur();"),
 # load a backup from the import screen
 ("  }else throw new Error(`\"${name}\" isn't a PDF or spreadsheet. Use a D&D Beyond PDF, .xlsx, .xls or .csv.`);",
  "  }else if(ext==='json'){restoreBackup(await file.text());return;}\n  else throw new Error(`\"${name}\" isn't a PDF, spreadsheet or character backup. Use a D&D Beyond PDF, .xlsx, .xls, .csv or a saved .rtm.json file.`);"),
 ("accept=\".pdf,.xlsx,.xls,.xlsm,.csv,application/pdf\"",
  "accept=\".pdf,.xlsx,.xls,.xlsm,.csv,.json,application/pdf,application/json\""),
 ("<span class=\"muted\">D&amp;D Beyond PDF export, or an .xlsx / .xls / .csv character sheet</span>",
  "<span class=\"muted\">D&amp;D Beyond PDF export, an .xlsx / .xls / .csv character sheet, or a saved character backup (.rtm.json)</span>"),
 ("  <div><h3>What converts</h3>",
  "  <div><h3>Character backups</h3><p>On any sheet, Save to file downloads that character. Load the file here to restore it on any device, exactly as it was, including HP and spent slots.</p></div>\n  <div><h3>What converts</h3>"),
]
for old, new in EDITS:
    if new in s:
        continue
    n = s.count(old)
    if n != 1:
        sys.exit(f'edit not found exactly once ({n}): {old[:60]!r}')
    s = s.replace(old, new)
p.write_text(s, encoding='utf8')
print('done')
