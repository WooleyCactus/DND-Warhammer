/* EQUIP-START: quality, equipment slots, bonded weapons (claude/item-ladder.md) */
const QUAL={broken:['Broken',0,'#c0583f'],shoddy:['Shoddy',1,'#a08a5a'],standard:['Standard',2,''],good:['Good',3,'#8fc7a0'],fine:['Fine',4,'#7fb6e8'],master:['Mastercrafted',5,'#e8c46a']};
const QUAL_TXT={broken:'Broken: −2 to hit and can\'t be used until repaired. Armour: chest −2 AC, other pieces\' perks don\'t work.',shoddy:'Shoddy: a weapon jams on a natural 1 (action to clear). Chest armour −1 AC.'};
function qOf(x){return x&&QUAL[x.q]?x.q:'standard';}
function qPrefix(x){const q=qOf(x);return q==='standard'?'':QUAL[q][0]+' ';}
const ATT_TYPE={reddot:'sight',scope:'sight',supp:'barrel',extmag:'magazine',hotshot:'power cell',bayonet:'underslung',launcher:'underslung',mono:'edge',shock:'power cell',grip:'grip'};
function attType(k,D){return (D&&D.ty)||ATT_TYPE[k]||k;}
function attTypeTaken(w,k,D){const ty=attType(k,D);return (w.att||[]).some(x=>attType(x,attDef(x,w.wx))===ty);}
function wSlots(w){return QUAL[qOf(w)][1];}
const ATT_ATK_CAP=1,ATT_DMG_CAP=2;
function wKeyOf(w){return WEAPON_KEYS.find(k=>N(w.from||'').includes(k))||WEAPON_KEYS.find(k=>N(w.to||'').includes(k));}
function wCls(w){const k=wKeyOf(w);return (k&&WEAPONS[k]&&WEAPONS[k].cls)||'';}
const RAR_ORD=['common','uncommon','rare','veryrare','legendary'];
function rarMax(a,b){return RAR_ORD.indexOf(a)>=RAR_ORD.indexOf(b)?a:b;}

/* ---- bonded weapons: 3 slots, heavy weapons take 2, a worn shield takes 1 ---- */
const BOND_MAX=3;
function bondCost(w){return wCls(w)==='heavy'?2:1;}
function shieldBond(ch){return ((ch.state||{}).inv||[]).some(x=>x.worn&&isShield(x))?1:0;}
/* explicit wx.bond true/false wins; weapons with no choice yet fill what's left, in order */
function bondState(ch,d){const wx=(ch.state||{}).wx||{};let used=shieldBond(ch);const on=d.weapons.map(()=>false);
 d.weapons.forEach((w,i)=>{if((wx[i]||{}).bond===true){on[i]=true;used+=bondCost(w);}});
 d.weapons.forEach((w,i)=>{const b=(wx[i]||{}).bond;if(b==null&&used+bondCost(w)<=BOND_MAX){on[i]=true;used+=bondCost(w);}});
 return {on,used};}
function bondFix(ch,d){const st=ch.state=ch.state||{};st.wx=st.wx||{};const {on}=bondState(ch,d);on.forEach((v,i)=>{(st.wx[i]=st.wx[i]||{}).bond=v;});}
function bondBar(ch,d,bs){const over=bs.used>BOND_MAX;const pips=[];let n=0;
 d.weapons.forEach((w,i)=>{if(bs.on[i])for(let c=0;c<bondCost(w);c++)pips.push(`<span class="bd-pip on" title="${esc(w.to)}">${c?'':esc((w.to||'').split(' ').slice(-1)[0].slice(0,9))}</span>`);});
 if(shieldBond(ch))pips.push('<span class="bd-pip on sh" title="Worn shield">Shield</span>');
 while(pips.length<BOND_MAX)pips.push('<span class="bd-pip">empty</span>');
 return `<div class="bd-bar${over?' over':''}"><span class="bd-k">Bonded ${bs.used}/${BOND_MAX}</span>${pips.join('')}${over?'<span class="bd-warn">Over the limit: unbond something</span>':''}</div>`;}
