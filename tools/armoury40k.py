"""Expanded 40k armoury for the Rogue Trader Manifest.
Generates the /* ARMOURY40K-START */ ... /* ARMOURY40K-END */ block and inserts it into index.html and
guide.html just before `const STD_WEAPONS=`. Safe to re-run (replaces the block). All text is original.
Then run tools/build_catalog.py so the GM screen picks the changes up.

Weapons: each new weapon gets its own key (= the name with only letters/digits, lowercase), registered in
W5E (5e-style stats used for the attack maths) and WEAPONS (the 40k display data). A character's stored weapon
name must contain the key, so the key is always the squashed name.
Prices are in Thrones (1 gp = 10 Thrones); cost None = not for sale."""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())

# ---- new weapon traits (our own rules text) ----
PROPS = {
 'Two-handed': 'Needs both hands to attack with.',
 'Light': 'Small and quick: works with two-weapon fighting.',
 'Finesse': 'Use Strength or Dexterity for attack and damage.',
 'Versatile': 'One or two hands; two hands use the next die size up.',
 'Reach': 'Adds 5 ft to your melee reach.',
 'Thrown': 'Can be thrown at the range shown, using the same ability as a melee attack.',
 'Heavy': 'Needs Strength 13 (melee) or Dexterity 13 (ranged), or attacks have disadvantage. Small creatures have disadvantage.',
 'Loading': 'Only one shot per action, bonus action or reaction, however many attacks you have.',
 'Brace': 'If you moved this turn, attacks have disadvantage unless you spent a bonus action bracing it (or you are prone or resting it on cover).',
 'Blast': 'On a hit, other creatures within 5 ft of the target make a DC 13 Dex save or take half the damage. On a miss, the shot still lands near the target: everything within 5 ft of it makes that save.',
 'Flame': 'No attack roll. Everything in a cone as long as the range shown makes a DC 13 Dex save: full damage on a fail, half on a success. Ignores half and three-quarters cover. Creatures that fail catch fire (1d4 fire at the start of each turn until someone uses an action to douse them).',
 'Melta': 'Within the first range number, roll the damage dice twice and add them together. Against objects, vehicles and constructs at that range, roll them three times.',
 'Rending': 'Scores a critical hit on a 19 or 20.',
 'Toxic': 'On a hit, the target makes a DC 13 Con save or is poisoned until the end of its next turn.',
 'Concussive': 'On a hit, a Large or smaller target makes a DC 14 Str save or is knocked prone.',
 'Force': 'In a psyker\'s hands: once per turn on a hit, spend a power slot to add 1d8 psychic damage per slot level.',
 'Unwieldy': 'Too heavy to swing fast: only one attack with it per turn, and no opportunity attacks with it.',
 'Pair': 'Made to be used in pairs. With one in each hand, your bonus-action attack adds your ability modifier to damage.',
 'Haywire': 'Deals double damage to constructs, servitors, vehicles and anything in powered armour. A device it hits shuts down until the end of its next turn.',
 'Inaccurate': 'Ork engineering: attack rolls with it take a −2 penalty.',
 'Accurate': 'If you have not moved this turn, add +2 to the attack roll.',
 'Storm': 'Twin barrels: once per turn when you hit, fire again at the same target for one more shot (a second attack roll).',
 'Snare': 'Deals no lasting harm: on a hit the target is restrained (escape with a DC 13 Str or Dex check, as an action).',
 'Bayonet': 'Has a blade fitted: you can make melee attacks with it for 1d6 piercing (Strength).',
 'Hidden': 'Built into a ring, glove or ornament. It can only be spotted by someone who searches you closely.',
 'Recharge': 'Its charge comes back each dawn.',
 'Cursed': 'Daemon-bound. Each day you carry it, make a DC 12 Wis save or gain 1 Corruption. It does not want to be put down.',
 'Shock': 'On a hit, the target can\'t take reactions until its next turn.',
 'Power': 'Ignores resistance to slashing, piercing and bludgeoning damage from mundane armour.',
}

