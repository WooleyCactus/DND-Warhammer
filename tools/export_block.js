/* EXPORT-START: backup file (save/load) and printable sheet */
const BACKUP_KIND='rogue-trader-manifest.character';
function fileSafe(n){return (String(n||'character').replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-')||'character').slice(0,60);}
function backupChar(ch){
 const data={kind:BACKUP_KIND,v:1,savedAt:new Date().toISOString(),character:{src:clone(ch.src),choices:clone(ch.choices||{}),state:clone(ch.state||{}),createdAt:ch.createdAt||null}};
 delete data.character.src._auth;
 const blob=new Blob([JSON.stringify(data,null,1)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fileSafe(ch.src.name)+'.rtm.json';
 document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
 toastMsg('Saved '+(ch.src.name||'character')+' to a file. Keep it somewhere safe.');
}
/* Returns a list of characters from a backup file's text, or throws a readable error. */
function readBackup(text){
 let data;try{data=JSON.parse(text);}catch(e){throw new Error('That file isn\'t a character backup (it isn\'t readable JSON).');}
 const list=data&&data.kind===BACKUP_KIND&&data.character?[data.character]:data&&Array.isArray(data.characters)?data.characters:null;
 if(!list||!list.length)throw new Error('That file isn\'t a Rogue Trader Manifest character backup.');
 return list.map(c=>{if(!c||!c.src||!Array.isArray(c.src.classes))throw new Error('That backup is missing its character data.');
  const src=clone(c.src);delete src._auth;return {src,choices:clone(c.choices||{}),state:clone(c.state||{}),createdAt:c.createdAt||Date.now()};});
}
function restoreBackup(text){
 const list=readBackup(text);let last=null;
 for(const c of list){const ch={id:uid(),src:c.src,choices:c.choices,state:c.state,createdAt:c.createdAt};S.party.push(ch);persist(ch,true);last=ch;}
 S.cur=last.id;S.busy=false;S.msg=null;go('sheet');
 toastMsg(list.length>1?`Loaded ${list.length} characters.`:`Loaded ${last.src.name||'character'} from the backup.`);
}

function printSheet(ch){
 const d=derive(ch),s=ch.src,st=ch.state||{};
 const sg=n=>(n>=0?'+':'')+n;
 const AB=['str','dex','con','int','wis','cha'];
 const abil=(s.abilities||{});
 const cast=d.cast||{trads:[]};
 const byLvl={};(d.spells||[]).forEach(x=>{const k=x.lvl==null?'?':x.lvl;(byLvl[k]=byLvl[k]||[]).push(x);});
 const opts=(typeof optionsSheet==='function'?optionsSheet(s):[]);
 const featLines=[...(s.style&&STYLES[s.style]?[[STYLES[s.style][1],STYLES[s.style][0],STYLES[s.style][2]]]:[]),...(s.feats||[]).map(f=>[f.w40,f.name,f.text])];
 const traits=(d.origin&&d.origin.traits)||[];
 const careerFeats=d.feats||[];
 const roleName=(CREW_ROLES[(ch.choices||{}).crewRole||'trader']||[''])[0];
 const hw=d.homeworld?d.homeworld[0]:'';
 const slots=(cast.slots||[]).map((n,i)=>`L${i+1}: ${'○'.repeat(n)}`).join('  ')+(cast.pact?`  Pact L${cast.pact[1]}: ${'○'.repeat(cast.pact[0])}`:'');
 const html=`<div class="pr">
 <header class="pr-h"><div><div class="pr-eyebrow">Rogue Trader Manifest</div><h1>${esc(s.name||'Unnamed')}</h1>
  <div>${esc(d.origin.name)} · ${d.careers.map(c=>`${esc(c.career)} ${c.level}${c.sub40?` (${esc(c.sub40)})`:''}`).join(' / ')}</div>
  <div class="pr-sub">${[d.bg40,roleName&&('Crew role: '+roleName),hw&&('Homeworld: '+hw),s.player&&('Player: '+s.player)].filter(Boolean).map(esc).join(' · ')}</div>
  <div class="pr-sub">5e: ${esc(s.race||'')} ${(s.classes||[]).map(c=>`${esc(CLASSES[c.cls]?CLASSES[c.cls].name:c.cls)} ${c.level}${c.sub?` (${esc(c.sub)})`:''}`).join(' / ')}</div></div>
  <div class="pr-lvl">Level<b>${d.lvl}</b></div></header>
 <div class="pr-vitals">
  <div><span>Armour class</span><b>${d.ac}</b></div>
  <div><span>Wounds (HP)</span><b>${d.maxHp}</b><i>current ____ temp ____</i></div>
  <div><span>Speed</span><b>${esc(s.speed||30)} ft</b></div>
  <div><span>Initiative</span><b>${sg(d.init)}</b></div>
  <div><span>Proficiency</span><b>${sg(d.pb)}</b></div>
  <div><span>Hit dice</span><b>${d.careers.map(c=>`${c.level}d${c.hd}`).join(' + ')}</b></div>
 </div>
 <div class="pr-cols">
  <section><h2>Characteristics</h2><table class="pr-t"><tr><th></th><th>Score</th><th>Mod</th><th>Save</th></tr>
   ${AB.map(a=>{const sv=(d.saves||[]).find(x=>x.a===a)||{};return `<tr><td>${esc(ABIL_FULL[a]||a)}</td><td>${esc(abil[a]??'')}</td><td>${sg(d.mods[a]||0)}</td><td>${sv.prof?'● ':''}${sg(sv.total||0)}</td></tr>`;}).join('')}</table>
   <h2>Skills</h2><table class="pr-t pr-sk">${(d.skills||[]).map(k=>`<tr><td>${k.prof>1?'◆':k.prof?'●':'○'}</td><td>${esc(k.w40)}${k.w40!==k.name?` <small>(${esc(k.name)})</small>`:''}</td><td>${sg(k.total)}</td></tr>`).join('')}</table>
   <h2>Corruption &amp; Insanity</h2><p>Corruption ${st.corruption||0} · Insanity ${st.insanity||0}</p>
  </section>
  <section><h2>Weapons</h2>${(d.weapons||[]).length?`<table class="pr-t"><tr><th>Weapon</th><th>Hit</th><th>Damage</th><th>Range</th></tr>${d.weapons.map(w=>`<tr><td><b>${esc(w.to)}</b>${w.from&&w.from!==w.to?`<br><small>${esc(w.from)}</small>`:''}${(w.props||[]).length?`<br><small>${esc(w.props.join(', '))}</small>`:''}</td><td>${esc(w.atk)}</td><td>${esc(w.dmg)}</td><td>${esc(w.range||'5 ft')}${w.clip?`<br><small>clip ${w.clip}</small>`:''}</td></tr>`).join('')}</table>`:'<p>None.</p>'}
   ${d.armor?`<p><b>Armour:</b> ${esc(d.armor.to)} (${esc(d.armor.ac)})${s.shield?' + shield':''}</p>`:''}
   ${(d.spells||[]).length?`<h2>Powers</h2>${cast.trads.map(t=>`<p class="pr-sub">${esc(t.classes.join(', '))}: save DC ${t.dc}, attack ${sg(t.atk)} (${esc(String(t.abil).toUpperCase())})</p>`).join('')}${slots?`<p class="pr-sub">Slots ${esc(slots)}</p>`:''}
    ${Object.keys(byLvl).sort((a,b)=>(a==='?')-(b==='?')||a-b).map(k=>`<div class="pr-pw"><b>${k==='0'?'Cantrips':k==='?'?'Other':'Level '+k}:</b> ${byLvl[k].map(x=>esc(x.name40k)+(x.name40k!==x.src?` <small>(${esc(x.src)})</small>`:'')).join(', ')}</div>`).join('')}`:''}
  </section>
 </div>
 <section class="pr-feat"><h2>Origin traits</h2>${traits.map(t=>`<p><b>${esc(t[0])}.</b> ${esc(t[1])}</p>`).join('')||'<p>—</p>'}
  <h2>Career features</h2><p>${careerFeats.map(f=>`<b>${esc(f.to)}</b>${f.to!==f.from?` <small>(${esc(f.from)})</small>`:''}`).join(' · ')||'—'}</p>
  ${d.features40?`<p>${esc(d.features40)}</p>`:''}
  ${featLines.length?`<h2>Feats &amp; doctrine</h2>${featLines.map(f=>`<p><b>${esc(f[0])}</b> <small>(${esc(f[1])})</small>: ${esc(f[2])}</p>`).join('')}`:''}
  ${opts.length?`<h2>Career choices</h2>${opts.map(o=>`<p><b>${esc(o[0])}</b> <small>(${esc(o[1])})</small>: ${esc(o[2])}</p>`).join('')}`:''}
  <h2>Equipment</h2><p>${esc(d.equipment40||'—')}</p>
  ${s.languages?`<h2>Languages</h2><p>${esc(s.languages)}</p>`:''}
 </section>
 <footer class="pr-foot">Printed ${new Date().toLocaleDateString()} · wooleycactus.github.io/DND-Warhammer</footer>
 </div>`;
 let el=document.getElementById('printout');if(!el){el=document.createElement('div');el.id='printout';document.body.appendChild(el);}
 el.innerHTML=html;document.body.classList.add('printing');
 const done=()=>{document.body.classList.remove('printing');window.removeEventListener('afterprint',done);};
 window.addEventListener('afterprint',done);
 setTimeout(()=>window.print(),50);
}
/* EXPORT-END */
