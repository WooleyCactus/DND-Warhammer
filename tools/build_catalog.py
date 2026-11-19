"""Export the item catalogue from index.html to catalog.json for the GM screen's Items panel.
Run after changing STD_ITEMS / WEAPONS / curios in index.html:  python3 tools/build_catalog.py
Needs Playwright + Chrome (it loads index.html headless and reads the live catalogue)."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = """JSON.stringify({v:1,
 items:[...STD_ITEMS,...STD_WEAPONS,...CURIO_ITEMS].map(x=>{const o=Object.assign({},x);delete o.gmOnly;return o;}),
 cats:CAT_ORDER, d20:LOOT_D20.map(x=>x.id), d13:CURIOS.map(x=>x.id)})"""
async def main():
    exe = os.environ.get('CHROME', '/usr/bin/google-chrome')
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=exe if os.path.exists(exe) else None)
        pg = await b.new_page()
        await pg.goto('file://' + os.path.join(ROOT, 'index.html'))
        await pg.wait_for_timeout(800)
        data = json.loads(await pg.evaluate(JS))
        await b.close()
    with open(os.path.join(ROOT, 'catalog.json'), 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    print(len(data['items']), 'items,', len(data['d20']), 'd20,', len(data['d13']), 'd13')
asyncio.run(main())