function bondAskPanel(ch,d,bs){const a=S.bondAsk;if(a==null||!d.weapons[a])return '';const w=d.weapons[a];const need=bondCost(w)-(BOND_MAX-bs.used);
 const opts=d.weapons.map((x,i)=>bs.on[i]?`<button class="btn sm" data-act="bdswap" data-i="${a}" data-v="${i}">Unbond ${esc(x.to)}${bondCost(x)>1?' (2 slots)':''}</button>`:'').join('');
 return `<div class="bd-ask"><b>${esc(w.to)} needs ${bondCost(w)} slot${bondCost(w)>1?'s':''}${wCls(w)==='heavy'?' (heavy weapon)':''}.</b> Free ${need} more by unbonding:<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px">${opts}${shieldBond(ch)?'<span class="muted">or take off your shield</span>':''}<button class="btn sm ghost" data-act="bdcancel">Cancel</button></div></div>`;}
function bondStowed(ch,d,bs){const ex=!!ch.example;const off=d.weapons.map((w,i)=>bs.on[i]?'':`<div class="bd-off" style="--rc:${rarColor(w.rarity)}"><span><b>${esc(w.to)}</b><small>${esc(RARITY[w.rarity][0])}${bondCost(w)>1?' · heavy, 2 slots':''}</small></span>${ex?'':`<button class="btn sm" data-act="bdon" data-i="${i}">Bond</button>`}</div>`).join('');
 return off?`<details class="bd-stow"${S.bondAsk!=null?' open':''}><summary>Stowed weapons (not bonded)</summary><div class="bd-offs">${off}</div><p class="note">Only bonded weapons can be used in a fight. Swap bonds on a short rest.</p></details>`:'';}
function bondClick(a,b,ch){const st=ch.state=ch.state||{};const d=derive(ch);const i=+b.dataset.i;
 if(a==='bdoff'){bondFix(ch,d);st.wx[i].bond=false;S.bondAsk=null;persist(ch,true);render();return true;}
 if(a==='bdcancel'){S.bondAsk=null;render();return true;}
 if(a==='bdon'||a==='bdswap'){bondFix(ch,d);if(a==='bdswap')st.wx[+b.dataset.v].bond=false;
  const bs=bondState(ch,d);if(bs.used+bondCost(d.weapons[i])<=BOND_MAX){st.wx[i].bond=true;S.bondAsk=null;persist(ch,true);render();toastMsg(`${d.weapons[i].to} bonded.`);}
  else{if(a==='bdswap')persist(ch,true);S.bondAsk=i;render();}return true;}
 return false;}

/* ---- equipment slots ---- */
const EQ_COLS=[[['pauldrons','Pauldrons'],['gloves','Gloves'],['ring1','Ring'],['ring2','Ring'],['ring3','Ring']],
 [['helm','Helm'],['chest','Chest'],['belt','Belt'],['pants','Greaves'],['boots','Boots']],
 [['bracers','Bracers'],['shield','Off-hand'],['curio1','Curio'],['curio2','Curio'],['curio3','Curio']]];
const EQ_LABEL=Object.fromEntries(EQ_COLS.flat());
const EQ_ICON={helm:'⛑',pauldrons:'◭',chest:'⛨',belt:'▭',ring:'◯',bracers:'▥',gloves:'✋',pants:'▯',boots:'▙',shield:'⛉',curio:'✦'};
const PIECE_AC_CAP=3,ARMOUR_CEIL=21; /* chest + pieces never above 21 before shield and class features (= 5e +3 plate) */
function slotType(id){return id.replace(/\d$/,'');}
function itemSlot(it){if(!it)return null;if(it.slot)return it.slot;if(armourSpec(it))return 'chest';if(isShield(it))return 'shield';
 if(/refractor|conversion field|displacer|rosarius|iron halo/i.test(it.name||''))return 'belt';if(it.cat==='curio'||it.cat==='relic')return 'curio';return null;}
function wornSlot(it){if(!it.worn)return null;if(it.ws)return it.ws;const t=itemSlot(it);return t==='ring'||t==='curio'?t+'1':t;}
function inSlot(inv,id){return inv.find(x=>wornSlot(x)===id)||null;}
function eqDupe(ch,it,id){return invOf(ch).find(x=>x!==it&&x.worn&&wornSlot(x)!==id&&(x.cid&&x.cid===it.cid||x.name===it.name));}
function eqEquip(ch,it,id){const inv=invOf(ch);const cur=inSlot(inv,id);if(cur&&cur!==it){cur.worn=false;delete cur.ws;}
 if(it.worn){it.ws=id;return it;}
 if((+it.qty||1)>1){it.qty=(+it.qty)-1;const c=Object.assign({},it,{id:'i'+uid(),qty:1,worn:true,ws:id});inv.push(c);return c;}
 it.worn=true;it.ws=id;return it;}
