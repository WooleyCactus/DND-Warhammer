/* Rogue Trader Manifest — Shop window: shows players the shop the GM is presenting ("Show wares" on the GM screen).
   Loaded by index.html and map.html. Read-only: list prices, no GM discounts or controls. Players ask the GM to buy. */
(function(){
 if(/[?&]embed=1/.test(location.search))return;
 const URL='https://xpljuyatduvrbhiwfbwn.supabase.co',KEY='sb_publishable_zU8au39xaYFxmL3cZH09gQ_w95iJkD5',
  LIB='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js';
 const get=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
 const put=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
 const norm=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^(.{4})(.+)$/,'$1-$2').slice(0,9);
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const iN=x=>String(x??'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const code=()=>{const c=norm(get('rtm.party.code'));return c.length===9?c:'';};
 const fmt=n=>'₮ '+Number(n||0).toLocaleString();
 const RARC={common:'#A0957D',uncommon:'#7FB069',rare:'#5B8DEF',veryrare:'#B07FE0',legendary:'#E0A33A'};
 const RLAB={common:'Standard issue',uncommon:'Mastercrafted',rare:'Archeotech',veryrare:'Relic',legendary:'Artefact'};
 const CLS={pistol:'Pistol',basic:'Basic weapon',special:'Special weapon',heavy:'Heavy weapon',thrown:'Thrown weapon',melee:'One-handed melee',twohanded:'Two-handed melee',exotic:'Exotic weapon'};
 const CAT={armour:'Armour & shields',grenade:'Grenades & explosives',ammo:'Ammunition',attachment:'Weapon attachment',consumable:'Consumable',gear:'Equipment',relic:'Relic',curio:'Curio',service:'Service'};
 const PH={pistol:'🔫',basic:'🎯',special:'🔥',heavy:'💥',thrown:'🪓',melee:'🗡️',twohanded:'⚔️',exotic:'✨',armour:'🛡️',grenade:'💣',ammo:'📦',attachment:'🔧',consumable:'💉',gear:'🎒',relic:'🏺',service:'🛎️',curio:'🎁'};
 let client=null,chan=null,chanCode='',front=null,imgs=null,open=false,busy=false;

 function load(){return new Promise((ok,no)=>{if(window.supabase)return ok();const s=document.createElement('script');s.src=LIB;s.onload=ok;s.onerror=no;document.head.appendChild(s);});}
 async function ready(){const c=code();if(!c)return false;try{await load();}catch(e){return false;}
  client=client||window.supabase.createClient(URL,KEY,{auth:{persistSession:false}});
  if(chanCode!==c){if(chan)try{client.removeChannel(chan);}catch(e){}
   chanCode=c;chan=client.channel('party-'+c.replace('-',''),{config:{broadcast:{self:false}}}).on('broadcast',{event:'shop'},()=>check()).subscribe();}
  return true;}
 async function check(){if(busy)return;if(!await ready())return;busy=true;
  try{const{data}=await client.rpc('shopfront_get',{p_party:code()});const was=front;front=data||null;
   if(front&&!imgs){try{const r=await client.rpc('item_images');imgs={};(r.data||[]).forEach(n=>{const m=String(n).match(/^(.*)\.(webp|png|jpe?g)$/i);if(m&&!imgs[iN(m[1])])imgs[iN(m[1])]=n;});}catch(e){imgs={};}}
   const seenK='rtm.shop.seen.'+code();
   if(front&&get(seenK)!==front.id+'|'+front.day){put(seenK,front.id+'|'+front.day);open=true;}   // a newly shown shop pops open once
   if(!front)open=false;
   if(JSON.stringify(was)!==JSON.stringify(front))paint();}catch(e){}busy=false;}

 const css=`#rtm-shopfab{position:fixed;right:14px;bottom:max(14px,env(safe-area-inset-bottom));z-index:38;background:#1f1a12;border:1px solid #C8A24A;color:#F1D27A;padding:9px 13px;font:700 13px Georgia,serif;letter-spacing:.04em;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.6),0 0 14px rgba(200,162,74,.25)}
 #rtm-shop{position:fixed;inset:0;z-index:55;background:rgba(5,4,3,.82);overflow:auto;padding:14px;-webkit-overflow-scrolling:touch}
 #rtm-shop .sw{max-width:1200px;margin:0 auto;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#E8DFC8}
 #rtm-shop .hd{display:flex;gap:10px;align-items:flex-start;position:sticky;top:-14px;background:#0f0d0b;border:1px solid #3a3226;border-top:3px solid #C8A24A;padding:12px 14px;margin:-14px -14px 12px;z-index:2}
 #rtm-shop .hd b{display:block;font:700 22px Georgia,serif;color:#F1D27A}#rtm-shop .hd small{color:#A89B82;font-size:13px}
 #rtm-shop .hd .x{margin-left:auto;background:#2a241b;border:1px solid #5a4d36;color:#E8DFC8;font-size:15px;padding:8px 14px;cursor:pointer}
 #rtm-shop .note{font-size:13px;color:#A89B82;margin:0 0 10px}
 #rtm-shop h3{font:700 13px Georgia,serif;letter-spacing:.12em;text-transform:uppercase;color:#C8A24A;margin:16px 0 8px}
 #rtm-shop .g{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
 #rtm-shop .c{background:linear-gradient(180deg,#1f1a15,#141110);border:1px solid #3a3226;border-top:3px solid var(--rc);display:flex;flex-direction:column}
 #rtm-shop .im{aspect-ratio:3/2;position:relative;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,rgba(200,162,74,.13),transparent 70%),#0e0c0a;border-bottom:1px solid #3a3226;overflow:hidden}
 #rtm-shop .im img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}#rtm-shop .im span{font-size:44px;opacity:.55}
 #rtm-shop .b{padding:10px 12px;display:flex;flex-direction:column;gap:8px;flex:1}
 #rtm-shop .t{display:flex;gap:6px;align-items:baseline}#rtm-shop .t b{font:700 17px Georgia,serif;flex:1;line-height:1.15}#rtm-shop .t i{font:700 10px ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--rc);font-style:normal}
 #rtm-shop .sub{font-size:12px;color:#A89B82;margin-top:-6px}
 #rtm-shop .st{display:grid;grid-template-columns:repeat(auto-fit,minmax(68px,1fr));gap:6px}
 #rtm-shop .st div{background:#0b0a08;border:1px solid #3a3226;padding:5px 7px}#rtm-shop .st em{display:block;font:700 9.5px ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#A89B82;font-style:normal}
 #rtm-shop .st strong{display:block;font:700 18px ui-monospace,Menlo,monospace;color:#F1D27A}#rtm-shop .st small{font-size:12px;color:#E8DFC8;font-weight:400}
 #rtm-shop .tg{display:flex;flex-wrap:wrap;gap:4px}#rtm-shop .tg span{font-size:12px;border:1px solid #3a3226;padding:1px 6px;background:#0b0a08}#rtm-shop .tg span.o{border-color:#E0A33A;color:#E0A33A}
 #rtm-shop details{font-size:12.5px;color:#A89B82}#rtm-shop details summary{cursor:pointer;color:#C8A24A}
 #rtm-shop .e{font-size:13.5px;background:#0b0a08;border-left:2px solid #C8A24A;padding:4px 8px}
 #rtm-shop .d{font-size:13.5px;color:#BFB49C;line-height:1.35}
 #rtm-shop .p{margin-top:auto;padding-top:6px;border-top:1px dashed #3a3226;font:700 20px ui-monospace,Menlo,monospace;color:#F1D27A}`;
 function ensureDom(){if(document.getElementById('rtm-shopcss'))return;const st=document.createElement('style');st.id='rtm-shopcss';st.textContent=css;document.head.appendChild(st);}
 function img(it){const f=imgs&&imgs[iN(it.name)];const ph=PH[it.cat==='weapon'?(it.cls||'melee'):it.cat]||'📦';
  return f?`<img src="${URL}/storage/v1/object/public/item-images/${encodeURIComponent(f)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${ph}'}))">`:`<span>${ph}</span>`;}
 function stats(it){const B=(k,v)=>`<div><em>${k}</em><strong>${v}</strong></div>`;
  if(it.cat==='weapon'&&it.dice){const fl=(it.props||[]).includes('Flame');return B('Damage',`${esc(it.dice)}${it.bonus?'+'+it.bonus:''} <small>${esc(it.dtype||'')}</small>`)+B(fl?'Cone':'Range',it.range?`${esc(it.range)}<small> ft</small>`:'Melee')+(it.clip?B('Clip',esc(it.clip)):'');}
  if(it.use){const u=it.use;let h='';
   if(u.dmg)h+=B(u.atk?'Damage (attack)':'Damage',`${esc(u.dmg)}${u.dt?` <small>${esc(u.dt)}</small>`:''}`);
   if(u.heal)h+=B('Heals',`${esc(u.heal)} <small>HP</small>`);if(u.temp)h+=B('Temp HP',esc(u.temp));
   if(u.r)h+=B('Range',esc(u.r).replace(/ ft$/,'<small> ft</small>'));if(u.area)h+=B('Area',`<small>${esc(u.area)}</small>`);
   if(u.save)h+=B('Save',`${esc(u.save)}${u.half?' <small>half</small>':''}`);if(u.dur)h+=B('Lasts',`<small>${esc(u.dur)}</small>`);
   if(u.a&&!u.dmg&&!u.heal&&!u.temp)h+=B('Use',`<small>${esc(u.a)}</small>`);return h;}
  if(Array.isArray(it.armour)){const[a,c]=it.armour;return B('AC',`${a}${c>=99?'<small> + Dex</small>':c>0?`<small> + Dex (max ${c})</small>`:''}`);}
  return '';}
 function card(it,pt){const s=stats(it);const props=it.props||[];
  const tags=[...props.map(x=>`<span title="${esc(pt[x]||'')}">${esc(x)}</span>`),...(it.cat==='attachment'?['<span class="o" title="Installing it uses it up: fitted permanently.">One-time fit</span>']:[])].join('');
  const rules=props.filter(x=>pt[x]).map(x=>`<div><b>${esc(x)}:</b> ${esc(pt[x])}</div>`).join('');
  const sub=it.cat==='weapon'?(CLS[it.cls]||'Weapon'):(CAT[it.cat]||it.cat||'');
  return `<article class="c" style="--rc:${RARC[it.rarity]||RARC.common}"><div class="im">${img(it)}</div><div class="b">
   <div class="t"><b>${esc(it.name)}</b><i>${esc(RLAB[it.rarity]||'')}</i></div><div class="sub">${esc(sub)}</div>
   ${s?`<div class="st">${s}</div>`:''}${tags?`<div class="tg">${tags}</div>`:''}${rules?`<details><summary>What the traits do</summary>${rules}</details>`:''}
   ${it.use&&it.use.eff?`<div class="e">⚡ ${esc(it.use.eff)}</div>`:''}${it.desc?`<div class="d">${esc(it.desc)}</div>`:''}<div class="p">${it.price==null?'Ask':fmt(it.price)}</div></div></article>`;}
 function paint(){ensureDom();let fab=document.getElementById('rtm-shopfab'),ov=document.getElementById('rtm-shop');
  if(!front){fab&&fab.remove();ov&&ov.remove();return;}
  if(!fab){fab=document.createElement('button');fab.id='rtm-shopfab';fab.type='button';fab.onclick=()=>{open=true;paint();};document.body.appendChild(fab);}
  fab.textContent='🛒 '+front.name;fab.style.display=open?'none':'';
  if(!open){ov&&ov.remove();return;}
  if(!ov){ov=document.createElement('div');ov.id='rtm-shop';document.body.appendChild(ov);ov.addEventListener('click',e=>{if(e.target.closest('[data-x]')||e.target===ov){open=false;paint();}});}
  const pt=front.propText||{};const I=front.items||[];
  const W=I.filter(x=>!x.back&&x.cat==='weapon'),G=I.filter(x=>!x.back&&x.cat!=='weapon'&&x.cat!=='service'),Sv=I.filter(x=>!x.back&&x.cat==='service'),B=I.filter(x=>x.back);
  const sec=(t,L)=>L.length?`<h3>${t}</h3><div class="g">${L.map(x=>card(x,pt)).join('')}</div>`:'';
  const top=ov.scrollTop;
  ov.innerHTML=`<div class="sw"><div class="hd"><div><b>${esc(front.name)}</b><small>${esc([front.owner,front.place].filter(Boolean).join(' · '))}</small></div><button class="x" data-x="1" type="button">Close</button></div>
   <p class="note">List prices. Tell the shopkeeper what you want to buy; haggling happens at the table.</p>
   ${sec('Weapons',W)}${sec('Gear',G)}${sec('Services',Sv)}${B.length?sec('From the back room'+(front.trusted?'':' (discretion fee included)'),B):''}</div>`;
  ov.scrollTop=top;}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open){open=false;paint();}});
 function start(){check();setInterval(()=>{if(!document.hidden)check();},20000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