# ---- new weapons ----
# (name, class, rarity, dice, dtype, range, clip, props, cost, desc)
# class: pistol | basic | special | heavy | thrown | melee | twohanded | exotic
W = [
 # pistols
 ('Autopistol','pistol','common','1d6','piercing','50/150',18,['Light','Burst'],250,'A cheap automatic sidearm found in every hive gang and ship crew. It sprays more than it aims, but it keeps heads down.'),
 ('Hand cannon','pistol','uncommon','1d10','piercing','40/120',5,['Reliable'],500,'An oversized stub revolver beloved of bounty hunters and Rogue Trader bodyguards. Five shots, each one a statement.'),
 ('Duelling pistol','pistol','uncommon','1d10','piercing','60/180',1,['Light','Loading','Accurate'],800,'A noble\'s single-shot pistol with an engraved barrel, made for affairs of honour at twenty paces.'),
 ('Bolt pistol','pistol','rare','2d4','piercing','40/120',8,['Explosive'],2500,'A compact bolter that fires rocket-propelled shells which detonate inside the target. Carried by officers, Rogue Traders and anyone who wants to be taken seriously.'),
 ('Hellpistol','pistol','rare','1d10','radiant','40/120',10,['Light','Rending'],3000,'A las pistol fed from a backpack power pack. Its overcharged bolts burn through flak like paper. Favoured by storm troopers and Inquisitorial agents.'),
 ('Plasma pistol','pistol','rare','2d6','fire','40/120',6,['Light','Overheat'],6000,'A sidearm that fires sun-hot bolts of plasma. Devastating, temperamental, and prone to cooking the hand that holds it.'),
 ('Inferno pistol','pistol','veryrare','4d6','fire','15/30',3,['Light','Melta'],18000,'A hand-sized melta weapon of exquisite workmanship. At arm\'s length it turns armour into slag. Few forges can still make them.'),
 ('Hand flamer','pistol','uncommon','2d6','fire','15',4,['Light','Flame'],1200,'A short-barrelled promethium sprayer for clearing corridors and settling arguments in tight spaces.'),
 ('Web pistol','pistol','uncommon','1','bludgeoning','30/60',1,['Light','Loading','Snare'],600,'Fires a spray of fast-hardening filaments that wraps a target up without killing it. Popular with Arbites and slavers.'),
 ('Slugga','pistol','common','1d8','piercing','40/120',10,['Light','Inaccurate'],100,'An Ork pistol: a pipe, a trigger and a lot of optimism. Loud enough to count as a war cry.'),
 ('Shuriken pistol','pistol','rare','1d8','slashing','40/120',40,['Light','Rending'],4000,'An Aeldari sidearm that fires monomolecular discs shaved from a crystal core. Silent, elegant and terribly sharp.'),
 ('Splinter pistol','pistol','rare','1d4','piercing','40/120',20,['Light','Toxic'],3500,'A Drukhari pistol that flings poisoned crystal slivers. It is made to hurt, not to kill quickly.'),
 ('Pulse pistol','pistol','rare','1d8','radiant','60/180',12,['Light','Reliable'],3000,'A T\'au sidearm firing induction-driven plasma pulses. Clean lines, steady output, no prayers required.'),
 # basic (rifles)
 ('Lascarbine','basic','common','1d8','radiant','80/240',40,['Two-handed','Reliable','Burst'],250,'A shortened lasgun for vehicle crews, scouts and boarding parties. Lighter, faster to swing round a corner.'),
 ('Long-las','basic','uncommon','1d12','radiant','150/600',20,['Two-handed','Heavy','Reliable','Accurate'],1500,'A long-barrelled sniper las with a precision scope. Feral-world hunters and Guard marksmen swear by them.'),
 ('Hunting rifle','basic','common','1d10','piercing','150/450',5,['Two-handed'],300,'A bolt-action stub rifle for game hunting on frontier worlds. Simple, accurate and easy to repair.'),
 ('Pump shotgun','basic','common','1d8','piercing','30/90',6,['Two-handed','Scatter'],200,'A cheaper, slower cousin of the combat shotgun, found behind every hive bar.'),
 ('Needle rifle','basic','rare','1d6','piercing','120/360',6,['Two-handed','Silent','Toxic','Accurate'],4000,'Fires a laser-guided toxin needle without a sound. The preferred tool of assassins and very patient people.'),
 ('Storm bolter','basic','veryrare','2d6','piercing','90/270',30,['Two-handed','Explosive','Storm'],20000,'Two boltguns welded side by side with a single trigger. A weapon of Terminators and Inquisitors.'),
 ('Shoota','basic','common','1d10','piercing','60/180',30,['Two-handed','Burst','Inaccurate'],200,'An Ork automatic rifle. It has a magazine, a trigger and several bits nobody can explain.'),
 ('Kroot rifle','basic','uncommon','1d10','piercing','120/360',6,['Two-handed','Bayonet'],800,'A long slug-thrower fitted with curved blades at both ends, as handy in a melee as at range.'),
 ('Shuriken catapult','basic','rare','1d10','slashing','90/270',60,['Two-handed','Burst','Rending'],6000,'The Aeldari warrior\'s rifle: a hail of razor discs fired by gravitic pulses.'),
 ('Splinter rifle','basic','rare','1d6','piercing','120/360',30,['Two-handed','Burst','Toxic'],5000,'The standard Drukhari rifle. Every splinter carries a venom chosen for how long it takes to work.'),
 ('Pulse rifle','basic','rare','1d12','radiant','150/450',20,['Two-handed','Reliable'],7000,'A T\'au infantry rifle with range and punch that put Imperial lasguns to shame.'),
 ('Arc rifle','basic','rare','2d6','lightning','90/270',12,['Two-handed','Haywire'],6500,'A Mechanicus weapon that hurls bolts of electricity, frying machines and the people inside them.'),
 ('Radium carbine','basic','rare','1d8','necrotic','90/270',20,['Two-handed','Burst','Toxic'],5000,'Skitarii carbine firing radioactive rounds. Anyone who survives the hit has a long illness to look forward to.'),
 ('Galvanic rifle','basic','veryrare','2d8','piercing','150/600',8,['Two-handed','Accurate','Rending'],15000,'A Skitarii sniper rifle whose rounds turn the target\'s own bio-electricity against them.'),
 ('Volkite caliver','basic','legendary','3d8','fire','90/270',12,['Two-handed','Burst','Blast'],None,'A dark-age heat-ray weapon. Targets do not burn so much as flash into ash. The Mechanicus would kill to own one.'),
 ('Gauss flayer','basic','legendary','2d10','necrotic','120/360',30,['Two-handed','Reliable','Rending'],None,'An ancient xenos weapon that strips its target apart molecule by molecule. It hums, and it never needs reloading by any human means.'),
 # special
 ('Flamer','special','uncommon','3d6','fire','30',6,['Two-handed','Flame'],1500,'A promethium projector, the classic tool for purging hives, heretics and anything with too many legs.'),
 ('Plasma gun','special','rare','2d8','fire','90/270',10,['Two-handed','Overheat'],8000,'A rifle that fires star-hot bolts of plasma. It kills almost anything it hits, and sometimes its owner.'),
 ('Meltagun','special','veryrare','4d8','fire','20/40',5,['Two-handed','Melta'],16000,'A short-range fusion gun that turns tank armour into dripping slag. The Imperium\'s answer to big problems.'),
 ('Fusion gun','special','veryrare','4d8','fire','20/40',4,['Two-handed','Melta'],18000,'The Aeldari version of the meltagun: lighter, prettier, just as final.'),
 ('Grenade launcher','special','uncommon','3d6','piercing','90/270',6,['Two-handed','Loading','Blast'],1500,'Fires grenades well beyond throwing range. Shown with frag; load krak, smoke or anything else and it uses that grenade\'s effect.'),
 ('Webber','special','uncommon','1','bludgeoning','30/90',4,['Two-handed','Snare'],1000,'A long-barrelled web projector for taking prisoners, or for keeping things in place while you leave.'),
 # heavy
 ('Heavy stubber','heavy','uncommon','2d6','piercing','120/480',60,['Two-handed','Heavy','Burst','Brace'],2000,'A belt-fed machine gun found on every ship turret and hive militia barricade.'),
 ('Big shoota','heavy','uncommon','2d8','piercing','90/360',60,['Two-handed','Heavy','Burst','Brace','Inaccurate'],1500,'A shoota, but bigger, louder and with a longer belt. The Orks consider this an improvement in every way.'),
 ('Rokkit launcha','heavy','uncommon','3d8','fire','90/270',1,['Two-handed','Heavy','Loading','Blast','Inaccurate'],1800,'A tube, a rokkit and an Ork who believes. Goes off with a bang, eventually, somewhere.'),
 ('Missile launcher','heavy','rare','4d6','fire','150/600',4,['Two-handed','Heavy','Loading','Blast','Brace'],12000,'A shoulder-fired launcher shown with frag missiles. Krak missiles turn it into a tank killer (see Ammunition).'),
 ('Heavy flamer','heavy','rare','4d6','fire','30',10,['Two-handed','Heavy','Flame','Brace'],9000,'A flamer with a backpack tank and a nozzle like a drainpipe. Nothing comes out of the corridor afterwards.'),
 ('Heavy bolter','heavy','veryrare','2d10','piercing','150/600',60,['Two-handed','Heavy','Explosive','Burst','Brace'],25000,'A belt-fed bolter that chews through infantry, light vehicles and cover alike. The backbone of many a last stand.'),
 ('Autocannon','heavy','veryrare','3d8','piercing','200/800',20,['Two-handed','Heavy','Blast','Brace'],22000,'A rapid-firing cannon that throws high-explosive shells. Normally mounted on vehicles; carried by the very strong or the very servitor.'),
 ('Lascannon','heavy','veryrare','5d10','radiant','300/1200',5,['Two-handed','Heavy','Loading','Brace'],30000,'A las weapon built to punch through tank armour at long range. One shot, then a long, nervous wait for the recharge.'),
 ('Assault cannon','heavy','legendary','2d8','piercing','120/480',100,['Two-handed','Heavy','Burst','Rending','Brace'],None,'A rotary cannon that spits a storm of shells. Normally only Space Marine Terminators carry one.'),
 ('Plasma cannon','heavy','legendary','4d10','fire','120/360',4,['Two-handed','Heavy','Overheat','Blast','Brace'],None,'A plasma weapon the size of a person. Its shots land like small suns.'),
 ('Multi-melta','heavy','legendary','6d8','fire','40/80',4,['Two-handed','Heavy','Melta','Brace'],None,'A twin-barrelled melta for dissolving tanks, bulkheads and gates.'),
 # thrown
 ('Throwing axe','thrown','common','1d6','slashing','20/60',None,['Light','Thrown'],50,'A balanced hatchet for throwing. Feral-world warriors carry a brace of them.'),
 ('Bolas','thrown','common','1','bludgeoning','20/60',None,['Thrown','Snare'],20,'Weighted cords that wrap round legs. Primitive, cheap and annoyingly effective.'),
 # one-handed melee
 ('Mono-knife','melee','uncommon','1d6','piercing','',None,['Finesse','Light','Rending'],600,'A knife with a monomolecular edge. It cuts through flak, bone and bad decisions.'),
 ('Choppa','melee','common','1d10','slashing','',None,[],50,'An Ork cleaver the size of a door. Subtlety was never on the table.'),
 ('Electro-flail','melee','uncommon','1d8','bludgeoning','',None,['Reach','Shock'],900,'A whip of charged cables used by slavers, Arbites and the more enthusiastic Ecclesiarchy preachers.'),
 ('Taser goad','melee','uncommon','1d6','lightning','',None,['Reach','Shock'],800,'A Mechanicus prod for herding servitors and other reluctant flesh.'),
 ('Power maul','melee','rare','1d8','bludgeoning','',None,['Power','Shock'],3000,'A club sheathed in a disruption field, the badge of Arbites and enforcers across the Imperium.'),
 ('Power axe','melee','rare','1d10','slashing','',None,['Versatile','Power'],3000,'An axe whose edge crackles with a disruption field. Favoured by Rogue Trader house guards and Tech-Priests.'),
 ('Omnissian axe','melee','rare','1d10','slashing','',None,['Versatile','Power','Haywire'],7000,'The sacred axe of the Mechanicus, part tool, part weapon, part prayer.'),
 ('Force sword','melee','rare','1d8','slashing','',None,['Finesse','Force'],6000,'A blade laced with psychoactive circuitry. In a psyker\'s hand it cuts souls as easily as flesh.'),
 ('Force axe','melee','rare','1d10','slashing','',None,['Versatile','Force'],6000,'A heavy psychic weapon carried by battle-psykers and Librarians.'),
 ('Power klaw','melee','rare','2d8','bludgeoning','',None,['Power','Unwieldy'],4000,'An Ork power claw: huge, crude and capable of folding a man in half.'),
 ('Power fist','melee','veryrare','2d8','bludgeoning','',None,['Power','Unwieldy','Concussive'],18000,'An armoured gauntlet wrapped in a disruption field. It can tear open a bulkhead, or a tank.'),
 ('Lightning claw','melee','veryrare','1d10','slashing','',None,['Power','Rending','Pair'],16000,'A gauntlet with long energised talons. Usually worn in pairs, by those who like it close and personal.'),
 ('Witchblade','melee','veryrare','1d8','slashing','',None,['Finesse','Force','Rending'],15000,'An Aeldari psychic blade of wraithbone, sung into shape rather than forged.'),
 ('Agoniser','melee','veryrare','1d6','slashing','',None,['Finesse','Reach','Toxic'],14000,'A Drukhari whip or blade that fires every pain nerve at once. Victims rarely stay standing to scream.'),
 ('Daemon blade','melee','legendary','2d6','necrotic','',None,['Versatile','Power','Cursed'],None,'A sword with something bound inside it. It whispers, it thirsts, and it is very, very good at what it does.'),
 ('Crozius arcanum','melee','legendary','1d10','bludgeoning','',None,['Power','Concussive'],None,'The holy power maul of a Chaplain, topped with a winged skull. Daemons and heretics have extra reason to fear it.'),
 # two-handed melee
 ('Chain-glaive','twohanded','uncommon','1d12','slashing','',None,['Heavy','Reach','Two-handed','Chain (crit +1d6)'],1200,'A chain blade on a long haft, used to keep the enemy at a screaming distance.'),
 ('Big choppa','twohanded','uncommon','2d6','slashing','',None,['Heavy','Two-handed','Inaccurate'],400,'A two-handed Ork cleaver. The Inaccurate trait applies to the target\'s survival chances too.'),
 ('Executioner\'s axe','twohanded','rare','2d6','slashing','',None,['Heavy','Two-handed','Rending'],3500,'The great axe of Ecclesiarchy executioners and penitent warriors, heavy with purity seals.'),
 ('Great power sword','twohanded','veryrare','2d8','slashing','',None,['Heavy','Two-handed','Power'],20000,'A relic-grade two-handed power sword, often a family heirloom passed down a Rogue Trader line.'),
 ('Force halberd','twohanded','veryrare','1d12','slashing','',None,['Heavy','Reach','Two-handed','Force'],18000,'A psychic polearm carried by Grey Knights and other daemon-hunters.'),
 ('Thunder hammer','twohanded','veryrare','2d10','bludgeoning','',None,['Heavy','Two-handed','Power','Concussive'],22000,'A hammer that unleashes a thunderclap of energy on impact. The impact is the easy part to survive.'),
 ('Daemonhammer','twohanded','legendary','2d10','radiant','',None,['Heavy','Two-handed','Power','Concussive'],None,'A thunder hammer inscribed with litanies of banishment. Against daemons, it deals double damage.'),
 # exotic / archeotech
 ('Digi-laser','exotic','legendary','3d6','radiant','15/30',1,['Light','Hidden','Recharge'],None,'A jewel-sized laser hidden in a ring. One shot, then a day of looking innocent.'),
 ('Digi-flamer','exotic','legendary','2d6','fire','10',1,['Light','Hidden','Flame','Recharge'],None,'A ring that breathes fire once a day. Popular with Inquisitors who dislike surprises.'),
 ('Grav-gun','exotic','legendary','3d8','force','60/120',6,['Two-handed','Heavy','Concussive'],None,'An archeotech weapon that crushes its target under its own multiplied weight.'),
]