function eqOff(it){it.worn=false;delete it.ws;}
function freeSlotFor(inv,it){const t=itemSlot(it);if(!t)return null;const ids=EQ_COLS.flat().map(x=>x[0]).filter(id=>slotType(id)===t);return ids.find(id=>!inSlot(inv,id))||ids[0];}
function eqWorn(ch){return ((ch.state||{}).inv||[]).filter(x=>x.worn&&itemSlot(x));}
function paInfo(ch){const w=eqWorn(ch);const chest=w.find(x=>wornSlot(x)==='chest');const core=!!(chest&&chest.pa&&qOf(chest)!=='broken');
 const n=w.filter(x=>x.pa&&wornSlot(x)!=='chest').length;return {chest:!!(chest&&chest.pa),core,n,sealed:core&&n>=3};}
function pieceAC(ch){const raw=eqWorn(ch).filter(x=>!['chest','shield'].includes(wornSlot(x))&&qOf(x)!=='broken').reduce((a,x)=>a+(+x.acb||0),0);return {raw,used:Math.min(PIECE_AC_CAP,raw)};}
function armourCeilHit(ch){const inv=invOf(ch);const body=inSlot(inv,'chest');if(!body||!armourSpec(body))return false;const dex=modOf(+((ch.src.abilities||{}).dex)||10);const [b,cap]=armourSpec(body);return b+Math.min(dex,cap)+chestQPen(body)+pieceAC(ch).used>ARMOUR_CEIL;}
function chestQPen(it){const q=qOf(it);return q==='broken'?-2:q==='shoddy'?-1:0;}
function vEquip(ch,d){const inv=invOf(ch);const ex=!!ch.example;const gm=gmNow();const pa=paInfo(ch);const pc=pieceAC(ch);
 const cell=([id,l])=>{const it=inSlot(inv,id);const t=slotType(id);const on=S.eqOpen===id;
  return `<button class="eq-s${it?' full':''}${on?' sel':''}${it&&it.pa?' pa':''}" data-act="eqopen" data-s="${id}" style="--rc:${it?rarColor(it.rarity):'transparent'}"${ex?' disabled':''}><span class="eq-i">${EQ_ICON[t]}</span><span class="eq-l">${esc(l)}</span>${it?`<span class="eq-n">${esc(qPrefix(it)+it.name)}</span>`:''}</button>`;};
 const picker=()=>{const id=S.eqOpen;if(!id||ex)return '';const t=slotType(id);const cur=inSlot(inv,id);
  const fits=inv.filter(x=>itemSlot(x)===t&&x!==cur);
  return `<div class="eq-pick"><div class="tk-h">${esc(EQ_LABEL[id])}${cur?`: <b>${esc(qPrefix(cur)+cur.name)}</b>`:' (empty)'}</div>
   ${cur?`<p class="note" style="margin-top:0">${esc(cur.desc||'')}${qOf(cur)!=='standard'&&QUAL_TXT[qOf(cur)]?' '+esc(QUAL_TXT[qOf(cur)]):''}</p><div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="eqoff" data-id="${cur.id}">Take off</button>${gm?`<label class="f" style="min-width:150px"><span>Quality (GM)</span><select data-eqq="${cur.id}">${Object.entries(QUAL).map(([k,v])=>opt(k,v[0],qOf(cur))).join('')}</select></label>`:''}</div>`:''}
   ${fits.length?`<div class="eq-list">${fits.map(x=>`<button class="eq-opt" data-act="eqput" data-s="${id}" data-id="${x.id}" style="--rc:${rarColor(x.rarity)}"><b>${esc(qPrefix(x)+x.name)}${x.qty>1?` ×${x.qty}`:''}</b>${x.worn?` <small>(worn: ${esc(EQ_LABEL[wornSlot(x)]||'')})</small>`:''}<small>${esc(RARITY[x.rarity]?RARITY[x.rarity][0]:'')}${x.acb?` · +${x.acb} AC`:''}${x.pa?' · power armour':''} · ${esc((x.desc||'').slice(0,110))}${(x.desc||'').length>110?'…':''}</small></button>`).join('')}</div>`:`<p class="muted">Nothing in your gear fits this slot.</p>`}
   <button class="btn sm ghost" data-act="eqopen" data-s="">Close</button></div>`;};
 const fx=eqWorn(ch).filter(x=>!['chest','shield'].includes(wornSlot(x))).map(x=>{const dead=qOf(x)==='broken'||(x.pa&&!pa.core);
  return `<div class="eq-fx${dead?' dead':''}"><b>${esc(qPrefix(x)+x.name)}</b>${x.acb?` <span class="mono">+${x.acb} AC</span>`:''}${dead?` <small class="bad">${qOf(x)==='broken'?'broken, not working':'unpowered: needs a working power-armour chest'}</small>`:''}<small>${esc(x.desc||'')}</small></div>`;}).join('');
 const curios=eqWorn(ch).filter(x=>slotType(wornSlot(x))==='curio').length;
 return `<section class="sec eq"><h2 class="sec-h">Equipment<small>tap a slot to equip</small></h2>
  <div class="eq-doll">${EQ_COLS.map((c,j)=>`<div class="eq-col${j===1?' mid':''}">${c.map(cell).join('')}</div>`).join('')}</div>
  ${picker()}
  <div class="eq-sum"><span>AC <b class="mono">${d.ac}</b></span>${d.ac&&eqWorn(ch).some(x=>wornSlot(x)==='chest')&&armourCeilHit(ch)?'<span class="bad">Armour ceiling 21 reached</span>':''}<span class="${pc.raw>PIECE_AC_CAP?'bad':''}">Pieces <b class="mono">+${pc.used}</b> of +${PIECE_AC_CAP}${pc.raw>PIECE_AC_CAP?` (${pc.raw-PIECE_AC_CAP} wasted)`:''}</span><span>Curios ${curios}/3</span>${pa.chest||pa.n?`<span class="${pa.sealed?'good':''}">Power armour: ${pa.sealed?'sealed ✓ (vacuum/toxin immune, advantage on Str checks)':!pa.core?(pa.chest?'core broken, unpowered':'no power-armour chest'):`${pa.n}/3 pieces to seal`}</span>`:''}</div>
  ${fx?`<details class="eq-fxs"><summary>What your pieces do</summary>${fx}</details>`:''}
 </section>`;}
