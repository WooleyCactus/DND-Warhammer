"""Structured numbers for grenades, consumables and special ammo (shown as stat boxes, like weapons).
Writes /* USE40K-START */ ... /* USE40K-END */ after the ARMOURY40K block in index.html and guide.html.
Re-run safely: python3 tools/use40k.py   then   python3 tools/build_catalog.py
Fields: a=action, r=range, area, dmg, dt=damage type, atk=ranged attack roll, save='DEX 13', half=half on a save,
heal, temp=temp HP, dur=duration, eff=short effect. Keyed by item name squashed to lowercase letters/digits."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = dict(a='Action', r='60 ft')  # thrown grenade defaults
U = {
 # grenades & explosives
 'Frag grenade':        {**G, 'area':'20-ft radius', 'dmg':'2d6', 'dt':'piercing', 'save':'DEX 13', 'half':1},
 'Krak grenade':        {**G, 'area':'One target', 'atk':1, 'dmg':'4d6', 'dt':'force'},
 'Smoke grenade':       {**G, 'area':'20-ft radius', 'dur':'1 minute', 'eff':'Heavy obscurement'},
 'Photon flash grenade':{**G, 'area':'15-ft radius', 'save':'CON 13', 'eff':'Blinded until the end of its next turn'},
 'Melta bomb':          {'a':'Action (placed)', 'r':'Touch', 'area':'One structure', 'dmg':'8d6', 'dt':'fire', 'eff':'Detonates next turn'},
 'Stikkbomb':           {**G, 'r':'40 ft', 'area':'10-ft radius', 'dmg':'2d6', 'dt':'slashing', 'save':'DEX 12', 'half':1, 'eff':'Dud on a d20 roll of 1'},
 'Incendiary grenade':  {**G, 'area':'10-ft radius', 'dmg':'2d6', 'dt':'fire', 'save':'DEX 13', 'dur':'1 minute', 'eff':'Fail: catch fire. Entering or starting there: 1d6 fire'},
 'Stun grenade':        {**G, 'area':'10-ft radius', 'save':'CON 13', 'eff':'Stunned until the end of its next turn'},
 'Choke gas grenade':   {**G, 'area':'20-ft cloud', 'dmg':'2d6', 'dt':'poison', 'save':'CON 13', 'dur':'1 minute', 'eff':'Poisoned while inside; rebreathers protect'},
 'Blind grenade':       {**G, 'area':'20-ft cloud', 'dur':'1 minute', 'eff':'Heavy obscurement; blocks darkvision and auspex'},
 'Web grenade':         {**G, 'area':'10-ft radius', 'save':'DEX 13', 'eff':'Restrained (escape: DC 13 Str, action)'},
 'Haywire grenade':     {**G, 'area':'15-ft radius', 'dmg':'3d6', 'dt':'lightning', 'save':'DEX 14', 'half':1, 'eff':'Machines take double and shut down'},
 'Hallucinogen grenade':{**G, 'area':'20-ft radius', 'save':'WIS 14', 'eff':'Fail: random action next turn (d4)'},
 'Plasma grenade':      {**G, 'area':'10-ft radius', 'dmg':'4d6', 'dt':'fire', 'save':'DEX 14', 'half':1},
 'Demolition charge':   {'a':'Action (placed)', 'r':'Touch', 'area':'20-ft radius', 'dmg':'6d6', 'dt':'thunder', 'save':'DEX 15', 'half':1, 'eff':'Timer or remote; double vs structures'},
 'Holy water (blessed vial)': {'a':'Action', 'r':'20 ft', 'area':'One target', 'atk':1, 'dmg':'2d6', 'dt':'radiant', 'eff':'Daemons and undead only'},
 # consumables
 'Medi-stimm':          {'a':'Bonus action', 'heal':'2d4+2'},
 'Greater medi-stimm':  {'a':'Bonus action', 'heal':'4d4+4'},
 'Combat stimm':        {'a':'Bonus action', 'dur':'1 minute', 'eff':'+10 ft speed, advantage on Str checks; then 1 exhaustion'},
 'De-tox injector':     {'a':'Action', 'eff':'Ends Poisoned'},
 'Medi-kit':            {'a':'Action', 'eff':'Stabilise a dying creature, no check (10 uses)'},
 'Synth-skin patch':    {'a':'Action', 'temp':'2d6+2', 'dur':'1 hour'},
 'Anti-plague serum':   {'a':'Action', 'dur':'24 hours', 'eff':'Cures one disease, or advantage on disease saves'},
 'Obscura':             {'a':'Action', 'dur':'1 hour', 'eff':'Advantage vs frightened; disadvantage on Perception and Insight. Addictive'},
 'Blood-replacement unit': {'a':'Action', 'heal':'4d4+4', 'eff':'Stabilises a dying creature'},
 'Frenzon':             {'a':'Bonus action', 'dur':'1 minute', 'eff':'Advantage on melee attacks, immune to frightened, no reactions'},
 'Slaught':             {'a':'Bonus action', 'dur':'1 minute', 'eff':'+10 ft speed, +2 AC, advantage on Dex saves; then 1 exhaustion'},
 'Spook':               {'a':'Action', 'dur':'10 minutes', 'eff':'Use one random psychic cantrip (GM picks)'},
 # special ammo (changes the loaded weapon)
 'Dum-dum rounds':      {'dmg':'+2', 'eff':'vs unarmoured targets; −1 to hit armoured ones. One reload'},
 'Man-stopper rounds':  {'eff':'Ignore resistance from mundane armour. One reload'},
 'Tox rounds':          {'eff':'Weapon gains Toxic. One reload'},
 'Inferno shells':      {'dmg':'1d4', 'dt':'fire', 'dur':'Until doused', 'eff':'On a hit the target burns at the start of each turn. One reload'},
 'Hot-shot charge pack':{'dmg':'+1d8', 'eff':'Per hit; the weapon gains Overheat. 5 shots'},
 'Kraken penetrator shells': {'eff':'Weapon gains Rending and ignores resistance. One reload'},
 'Hellfire shells':     {'dmg':'+1d6', 'dt':'acid', 'eff':'Per hit; the weapon gains Toxic. One reload'},
 'Frag missile':        {'r':'Launcher', 'area':'Blast', 'dmg':'4d6', 'dt':'fire'},
 'Krak missile':        {'r':'Launcher', 'area':'One target', 'dmg':'6d10', 'dt':'force', 'eff':'Double vs vehicles and structures'},
}
N = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
BLOCK = ('/* USE40K-START */\nconst ITEM_USE=' + json.dumps({N(k): v for k, v in U.items()}, ensure_ascii=False, separators=(',', ':')) +
 ';\nfunction useOf(it){return it?(it.use||ITEM_USE[N(it.name)]||null):null;}\n'
 'STD_ITEMS.forEach(i=>{const u=ITEM_USE[N(i.name)];if(u)i.use=u;});\n/* USE40K-END */')
for f in ('index.html', 'guide.html'):
    p = os.path.join(ROOT, f); s = open(p, encoding='utf-8').read()
    s = re.sub(r'\n?/\* USE40K-START \*/.*?/\* USE40K-END \*/', '', s, flags=re.S)
    assert s.count('/* ARMOURY40K-END */') == 1, f
    s = s.replace('/* ARMOURY40K-END */', '/* ARMOURY40K-END */\n' + BLOCK)
    open(p, 'w', encoding='utf-8').write(s)
print(len(U), 'items')