# ---- annotations for the 38 weapons the app already had (5e key -> class, rarity, cost, desc[, extra props]) ----
ANN = {
 'club':('melee','common',10,'A weighted cudgel. Every hive enforcer starts with one.'),
 'dagger':('melee','common',20,'A plain combat knife: utility tool, last resort and the most honest weapon in the galaxy.'),
 'greatclub':('twohanded','uncommon',200,'A slab of iron sized for an Ogryn. Humans can lift it. Swinging it is another matter.'),
 'handaxe':('melee','common',50,'A small hatchet, good for chopping, throwing and settling disputes on the lower decks.'),
 'javelin':('thrown','common',5,'A light throwing spear for hunting and skirmishes on feral worlds.'),
 'lighthammer':('melee','common',20,'A one-handed hammer, as handy for ship repairs as for heads.'),
 'mace':('melee','uncommon',500,'A short maul with a shock generator in the head. Arbites call it "the conversation ender".'),
 'quarterstaff':('twohanded','rare',2500,'A psyker\'s staff threaded with psychoactive circuitry. Doubles as a walking stick and a warning.',['Versatile','Force']),
 'sickle':('melee','common',10,'A hooked blade for cutting cables, crops and hamstrings.'),
 'spear':('melee','common',10,'A simple spear. Feral warriors and desperate militias still trust them.'),
 'dart':('thrown','common',5,'Balanced knives for throwing. Carry several.'),
 'lightcrossbow':('basic','common',250,'The Imperial Guard\'s standard rifle. It fires focused light, never jams and recharges from almost any power source.'),
 'shortbow':('basic','common',250,'A cheap automatic rifle firing solid rounds. Less reliable than a lasgun, but easy to feed.'),
 'sling':('pistol','common',10,'A simple revolver or autoloading stub gun. Every hive sells them, most of them work.'),
 'battleaxe':('melee','uncommon',100,'An axe with a motorised chain of teeth. Messy, loud and effective.'),
 'flail':('melee','common',100,'A spiked ball on a chain, popular with Ecclesiarchy zealots.'),
 'glaive':('twohanded','rare',3000,'A long blade on a haft, sheathed in a disruption field. A weapon of honour guards.'),
 'greataxe':('twohanded','uncommon',300,'A two-handed chain-axe. Heavy, brutal and very loud.'),
 'greatsword':('twohanded','rare',2500,'A huge two-handed chainsword, favoured by Ecclesiarchy crusaders. It needs both hands and some faith.'),
 'halberd':('twohanded','rare',3000,'An axe-headed polearm wrapped in a disruption field, carried by palace guards and Custodian imitators.'),
 'lance':('melee','rare',3000,'A long power lance for mounted charges, or for very determined people on foot.'),
 'longsword':('melee','common',150,'A sword with a motorised chain of teeth. The iconic close-combat weapon of the Imperium.'),
 'maul':('twohanded','uncommon',250,'A heavy two-handed maul with a crude shock charge. Cheaper cousin of the thunder hammer.'),
 'morningstar':('melee','common',150,'A heavy maul with a spiked head. Crude, reliable, terrifying.'),
 'pike':('twohanded','uncommon',500,'A long pike with an energised tip, for holding a line.'),
 'rapier':('melee','rare',2750,'A slim blade sheathed in a crackling disruption field. The mark of officers, nobles and Rogue Traders.'),
 'scimitar':('melee','common',250,'A curved fencing sabre for nobles and void-duellists.'),
 'shortsword':('melee','common',100,'A short stabbing sword, standard issue for boarding parties.'),
 'trident':('melee','common',50,'A three-pronged spear, favoured by gladiators in the pit-fights of the underhive.'),
 'warpick':('melee','rare',2650,'A power-field pick for breaching armour plate. Tech-Priests carry them as tools.'),
 'warhammer':('melee','rare',2650,'A one-handed hammer sheathed in a disruption field.'),
 'whip':('melee','uncommon',200,'A whip that stimulates every nerve it touches. A slaver\'s favourite.'),
 'blowgun':('pistol','uncommon',1000,'A silent pistol that fires toxin-coated needles. An assassin\'s tool.'),
 'handcrossbow':('pistol','common',400,'The standard Imperial sidearm: a las pistol that never jams and never runs dry for long.'),
 'heavycrossbow':('basic','rare',5000,'The holy bolter: rocket-propelled shells that explode inside the target. Rare outside the Astartes and the very rich.'),
 'longbow':('basic','uncommon',2500,'A las rifle wired to a backpack power pack, firing overcharged bolts that punch through armour.'),
 'shotgun':('basic','common',350,'A pump or semi-automatic shotgun, the boarding party\'s best friend.'),
 'net':('thrown','common',100,'A weighted net laced with gravitic tension, for taking prisoners.'),
}

