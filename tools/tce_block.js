/* TCE-START: Tasha's Cauldron of Everything supplement (summaries written for this project, not book text) */
(function(){
 // spells Tasha's adds that weren't on file at all
 [['Tasha\'s Caustic Brew',1,'V'],['Tasha\'s Mind Whip',2,'E'],['Summon Shadowspawn',3,'C'],['Summon Celestial',5,'C'],
  ['Summon Fiend',6,'C'],['Tasha\'s Otherworldly Guise',6,'T'],['Dream of the Blue Veil',7,'C'],['Blade of Disaster',9,'C']
 ].forEach(([name,lvl,school])=>{if(!SPELLS[N(name)])SPELLS[N(name)]={name,lvl,school};});
 [['Caustic Brew',"Tasha's Caustic Brew"],['Mind Whip',"Tasha's Mind Whip"],['Otherworldly Guise',"Tasha's Otherworldly Guise"]
 ].forEach(([a,b])=>{SPELLS[N(a)]=SPELLS[N(b)];});
 // which careers can take them (Tasha's class lists)
 const LISTS={
  "Booming Blade":'artificer sorcerer warlock wizard',"Green-Flame Blade":'artificer sorcerer warlock wizard',
  "Lightning Lure":'artificer sorcerer warlock wizard',"Sword Burst":'artificer sorcerer warlock wizard',
  "Mind Sliver":'artificer sorcerer warlock wizard',"Tasha's Caustic Brew":'artificer sorcerer wizard',
  "Tasha's Mind Whip":'sorcerer wizard',"Intellect Fortress":'artificer bard sorcerer warlock wizard',
  "Spirit Shroud":'cleric paladin warlock wizard',"Summon Beast":'druid ranger',"Summon Fey":'druid ranger warlock wizard',
  "Summon Shadowspawn":'warlock wizard',"Summon Undead":'warlock wizard',"Summon Aberration":'warlock wizard',
  "Summon Construct":'artificer wizard',"Summon Elemental":'druid ranger wizard',"Summon Celestial":'cleric paladin',
  "Summon Fiend":'warlock wizard',"Tasha's Otherworldly Guise":'sorcerer warlock wizard',
  "Dream of the Blue Veil":'bard sorcerer warlock wizard',"Blade of Disaster":'sorcerer warlock wizard'
 };
 const SUMMON=(spirit,kinds,lvl)=>`You call up a ${spirit} spirit in an unoccupied space you can see. Pick its form when you cast: ${kinds}. Its Armour Class, hit points, attacks and damage go up with the level of the slot you use (the book has its stat block). It is friendly to you and your allies, shares your initiative and acts right after you, and follows your spoken orders (no action needed). If you give no order it takes the Dodge action and only moves to stay out of danger.`;
 const SUM_UP='Use a higher slot and the spirit\'s stat block scales with it.';
 const TCE_INFO={
  "Booming Blade":['Action','Self (5-ft radius)','SM (a melee weapon worth 1 sp or more)','1 round',0,0,
   'As part of casting, make one melee attack with the weapon against a creature within 5 feet. On a hit the target suffers the attack\'s normal effects and is wreathed in crackling energy until the start of your next turn. If it willingly moves 5 feet or more before then, it takes 1d8 Thunder damage and the effect ends.\nCantrip Upgrade. At level 5 the hit also deals an extra 1d8 Thunder damage and the moving damage becomes 2d8. Both go up by 1d8 again at levels 11 and 17.'],
  "Green-Flame Blade":['Action','Self (5-ft radius)','SM (a melee weapon worth 1 sp or more)','Instantaneous',0,0,
   'As part of casting, make one melee attack with the weapon against a creature within 5 feet. On a hit the target suffers the attack\'s normal effects, and flame jumps to a different creature you choose within 5 feet of it, dealing Fire damage equal to your casting modifier.\nCantrip Upgrade. At level 5 the hit deals an extra 1d8 Fire damage and the jumping flame deals 1d8 + your casting modifier. Both go up by 1d8 again at levels 11 and 17.'],
  "Lightning Lure":['Action','Self (15-ft radius)','V','Instantaneous',0,0,
   'Lash out with a whip of lightning at one creature within 15 feet. It makes a Strength saving throw. On a failure it is pulled up to 10 feet straight toward you, and if it ends within 5 feet of you it takes 1d8 Lightning damage.\nCantrip Upgrade. The damage goes up by 1d8 at levels 5, 11 and 17.'],
  "Sword Burst":['Action','Self (5-ft radius)','V','Instantaneous',0,0,
   'A ring of spectral blades spins around you. Every other creature within 5 feet makes a Dexterity saving throw or takes 1d6 Force damage.\nCantrip Upgrade. The damage goes up by 1d6 at levels 5, 11 and 17.'],
  "Mind Sliver":['Action','60 feet','V','1 round',0,0,
   'Drive a shard of psychic force into the mind of one creature you can see. It makes an Intelligence saving throw. On a failure it takes 1d6 Psychic damage, and the first saving throw it makes before the end of your next turn has 1d4 subtracted from it.\nCantrip Upgrade. The damage goes up by 1d6 at levels 5, 11 and 17.'],
  "Tasha's Caustic Brew":['Action','Self (30-ft line)','VSM (a piece of rotten food)','Concentration, up to 1 minute',1,0,
   'A 30-foot-long, 5-foot-wide line of acid sprays from you. Each creature in it makes a Dexterity saving throw or is coated in acid for the duration. A coated creature takes 2d4 Acid damage at the start of each of its turns. It, or a creature next to it, can use an action to scrape the acid off and end the effect on it.',
   'The damage goes up by 2d4 for each slot level above 1.'],
  "Tasha's Mind Whip":['Action','90 feet','V','1 round',0,0,
   'Lash the mind of one creature you can see. It makes an Intelligence saving throw. On a failure it takes 3d6 Psychic damage, can\'t take reactions until the end of its next turn, and on that turn it can do only one of these: move, take an action, or take a bonus action. On a success it takes half damage and nothing else happens.',
   'Target one more creature for each slot level above 2. The targets must be within 30 feet of each other.'],
  "Intellect Fortress":['Action','30 feet','V','Concentration, up to 1 hour',1,0,
   'One willing creature you can see (it can be you) is wrapped in a shimmering psychic ward. Until the power ends it has resistance to Psychic damage and advantage on Intelligence, Wisdom and Charisma saving throws.',
   'Ward one more creature for each slot level above 3. The creatures must be within 30 feet of each other.'],
  "Spirit Shroud":['Bonus Action','Self','VS','Concentration, up to 1 minute',1,0,
   'Spirits of the dead swirl around you within 10 feet. Choose Radiant, Necrotic or Cold when you cast. Until the power ends, your attacks against creatures within 10 feet deal an extra 1d8 damage of that type when they hit, and a creature you hit can\'t regain hit points until the start of your next turn. Any creature you choose that starts its turn within 10 feet of you has its speed reduced by 10 feet until the start of your next turn.',
   'The extra damage goes up by 1d8 for every two slot levels above 3.'],
  "Summon Beast":['Action','90 feet','VSM (a feather, fur and a fish tail in a gilded acorn worth 200 gp)','Concentration, up to 1 hour',1,0,
   SUMMON('beast','Air (flies), Land (climbs) or Water (swims)'),SUM_UP],
  "Summon Fey":['Action','90 feet','VSM (a gilded flower worth 300 gp)','Concentration, up to 1 hour',1,0,
   SUMMON('fey','Fuming, Mirthful or Tricksy. Each form can blink a short distance as a bonus action with an extra trick'),SUM_UP],
  "Summon Shadowspawn":['Action','90 feet','VSM (tears inside a gem worth 300 gp)','Concentration, up to 1 hour',1,0,
   SUMMON('shadow','Fury, Despair or Fear. It can frighten with a dreadful scream and slip between shadows'),SUM_UP],
  "Summon Undead":['Action','90 feet','VSM (a gilded skull worth 300 gp)','Concentration, up to 1 hour',1,0,
   SUMMON('undead','Ghostly (flies through walls), Putrid (poisonous aura) or Skeletal (ranged grave bolts)'),SUM_UP],
  "Summon Aberration":['Action','90 feet','VSM (a pickled tentacle and an eyeball in a platinum-inlaid vial worth 400 gp)','Concentration, up to 1 hour',1,0,
   SUMMON('aberrant','Beholderkin (flies, eye ray), Slaad (regenerates) or Star Spawn (psychic aura)'),SUM_UP],
  "Summon Construct":['Action','90 feet','VSM (an ornate stone and metal lockbox worth 400 gp)','Concentration, up to 1 hour',1,0,
   SUMMON('construct','Clay, Metal or Stone. Each has a defensive trick when it is hit or nearby'),SUM_UP],
  "Summon Elemental":['Action','90 feet','VSM (air, a pebble, ash and water in a gold-inlaid vial worth 400 gp)','Concentration, up to 1 hour',1,0,
   SUMMON('elemental','Air, Earth, Fire or Water'),SUM_UP],
  "Summon Celestial":['Action','90 feet','VSM (a golden reliquary worth 500 gp)','Concentration, up to 1 hour',1,0,
   SUMMON('celestial','Avenger (ranged radiant bow) or Defender (melee, extra Armour Class). It can also heal a creature once'),SUM_UP],
  "Summon Fiend":['Action','90 feet','VSM (humanoid blood in a ruby vial worth 600 gp)','Concentration, up to 1 hour',1,0,
   SUMMON('fiendish','Demon (explodes when it dies), Devil (fiery ranged bolts) or Yugoloth (teleports after hitting)'),SUM_UP],
  "Tasha's Otherworldly Guise":['Bonus Action','Self','VSM (an object engraved with a symbol of the Outer Planes worth 500 gp)','Concentration, up to 1 minute',1,0,
   'Draw on the power of the Immaterium (the Lower Planes) or the Emperor\'s light (the Upper Planes) and change your shape for the duration.\nLower: immunity to Fire and Poison damage and the Poisoned condition. Upper: immunity to Radiant and Necrotic damage and the Charmed condition.\nEither way you gain a flying speed of 40 feet, +2 to Armour Class, your weapon attacks count as magical and can use your casting modifier for attack and damage rolls, and you attack twice instead of once when you take the Attack action.'],
  "Dream of the Blue Veil":['10 minutes','20 feet','VSM (an item or creature from the world you want to reach)','6 hours',0,0,
   'You and up to eight willing creatures in range fall unconscious and dream of another world in the material universe, one tied to the item or creature you use for the power. When the power ends, the sleepers wake on that world, within about a mile of where the item or creature came from. A sleeper who takes damage wakes early and does not make the journey.'],
  "Blade of Disaster":['Bonus Action','60 feet','VS','Concentration, up to 1 minute',1,0,
   'You open a blade-shaped rift in reality in an unoccupied space in range. It passes harmlessly through any barrier. When you cast the power, you can make up to two melee power attacks with the blade, each against a creature or object within 5 feet of it. On a hit it deals 4d12 Force damage, and it scores a critical hit on an 18-20; a critical deals 8d12 extra Force damage.\nAs a bonus action on each of your later turns, you can move the blade up to 30 feet and make the two attacks again.']
 };
 for(const [name,v] of Object.entries(TCE_INFO)){
  const sp=SPELLS[N(name)];if(!sp||SPELL_INFO[N(sp.name)])continue;
  SPELL_INFO[N(sp.name)]={name:sp.name,srdName:name,lvl:sp.lvl,school:sp.school,time:v[0],range:v[1],comp:v[2],dur:v[3].replace(/^Concentration, /,''),conc:!!v[4],ritual:!!v[5],
   desc:v[6]+'\nSummary written for this table from Tasha\'s Cauldron of Everything; the book has the full wording.',higher:v[7]||'',tce:true};
 }
 for(const [name,cl] of Object.entries(LISTS)){
  const sp=SPELLS[N(name)];if(!sp)continue;
  for(const c of cl.split(' ')){const L=CLASS_SPELLS[c];if(!L||!L[sp.lvl])continue;if(!L[sp.lvl].includes(sp.name)){L[sp.lvl].push(sp.name);L[sp.lvl].sort();}}
 }
 Object.assign(SPELL_40K,{
  'Booming Blade':['Thunderstrike Blade',null,'Concussive Edge'],'Green-Flame Blade':['Pyre Blade','Blade of Holy Fire','Promethium Edge'],
  'Lightning Lure':['Lightning Lash',null,'Voltaic Lash'],'Sword Burst':['Spectral Blades',null,'Servo-blade Whirl'],
  'Mind Sliver':['Mind Spike'],"Tasha's Caustic Brew":['Corrosive Spew',null,'Acid Sprayer'],"Tasha's Mind Whip":['Psychic Lash'],
  'Intellect Fortress':['Mental Fortress','Shield of Faith (Mind)','Cogitator Firewall'],
  'Summon Beast':['Call the Beast-spirit'],'Summon Fey':['Call Aeldari Shade'],'Summon Shadowspawn':['Call Shadow-thing'],
  'Summon Undead':['Raise Revenant'],'Summon Aberration':['Call Warp-spawn'],'Summon Construct':['Call Machine-construct',null,'Activate Combat Servitor'],
  'Summon Elemental':['Call Elemental Spirit'],'Summon Celestial':['Call Warp-spirit',"Summon the Emperor's Angel"],'Summon Fiend':['Summon Daemon'],
  "Tasha's Otherworldly Guise":['Warp Ascension','Saintly Ascension'],'Dream of the Blue Veil':['Dream-walk the Void'],'Blade of Disaster':['Rift Blade']
 });

 // feats
 Object.assign(FEATS,{
  artificerinitiate:{name:'Artificer Initiate',w40:'Tech-Adept Initiate',abil:[],text:'Learn one artificer cantrip and one level 1 artificer power (Intelligence). Cast the power once per long rest without a slot, or with your slots. Gain proficiency with one artisan\'s tool.'},
  eldritchadept:{name:'Eldritch Adept',w40:'Warp Initiate',abil:[],text:'Needs the ability to cast powers or Pact Magic. Learn one Warp Invocation that has no level requirement; you can swap it when you gain a level.'},
  fightinginitiate:{name:'Fighting Initiate',w40:'Drilled Veteran',abil:[],text:'Needs proficiency with a martial weapon. Learn one combat doctrine (Fighting Style); you can swap it when you take an Ability Score Improvement.'},
  metamagicadept:{name:'Metamagic Adept',w40:'Warp Shaper',abil:[],text:'Needs the ability to cast powers or Pact Magic. Learn two Warp Shaping (Metamagic) options and gain 2 Warp Points to spend only on them, regained on a long rest.'}
 });

 // fighting styles (4th field = careers that can take it)
 Object.assign(STYLES,{
  interception:['Interception','Interception Doctrine','Reaction when a creature you can see hits someone within 5 ft of you: reduce the damage by 1d10 + your proficiency bonus (needs a shield or a weapon in hand).'],
  unarmed:['Unarmed Fighting','Close-quarters Doctrine','Unarmed strikes deal 1d6 + Str (1d8 if both hands are free); 1d4 bludgeoning to a creature you are grappling at the start of each of your turns.'],
  superior:['Superior Technique','Sergeant\'s Doctrine','Learn one manoeuvre (Battle Master list) and gain one d6 superiority die, regained on a short or long rest.',['fighter']],
  blessed:['Blessed Warrior','Litany Doctrine','Learn two Faith cantrips from the cleric list; they use Charisma.',['paladin']],
  druidic:['Druidic Warrior','Feral Doctrine','Learn two druid cantrips; they use Wisdom.',['ranger']]
 });

 // invocations
 Object.assign(INVOC,{
  pacttalisman:['Pact of the Talisman','Pact of the Warded Charm',1,null,'Your patron gives you a talisman. Its wearer can add 1d4 to a failed ability check, a number of times per long rest equal to your proficiency bonus.'],
  aspectofmoon:['Aspect of the Moon','Unsleeping Vigil',1,'pacttome','You no longer need to sleep and can\'t be put to sleep. Light activity like reading counts as rest.'],
  rebuketalisman:['Rebuke of the Talisman','Rebuke of the Charm',1,'pacttalisman','When the talisman\'s wearer is hit by a creature within 30 ft that you can see, use your reaction to deal psychic damage equal to your proficiency bonus and push it 10 ft away.'],
  farscribe:['Far Scribe','Distant Scrivener',5,'pacttome','Creatures who write their name in your grimoire can be sent a Sending (Astropathic Message) by you without a slot, up to your proficiency bonus in names.'],
  undyingservitude:['Undying Servitude','Undying Servitude',5,null,'Cast Animate Dead once per long rest without a slot.'],
  protectiontalisman:['Protection of the Talisman','Warding of the Charm',7,'pacttalisman','The talisman\'s wearer can add 1d4 to a failed saving throw, a number of times per long rest equal to your proficiency bonus.'],
  bondtalisman:['Bond of the Talisman','Bond of the Charm',12,'pacttalisman','Teleport to the talisman\'s wearer (or let them teleport to you) as an action, a number of times per long rest equal to your proficiency bonus.']
 });

 // manoeuvres
 Object.assign(MANEUVERS,{
  brace:['Brace','Hold the Line','Reaction when a creature you can see moves within your reach: attack it and add the die to damage.'],
  grappling:['Grappling Strike','Grappling Strike','After a melee hit, grapple as a bonus action and add the die to the check.'],
  quicktoss:['Quick Toss','Quick Draw','Bonus action: draw and throw a thrown weapon (or grenade), adding the die to damage.']
 });
})();

