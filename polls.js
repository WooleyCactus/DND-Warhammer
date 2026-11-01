/* Rogue Trader Manifest — private GM polls, shown to one player at a time.
   Loaded by index.html and map.html. Knows "who this device plays" from localStorage
   key rtm.map.role.<PARTY> (set on the map, or with the "This is me" bar on a sheet). */
(function(){
 const URL='https://xpljuyatduvrbhiwfbwn.supabase.co',KEY='sb_publishable_zU8au39xaYFxmL3cZH09gQ_w95iJkD5',
  LIB='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js';
 const get=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
 const put=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
 const norm=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^(.{4})(.+)$/,'$1-$2').slice(0,9);
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const code=()=>{const c=norm(get('rtm.party.code'));return c.length===9?c:'';};
 const me=()=>{const c=code();const r=c&&get('rtm.map.role.'+c);return r&&r!=='gm'?r:'';};
 let client=null,chan=null,chanCode='',open=[],busy=false,skip={};
 function load(){return new Promise((ok,no)=>{if(window.supabase)return ok();const s=document.createElement('script');s.src=LIB;s.onload=ok;s.onerror=no;document.head.appendChild(s);});}
 async function ready(){
  const c=code();if(!c)return false;
  try{await load();}catch(e){return false;}
  client=client||window.supabase.createClient(URL,KEY,{auth:{persistSession:false}});
  if(chanCode!==c){if(chan)try{client.removeChannel(chan);}catch(e){}
   chanCode=c;chan=client.channel('polls-'+c.replace('-',''),{config:{broadcast:{self:false}}})
    .on('broadcast',{event:'poll'},({payload})=>{const m=me();if(m&&(!payload||!payload.chars||payload.chars.includes(m)))check();}).subscribe();}
  return true;
 }
 async function check(){
  if(busy)return;const m=me();if(!m){draw();return;}
  if(!await ready())return;busy=true;
  try{const{data,error}=await client.rpc('poll_open',{p_party:code(),p_char:m});if(!error)open=(data||[]).filter(p=>!skip[p.id]);}catch(e){}
  busy=false;draw();
 }
 const css=`#rtm-poll{position:fixed;inset:0;z-index:50;display:grid;place-items:end center;background:rgba(5,4,3,.6);padding:12px;padding-bottom:max(12px,env(safe-area-inset-bottom))}
 #rtm-poll .card{width:100%;max-width:440px;background:#D8C59C;color:#2A1E10;border:1px solid #7A5C1E;box-shadow:0 10px 40px rgba(0,0,0,.7);padding:18px;font:16px/1.4 'Alegreya Sans',system-ui,sans-serif;max-height:85vh;overflow:auto}
 #rtm-poll .k{font:700 11px 'Cinzel',Georgia,serif;letter-spacing:.14em;color:#7A1E1E;text-transform:uppercase}
 #rtm-poll h2{font:700 19px 'Cinzel',Georgia,serif;margin:6px 0 12px;color:#2A1E10}
 #rtm-poll .opts{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
 #rtm-poll label{display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.35);border:1px solid rgba(42,30,16,.25);padding:9px 10px;cursor:pointer}
 #rtm-poll textarea{width:100%;box-sizing:border-box;min-height:70px;font:inherit;padding:8px;border:1px solid rgba(42,30,16,.35);background:rgba(255,255,255,.5);color:#2A1E10}
 #rtm-poll .row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
 #rtm-poll button{font:700 14px 'Alegreya Sans',sans-serif;padding:9px 14px;border:1px solid #7A5C1E;background:#2A1E10;color:#EBCB7A;cursor:pointer}
 #rtm-poll button.later{background:transparent;color:#2A1E10}
 #rtm-me{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:40;background:#1B1815;border:1px solid #7A5C1E;color:#E8DEC6;padding:8px 10px 8px 14px;display:flex;gap:10px;align-items:center;font:14px 'Alegreya Sans',sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.6);max-width:calc(100% - 24px)}
 #rtm-me button{font:700 13px 'Alegreya Sans',sans-serif;padding:6px 10px;border:1px solid #7A5C1E;background:#C8A24A;color:#140F06;cursor:pointer}
 #rtm-me button.x{background:transparent;color:#A0957D;border-color:transparent}`;
 function host(id){let el=document.getElementById(id);if(!el){if(!document.getElementById('rtm-poll-css')){const st=document.createElement('style');st.id='rtm-poll-css';st.textContent=css;document.head.appendChild(st);}
  el=document.createElement('div');el.id=id;document.body.appendChild(el);}return el;}
 function draw(){
  const p=open[0];const el=document.getElementById('rtm-poll');
  if(!p){if(el)el.remove();return;}
  const d=p.data||{};const opts=Array.isArray(d.opts)?d.opts:[];
  const h=host('rtm-poll');if(h.dataset.id===p.id)return;h.dataset.id=p.id;
  h.innerHTML=`<div class="card" role="dialog" aria-label="Message from the GM"><div class="k">${esc(d.title||'From the GM')} · only you see this</div><h2>${esc(d.q||'')}</h2>
   ${opts.length?`<div class="opts">${opts.map((o,i)=>`<label><input type="radio" name="rtmopt" value="${i}"> ${esc(o)}</label>`).join('')}</div>`:''}
   ${d.free||!opts.length?`<textarea id="rtm-txt" placeholder="${opts.length?'Anything to add? (optional)':'Your answer'}"></textarea>`:''}
   <div class="row"><button class="later" data-a="later">Later</button><button data-a="send">Send to GM</button></div></div>`;
 }
 document.addEventListener('click',async e=>{
  const b=e.target.closest('#rtm-poll button,#rtm-me button');if(!b)return;const a=b.dataset.a;
  if(a==='later'){const p=open.shift();if(p)skip[p.id]=Date.now();const h=document.getElementById('rtm-poll');if(h)h.dataset.id='';draw();setTimeout(()=>{if(p)delete skip[p.id];},10*60*1000);return;}
  if(a==='send'){const p=open[0];if(!p)return;const d=p.data||{};const r=document.querySelector('#rtm-poll input[name=rtmopt]:checked');const t=(document.getElementById('rtm-txt')||{}).value||'';
   if((d.opts||[]).length&&!r&&!t.trim()){b.textContent='Pick an answer';return;}
   const ans={choice:r?(d.opts||[])[+r.value]:null,text:t.trim()||null};b.disabled=true;
   const{error}=await client.rpc('poll_answer',{p_party:code(),p_id:p.id,p_char:me(),p_answer:ans});
   if(error){b.disabled=false;b.textContent='Couldn’t send, try again';return;}
   try{chan.send({type:'broadcast',event:'answered',payload:{id:p.id}});}catch(err){}
   open.shift();const h=document.getElementById('rtm-poll');if(h)h.dataset.id='';draw();return;}
  if(a==='me'){const c=code();put('rtm.map.role.'+c,b.dataset.id);meBar();check();return;}
  if(a==='nome'){put('rtm.me.skip.'+code()+'.'+b.dataset.id,'1');meBar();return;}
 });
 // On the sheets app: offer "This is my character" so polls reach the right device.
 function meBar(){
  const el=document.getElementById('rtm-me');let ch=null;
  try{if(typeof S!=='undefined'&&S.view==='sheet'&&typeof cur==='function')ch=cur();}catch(e){}
  const c=code();const role=c&&get('rtm.map.role.'+c);
  if(!ch||!c||role||get('rtm.me.skip.'+c+'.'+ch.id)||(typeof gmNow==='function'&&gmNow())){if(el)el.remove();return;}
  const name=(ch.src&&ch.src.name)||'this character';const h=host('rtm-me');if(h.dataset.id===ch.id)return;h.dataset.id=ch.id;
  h.innerHTML=`<span>Is <b>${esc(name)}</b> your character?</span><button data-a="me" data-id="${esc(ch.id)}">Yes, that's me</button><button class="x" data-a="nome" data-id="${esc(ch.id)}" aria-label="No">✕</button>`;
 }
 window.RTMPolls={check,setMe:id=>{const c=code();if(c){put('rtm.map.role.'+c,id);check();}}};
 setInterval(()=>{meBar();},1200);
 setInterval(()=>{if(document.visibilityState==='visible')check();},30000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});
 window.addEventListener('storage',e=>{if(e.key&&e.key.startsWith('rtm.'))check();});
 setTimeout(check,1500);
})();