# ---- prices for items the app already had (name -> Thrones) ----
OLD_COST = {'Frag grenade':500,'Krak grenade':800,'Smoke grenade':50,'Photon flash grenade':400,'Melta bomb':5000,
 'Medi-stimm':500,'Greater medi-stimm':1500,'Combat stimm':800,'De-tox injector':500,'Medi-kit':50,'Corpse-starch bars':5,'Recaf flask':20,
 'Spare power cell':30,'Bolt shells':150,'Shotgun shells':15,'Stub rounds':10,'Promethium canister':100,'Plasma flask':1500,
 'Glow-globe':10,'Grapnel and cable':30,'Magnoculars':250,'Auspex':500,'Multikey':250,'Rebreather':200,'Void suit':1000,'Vox-bead':75,
 'Data-slate':50,'Combi-tool':150,'Filtration plugs':20,'Manacles':20,'Aquila pendant':50,
 'Flak vest':100,'Mesh armour':450,'Flak armour':500,'Heavy flak':300,'Carapace chestplate':4000,'Storm-trooper carapace':7500,
 'Heavy carapace':750,'Full carapace':15000,'Combat shield':100,
 'Red-dot sight':250,'Telescopic sight':500,'Suppressor':150,'Extended magazine':200,'Hot-shot cells':600,'Bayonet':20,
 'Underslung grenade launcher':1200,'Monomolecular edge':500,'Shock coil':700,'Duelling grip':300}