function eqClick(a,b,ch){const inv=invOf(ch);
 if(a==='eqopen'){S.eqOpen=b.dataset.s&&S.eqOpen!==b.dataset.s?b.dataset.s:null;render();return true;}
 if(a==='eqput'){const it=inv.find(x=>x.id===b.dataset.id);if(!it)return true;const id=b.dataset.s;if(eqDupe(ch,it,id)){toastMsg(`You already wear a ${it.name}. Copies of the same item don't stack.`);return true;}
  if(slotType(id)==='shield'&&!it.worn){const d=derive(ch);const bs=bondState(ch,d);if(bs.used+1>BOND_MAX)toastMsg('A shield takes a bond slot: unbond a weapon in the Loadout.');}
  const w=eqEquip(ch,it,id);recalcAC(ch);persist(ch,true);S.eqOpen=null;render();toastMsg(`${w.name} on (${EQ_LABEL[id]}). AC is now ${ch.src.ac}.`);return true;}
 if(a==='eqoff'){const it=inv.find(x=>x.id===b.dataset.id);if(!it)return true;eqOff(it);recalcAC(ch);persist(ch,true);render();toastMsg(`${it.name} off. AC is now ${ch.src.ac}.`);return true;}
 return false;}
function eqToggle(ch,it){const inv=invOf(ch);if(it.worn){eqOff(it);return false;}const id=freeSlotFor(inv,it);if(!id||eqDupe(ch,it,id))return false;eqEquip(ch,it,id);return true;}
function eqInput(t){if(!t.dataset.eqq)return false;if(!gmNow())return true;const ch=cur();if(!ch)return true;const it=invOf(ch).find(x=>x.id===t.dataset.eqq);if(!it)return true;
 if(t.value==='standard')delete it.q;else it.q=t.value;recalcAC(ch);persist(ch,true);render();return true;}
/* EQUIP-END */