/* Artificer infusions (Machine Blessings): [5e name, 40k name, min artificer level, text] */
const INFUSIONS={
 enhanceddefense:['Enhanced Defense','Reinforced Plating',2,'Armour or a shield gives +1 AC (+2 from artificer level 10).'],
 enhancedfocus:['Enhanced Arcane Focus','Tuned Focus',2,'A focus gives +1 to power attacks (+2 from level 10) and ignores half cover. Needs attunement.'],
 enhancedweapon:['Enhanced Weapon','Machine-blessed Weapon',2,'A simple or martial weapon gets +1 to attack and damage (+2 from level 10).'],
 homunculus:['Homunculus Servant','Servo-familiar',2,'Build a tiny servant that acts on your turn, can deliver touch powers and scales with your level.'],
 repeatingshot:['Repeating Shot','Auto-loader',2,'A ranged weapon gets +1 to attack and damage, ignores Loading and makes its own ammunition. Needs attunement.'],
 replicate:['Replicate Magic Item','Replicate Relic',2,'Make one common or uncommon item from the infusion lists (bag of holding, goggles of night, sending stones and the like). Some need a higher level.'],
 returning:['Returning Weapon','Mag-tethered Weapon',2,'A thrown weapon gets +1 to attack and damage and flies back to your hand after the attack.'],
 bootswinding:['Boots of the Winding Path','Displacer Boots',6,'Bonus action: teleport back to a spot you occupied this turn, up to 15 ft. Needs attunement.'],
 radiantweapon:['Radiant Weapon','Lumen Blade',6,'A weapon gets +1 to attack and damage, sheds light on command, and can blind an attacker as a reaction (4 charges a day). Needs attunement.'],
 repulsionshield:['Repulsion Shield','Repulsor Shield',6,'+1 AC; reaction when hit in melee: push the attacker 15 ft (4 charges a day). Needs attunement.'],
 resistantarmor:['Resistant Armor','Ablative Armour',6,'Armour gives resistance to one damage type you choose when you infuse it. Needs attunement.'],
 refuelingring:['Spell-Refueling Ring','Rite-recharge Ring',6,'Once a day, recover one expended power slot of level 3 or lower. Needs attunement.'],
 mindsharpener:['Mind Sharpener','Neural Stabiliser',2,'Armour or robes: when you fail a concentration save, spend a charge to succeed (4 charges a day). Needs attunement.'],
 armorstrength:['Armor of Magical Strength','Augmented Servo-armour',10,'Armour with 6 charges: spend one to add Int to a Strength check or save, or to avoid being knocked prone. Needs attunement.'],
 helmawareness:['Helm of Awareness','Auspex Helm',10,'Advantage on initiative, and you can\'t be surprised while you aren\'t incapacitated. Needs attunement.'],
 propulsionarmor:['Arcane Propulsion Armor','Jump-pack Armour',14,'+5 ft speed, gauntlets that strike for 1d8 force and can be fired 20/60 ft, and the armour can\'t be removed against your will. Needs attunement.']
};
function infusionCount(l){return l>=18?12:l>=14?10:l>=10?8:l>=6?6:l>=2?4:0;}
function infusedItems(l){return l>=18?6:l>=14?5:l>=10?4:l>=6?3:l>=2?2:0;}
/* TCE-END */