# ---- new non-weapon items: (name, cat, rarity, cost, desc, extra) ----
ITEMS = [
 # armour (armour:[AC base, Dex cap]; 99 = no cap, 0 = none)
 ('Feral-world plate','armour','common',600,'Heavy armour. AC 16. Hand-beaten steel from a world that never left the dark ages. Disadvantage on Stealth.',{'armour':[16,0]}),
 ('Void armour','armour','uncommon',1500,'Medium armour. AC 14 + Dex (max 1). Armoured void suit: you can survive in vacuum for 1 hour.',{'armour':[14,1]}),
 ('Ork \'eavy armour','armour','uncommon',800,'Heavy armour. AC 15 (Str 15). Scrap plates bolted together. Disadvantage on Stealth, and on Persuasion with anyone who has a nose.',{'armour':[15,0]}),
 ('Enforcer carapace','armour','uncommon',3000,'Medium armour. AC 14 + Dex (max 2). Arbites-pattern plates with a rebreather and a photo-visor built into the helm (darkvision 30 ft).',{'armour':[14,2]}),
 ('Aeldari mesh armour','armour','veryrare',18000,'Light armour. AC 14 + Dex. Thermoplastic xenos mesh that hardens under impact. No Stealth penalty.',{'armour':[14,99]}),
 ('Light power armour','armour','veryrare',25000,'Power-armour core (chest). Heavy armour, AC 16; each power-armour piece adds to it. Inquisitorial-pattern powered plate. While you wear it, your Strength counts as 2 higher for carrying and Athletics.',{'pa':True,'armour':[16,0]}),
 ('Sororitas power armour','armour','legendary',None,'Power-armour core (chest). Heavy armour, AC 17 (Str 13). Holy power armour of the Adepta Sororitas, sealed against vacuum and blessed against the Warp: advantage on saves against Corruption.',{'pa':True,'armour':[17,0]}),
 ('Astartes power armour','armour','legendary',None,'Power-armour core (chest). Heavy armour, AC 18. Made for Space Marines. An unaugmented human can barely move in it: speed 10 ft and disadvantage on Dex checks and saves.',{'pa':True,'armour':[18,0]}),
 ('Suppression shield','armour','uncommon',800,'Shield, +2 AC. A riot shield with a shock plate: when you shove with it, the target can\'t take reactions until its next turn.',{}),
 ('Storm shield','armour','veryrare',20000,'Shield, +2 AC. A power-field shield: once per short rest, as a reaction, reduce the damage of one hit by 2d10.',{}),
 # fields and protective relics
 ('Refractor field','relic','rare',8000,'Belt-worn energy field (requires attunement). Reaction when hit: +5 AC against that attack. Once per short rest.',{}),
 ('Conversion field','relic','veryrare',20000,'Energy field (requires attunement). Reaction when hit by a ranged attack: take half damage, and creatures within 10 ft make a DC 13 Con save or are blinded until the end of their next turn. Once per short rest.',{}),
 ('Displacer field','relic','legendary',None,'Archeotech teleport field (requires attunement). Reaction when hit: the attack misses and you teleport up to 30 ft to a space you can see. Recharges on a d6 roll of 5–6 at the start of each of your turns.',{}),
 ('Rosarius','relic','veryrare',22000,'An Ecclesiarchy amulet that projects a field of faith (requires attunement). Once per day, when you take damage, reduce it to 0.',{}),
 ('Iron halo','relic','legendary',None,'A halo-shaped field generator awarded to heroes (requires attunement). +1 AC, and once per short rest you can turn one critical hit against you into a normal hit.',{}),
 # grenades & explosives
 ('Stikkbomb','grenade','common',30,'Ork frag on a stick. Thrown 40 ft, 10-ft radius, DC 12 Dex save: 2d6 slashing, half on a success. On a 1 on a d20 it is a dud (or goes off in your hand, GM\'s call).',{}),
 ('Incendiary grenade','grenade','uncommon',400,'Thrown 60 ft. 10-ft radius burns for 1 minute: DC 13 Dex save or 2d6 fire and catch fire. Anyone entering or starting there takes 1d6 fire.',{}),
 ('Stun grenade','grenade','uncommon',400,'Thrown 60 ft. 10-ft radius, DC 13 Con save or stunned until the end of its next turn. No damage.',{}),
 ('Choke gas grenade','grenade','uncommon',300,'Thrown 60 ft. 20-ft cloud for 1 minute. DC 13 Con save on entering or starting a turn in it: 2d6 poison and poisoned while inside. Rebreathers protect.',{}),
 ('Blind grenade','grenade','uncommon',300,'Thrown 60 ft. 20-ft cloud of smoke and chaff for 1 minute: heavy obscurement that also blocks darkvision, photo-visors and auspex scans.',{}),
 ('Web grenade','grenade','uncommon',500,'Thrown 60 ft. 10-ft radius, DC 13 Dex save or restrained (escape DC 13 Str, as an action).',{}),
 ('Haywire grenade','grenade','rare',1500,'Thrown 60 ft. 15-ft radius, 3d6 lightning, DC 14 Dex save for half. Constructs, servitors, vehicles and powered armour take double and shut down until the end of their next turn.',{}),
 ('Hallucinogen grenade','grenade','rare',1500,'Thrown 60 ft. 20-ft radius, DC 14 Wis save or, on its next turn, the target does something random (roll d4: attack the nearest creature, flee, babble, or freeze).',{}),
 ('Plasma grenade','grenade','rare',2000,'Thrown 60 ft. 10-ft radius, DC 14 Dex save: 4d6 fire, half on a success.',{}),
 ('Demolition charge','grenade','rare',2500,'Placed, with a timer up to 1 hour or a remote detonator. 20-ft radius, DC 15 Dex save: 6d6 thunder, half on a success. Double damage to structures.',{}),
 # ammunition
 ('Dum-dum rounds','ammo','common',30,'Stub and autogun rounds that flatten on impact: +2 damage against targets without armour, −1 to hit against armoured targets. One reload.',{}),
 ('Man-stopper rounds','ammo','uncommon',200,'Stub, autogun and shotgun rounds with hardened tips: ignore resistance from mundane armour. One reload.',{}),
 ('Tox rounds','ammo','uncommon',300,'Stub, autogun and needle rounds coated in toxin: the weapon gains Toxic. One reload.',{}),
 ('Inferno shells','ammo','rare',800,'Shotgun shells packed with promethium: on a hit the target catches fire (1d4 fire at the start of each turn until doused). One reload.',{}),
 ('Hot-shot charge pack','ammo','rare',800,'Overcharged las power pack: +1d8 damage per hit, but the weapon gains Overheat while it is loaded. 5 shots.',{}),
 ('Kraken penetrator shells','ammo','veryrare',3000,'Bolt shells with adamantine cores: the weapon gains Rending and ignores resistance. One reload.',{}),
 ('Hellfire shells','ammo','veryrare',3500,'Bolt shells filled with mutagenic acid: +1d6 acid per hit, and the weapon gains Toxic. One reload.',{}),
 ('Frag missile','ammo','uncommon',300,'Missile launcher round: 4d6 fire, Blast. (This is what the launcher\'s card shows.)',{}),
 ('Krak missile','ammo','rare',1200,'Missile launcher round for armour: 6d10 force against one target, no Blast. Double damage against vehicles and structures.',{}),
 ('Melta canister','ammo','rare',1000,'Pressurised fuel for melta weapons and inferno pistols. One reload.',{}),
 ('Web canister','ammo','uncommon',200,'Refill for web pistols and webbers. One reload.',{}),
 # consumables
 ('Lho-sticks (pack)','consumable','common',5,'Ten mildly narcotic smokes. The universal currency of the Imperial Guard.',{}),
 ('Bottle of amasec','consumable','common',20,'Imperial brandy, quality varying from "fine" to "engine cleaner". Advantage on Persuasion when you share it with the right person.',{}),
 ('Synth-skin patch','consumable','uncommon',300,'Spray-on artificial skin. Action: gain 2d6 + 2 temporary HP for 1 hour.',{}),
 ('Anti-plague serum','consumable','uncommon',400,'Cures one disease, or gives advantage on saves against disease for 24 hours.',{}),
 ('Obscura','consumable','uncommon',200,'A dreamy narcotic. For 1 hour: advantage on saves against being frightened, disadvantage on Perception and Insight. Addictive.',{}),
 ('Blood-replacement unit','consumable','rare',1500,'A bag of synthetic blood with a pump. Action: a dying creature is stabilised and regains 4d4 + 4 HP.',{}),
 ('Frenzon','consumable','rare',800,'A rage drug used on penal legion troops. For 1 minute: advantage on melee attacks, immune to frightened, can\'t take reactions. Afterwards: DC 13 Con save or 1 level of exhaustion.',{}),
 ('Slaught','consumable','rare',1000,'A reflex accelerator. For 1 minute: +10 ft speed, +2 AC and advantage on Dex saves. Afterwards: 1 level of exhaustion.',{}),
 ('Spook','consumable','veryrare',3000,'A forbidden psychoactive drug from the Koronus Expanse. For 10 minutes you can use one random psychic cantrip (GM\'s pick) even if you are not a psyker. Gain 1d4 Corruption.',{}),
 ('Holy water (blessed vial)','consumable','uncommon',250,'Thrown 20 ft (ranged attack): 2d6 radiant against daemons and the undead. Ordinary water to everyone else.',{}),
 # gear
 ('Chrono','gear','common',20,'A wrist timepiece. Never late again (in theory).',{}),
 ('Survival kit','gear','common',50,'Fire-starter, water purifier, signal mirror, snare wire. Advantage on Survival checks to forage or find shelter.',{}),
 ('Signal flare','gear','common',10,'Lights up a 60-ft radius in bright light for 1 minute, or signals a ship in orbit.',{}),
 ('Lascutter','gear','uncommon',500,'A handheld cutting laser for doors and wreckage. Cuts through a bulkhead in 1 minute. Improvised melee weapon: 2d6 fire, disadvantage to hit.',{}),
 ('Photo-visor','gear','uncommon',1500,'Goggles that turn darkness into grey-green daylight: darkvision 60 ft.',{}),
 ('Vox-caster (long range)','gear','uncommon',400,'A backpack vox set. Talks to ships in orbit and to anyone in the same city.',{}),
 ('Writ of passage','gear','uncommon',500,'Official-looking paperwork granting passage. Advantage on Deception or Persuasion with minor officials, until someone checks.',{}),
 ('Preysense goggles','gear','rare',3000,'Thermal goggles. You see warm bodies through smoke, fog and darkness up to 60 ft, and you can\'t be surprised by living creatures in that range.',{}),
 ('Chameleoline cloak','gear','rare',4000,'A cloak that takes on the colours behind it. Advantage on Stealth while you don\'t move more than 10 ft in a turn.',{}),
 ('Stummer','gear','rare',3000,'A sound-dampening field generator. Advantage on Stealth checks against anyone relying on hearing.',{}),
 ('Grav-chute','gear','rare',3500,'A backpack anti-grav unit. You take no falling damage and can glide 2 ft horizontally for every 1 ft you fall.',{}),
 ('Holo-mask','gear','rare',5000,'A hologram projector that covers your face with someone else\'s. Advantage on Deception to pass as them; a close look (DC 15 Investigation) sees the flicker.',{}),
 ('Jump pack','gear','veryrare',15000,'A rocket pack. Bonus action: fly up to 60 ft in a straight-ish line and land. Three uses, then refuel (100 Thrones).',{}),
 ('Servo-skull (utility)','gear','uncommon',1200,'A floating skull with a lamp and a recorder. It follows you, lights a 20-ft radius and records what it sees.',{}),
 ('Servo-skull (combat)','gear','rare',5000,'A floating skull with a needle gun. Bonus action: it makes a ranged attack, +4 to hit, 1d4 piercing + Toxic, 30 ft. AC 13, 10 HP.',{}),
 ('Bionic eye','gear','uncommon',2000,'Cybernetic. Darkvision 30 ft, and advantage on Perception checks that rely on sight at long range.',{}),
 ('Bionic arm','gear','rare',5000,'Cybernetic. Your unarmed strikes deal 1d6 bludgeoning, and you have advantage on Athletics checks to lift, push or grapple.',{}),
 ('Respirator implant','gear','uncommon',1500,'Cybernetic. Immune to inhaled poisons and gases, and you can hold your breath for 10 minutes.',{}),
 ('Mechadendrite (utility)','gear','rare',6000,'Cybernetic tentacle-arm with tools. Bonus action: interact with an object or take the Help action for a Tech or Medicine check.',{}),
 ('Mind-impulse unit','gear','rare',6000,'Cybernetic. You can control a machine you touch by thought, and command servo-skulls and simple servitors as a bonus action.',{}),
 ('Psy-focus','gear','uncommon',1000,'A crystal, rosary or skull that helps a psyker concentrate (requires attunement by a psyker). +1 to psychic power save DCs.',{}),
 ('Psychic hood','gear','veryrare',20000,'A crystalline cowl that shields a psyker\'s mind (requires attunement by a psyker). Advantage on saves against Perils of the Warp and to keep concentration.',{}),
 ('Null rod','gear','rare',8000,'A staff of blank-null materials. Psychic powers targeting you or cast within 10 ft have disadvantage to hit (or advantage on the save against them).',{}),
 # relics / archeotech
 ('Egarian geode','relic','rare',None,'A fist-sized crystal from a xenos maze-city. It is always warm, and it hums when it is near Egarian stone. Collectors pay very well.',{}),
 ('Archeotech auspex','relic','veryrare',None,'A dark-age scanner. It detects life, energy and hidden doors within 120 ft through anything but lead, and shows a map of the area.',{}),
 ('Halo device','relic','legendary',None,'A xenos artefact that grants unnatural life. Attune: +1 to Con and you age no further. Each month, DC 15 Wis save or gain 1d4 Corruption. Many have killed for one.',{}),
 ('Warp-touched compass','relic','veryrare',None,'A compass whose needle points at whatever its holder most wants. It is never wrong. It is often unkind.',{}),
]


# ---- equipment-slot pieces (see claude/item-ladder.md). slot: helm pauldrons belt ring bracers gloves pants boots;
#      acb = AC from a non-chest piece (sheet caps the total at +3); pa = power-armour piece; q = quality it turns up in ----
EQUIP = [
 # power-armour cores (chest)
 ('Salvaged Mk IV cuirass','armour','rare',4000,'Power-armour core (chest). Heavy armour, AC 15. Turns up Broken: −2 AC and no powered effects (for it or any power-armour piece) until it is repaired.',{'armour':[15,0],'pa':True,'q':'broken'}),
 # helms
 ('Rebreather helm','armour','common',150,'Helm. Advantage on saves against inhaled poisons, gas and choke grenades.',{'slot':'helm'}),
 ('Photo-visor helm','armour','uncommon',900,'Helm. Darkvision 60 ft, and you can\'t be blinded by photon flash grenades.',{'slot':'helm'}),
 ('Mk VII Aquila helm','armour','rare',6000,'Power-armour helm, +1 AC. Auto-senses (powered): darkvision 60 ft, advantage on sight-based Perception checks, built-in vox.',{'slot':'helm','acb':1,'pa':True}),
 ('Psy-null coif','armour','veryrare',None,'Helm, +1 AC. Blank-thread mesh: advantage on saves against psychic powers and Warp effects. Once a day, cast Counterspell (level 3, no slot) as a reaction; you can\'t cast powers in the same round.',{'slot':'helm','acb':1}),
 # pauldrons
 ('Flak pauldrons','armour','common',200,'Pauldrons. Take 2 less damage from grenades and explosions.',{'slot':'pauldrons'}),
 ('Carapace pauldrons','armour','uncommon',1200,'Pauldrons, +1 AC.',{'slot':'pauldrons','acb':1}),
 ('Mk VII pauldrons','armour','rare',7000,'Power-armour pauldrons, +1 AC. Heraldry plate: advantage on Intimidation against anyone who recognises your house colours.',{'slot':'pauldrons','acb':1,'pa':True}),
 ('Pauldrons of the Unbroken Line','armour','veryrare',None,'Pauldrons, +1 AC. When an ally within 30 ft drops to 0 HP, use your reaction to move up to your speed toward them without provoking attacks; if you end next to them they regain 1d8 HP. Once per short rest.',{'slot':'pauldrons','acb':1}),
 # bracers
 ('Wrist auspex','armour','common',250,'Bracers. Bonus action: sense living creatures within 30 ft, even through thin bulkheads (not what they are). Once per short rest.',{'slot':'bracers'}),
 ('Gun-bracer','armour','uncommon',1500,'Bracers with a hidden stub gun: 1d6 piercing, 30/90 ft, 2 shots, then an action to reload. Needs no free hand. Counts as a pistol.',{'slot':'bracers'}),
 ('Kine-shield vambraces','armour','rare',8000,'Bracers. Once a day, cast Shield (no slot) as a reaction.',{'slot':'bracers'}),
 # gloves
 ('Tech-adept gloves','armour','common',200,'Gloves. Advantage on Tech-Use checks to repair or jury-rig machinery.',{'slot':'gloves'}),
 ('Shock gauntlets','armour','uncommon',1200,'Gloves. Your unarmed strikes deal 1d6 lightning damage instead of their normal damage.',{'slot':'gloves'}),
 ('Mk VII servo-gauntlets','armour','rare',8000,'Power-armour gauntlets. Servo strength (powered): you count as one size larger for carrying, pushing and grappling, and have advantage on Strength checks to break things.',{'slot':'gloves','pa':True}),
 ('Gauntlet of the Machine-Saint','armour','veryrare',None,'Gloves. Once a day, cast Lightning Bolt (level 3, DC 15) from the palm. Constructs and servitors you touch obey one simple spoken command (no save) once per short rest.',{'slot':'gloves'}),
 # belt
 ('Utility harness','armour','common',100,'Belt. Drawing a grenade or stim doesn\'t use your free object interaction.',{'slot':'belt'}),
 ('Las-cell bandolier','armour','uncommon',600,'Belt. Reloading a las weapon is a bonus action.',{'slot':'belt'}),
 # rings
 ('Ashgrave signet','armour','common',None,'Ring of the Ashgrave Dynasty. Advantage on Persuasion with Imperial officials who respect the Warrant; disadvantage with the Footfall Guild of Ledgerers, who want their money.',{'slot':'ring'}),
 ('Shroud ring','armour','uncommon',2000,'Ring. Advantage on Stealth checks in dim light or darkness.',{'slot':'ring'}),
 ('Ring of the Burning Saint','armour','rare',9000,'Ring. Resistance to fire damage. Once a day, cast Fireball (level 3, DC 15).',{'slot':'ring'}),
 ('Oriel\'s Warrant-signet','armour','legendary',None,'Artefact ring, +2 AC. You gain the Inspiring Leader feat. You always know the direction to Vesper\'s Rest. Once per long rest, speak with the Warrant\'s authority: each Imperial subject within 60 ft that hears you makes a DC 18 Wisdom save or obeys one command (as Command) that doesn\'t harm itself.',{'slot':'ring','acb':2}),
 # greaves
 ('Padded fatigues','armour','common',120,'Greaves. Standing up from prone costs only 5 ft of movement.',{'slot':'pants'}),
 ('Mk VII greaves','armour','rare',6000,'Power-armour greaves, +1 AC. Mag-locks (powered): you can\'t be knocked prone while standing.',{'slot':'pants','acb':1,'pa':True}),
 # boots
 ('Mag-boots','armour','uncommon',700,'Boots. Walk on metal walls and ceilings at half speed; you can\'t be pushed while they are locked.',{'slot':'boots'}),
 ('Mk VII boots','armour','rare',5000,'Power-armour boots. Servo-legs (powered): your jump distance doubles and you take 2d6 less falling damage.',{'slot':'boots','pa':True}),
 ('Ghost-corridor boots','armour','veryrare',None,'Boots. Speed +10 ft. Once a day, cast Dimension Door (level 4).',{'slot':'boots'}),
]
ITEMS += EQUIP

def flags(cls, props, rng):
    f = []
    if cls in ('pistol','basic','special','heavy') or (cls=='exotic' and rng): f.append('ranged')
    if 'Finesse' in props: f.append('finesse')
    if 'Light' in props: f.append('light')
    if 'Two-handed' in props: f.append('two')
    if 'Heavy' in props: f.append('heavy')
    if 'Reach' in props: f.append('reach')
    if 'Thrown' in props: f.append('thrown')
    if 'Versatile' in props: f.append('versatile')
    if cls=='thrown' and 'thrown' not in f: f.append('thrown')
    return ' '.join(f)

def build():
    neww = {}
    for (name, cls, rar, dice, dt, rng, clip, props, cost, desc) in W:
        k = N(name)
        assert k not in neww, k
        neww[k] = dict(k=k, to=name, lbl=name, cls=cls, rarity=rar, dice=dice, type=dt, range=rng, clip=clip,
                       props=props, cost=cost, desc=desc, f=flags(cls, props, rng))
    ann = {k: dict(cls=v[0], rarity=v[1], cost=v[2], desc=v[3], **({'props': v[4]} if len(v) > 4 else {})) for k, v in ANN.items()}
    items = [dict(name=n, cat=c, rarity=r, cost=co, desc=d, **e) for (n, c, r, co, d, e) in ITEMS]
    js = ("/* ARMOURY40K-START: expanded 40k armoury, generated by tools/armoury40k.py (do not edit by hand) */\n(function(){\n"
          f" const NEW={json.dumps(list(neww.values()), ensure_ascii=False)};\n"
          f" const ANN={json.dumps(ann, ensure_ascii=False)};\n"
          f" const PROPS={json.dumps(PROPS, ensure_ascii=False)};\n"
          f" const ITEMS={json.dumps(items, ensure_ascii=False)};\n"
          f" const OLDCOST={json.dumps(OLD_COST, ensure_ascii=False)};\n"
          " for(const w of NEW){W5E[w.k]=[w.dice,w.type,w.f];WEAPONS[w.k]={to:w.to,lbl:w.lbl,dice:w.dice,type:w.type,range:w.range||undefined,clip:w.clip||undefined,props:w.props,cls:w.cls,rarity:w.rarity,cost:w.cost,desc:w.desc};if(!WEAPON_KEYS.includes(w.k))WEAPON_KEYS.push(w.k);}\n"
          " WEAPON_KEYS.sort((a,b)=>b.length-a.length);\n"
          " for(const [k,a] of Object.entries(ANN)){if(WEAPONS[k])Object.assign(WEAPONS[k],a);}\n"
          " for(const [p,t] of Object.entries(PROPS)){if(!PROP_TEXT[p])PROP_TEXT[p]=t;}\n"
          " for(const x of STD_ITEMS){if(x.cost==null&&OLDCOST[x.name]!=null)x.cost=OLDCOST[x.name];}\n"
          " const have=new Set(STD_ITEMS.map(x=>x.id));\n"
          " for(const it of ITEMS){const o=I(it.name,it.cat,it.rarity,it.desc,{cost:it.cost});for(const f of ['armour','slot','acb','pa','q'])if(it[f]!=null)o[f]=it[f];if(!have.has(o.id))STD_ITEMS.push(o);}\n"
          "})();\n/* ARMOURY40K-END */\n")
    return js, neww

def check_keys(neww):
    """The weapon a stored name resolves to = the longest key contained in it. Check every name resolves to its own key."""
    src = open(os.path.join(ROOT, 'index.html')).read()
    w5 = re.search(r'const W5E=\{(.*?)\};', src, re.S).group(1)
    old = re.findall(r'(\w+):\[', w5)
    keys = sorted(set(old) | set(neww), key=len, reverse=True)
    def nice(k):
        return re.sub(r'(hand|light|heavy|short|long|great|battle|war|quarter|morning)(?=[a-z])', r'\1 ', k).capitalize()
    bad = []
    for k in keys:
        name = neww[k]['lbl'] if k in neww else nice(k)
        hit = next(x for x in keys if x in N(name))
        if hit != k: bad.append((k, name, hit))
    return bad

def insert(js):
    for f in ('index.html', 'guide.html'):
        p = os.path.join(ROOT, f); s = open(p).read()
        s = re.sub(r'/\* ARMOURY40K-START.*?/\* ARMOURY40K-END \*/\n', '', s, flags=re.S)
        anchor = 'const STD_WEAPONS='
        assert s.count(anchor) == 1, f
        s = s.replace(anchor, js + anchor)
        open(p, 'w').write(s)
        print('inserted into', f)

if __name__ == '__main__':
    js, neww = build()
    bad = check_keys(neww)
    if bad:
        print('KEY COLLISIONS:', bad); sys.exit(1)
    insert(js)
    print(len(neww), 'new weapons,', len(ANN), 'annotated,', len(ITEMS), 'items,', len(PROPS), 'trait texts')
