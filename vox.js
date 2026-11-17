/* Rogue Trader Manifest — Vox: in-world transmissions the GM pushes to players.
   Loaded by index.html and map.html. Shows an "Incoming vox" alert for new messages and a Vox log button.
   Who this device plays comes from localStorage rtm.map.role.<PARTY> (same as polls). Read state is per device. */
(function(){
 if(/[?&]embed=1/.test(location.search))return;            // the GM screen's embedded map
 const URL='https://xpljuyatduvrbhiwfbwn.supabase.co',KEY='sb_publishable_zU8au39xaYFxmL3cZH09gQ_w95iJkD5',
  LIB='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js';
 const get=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
 const put=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
 const norm=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^(.{4})(.+)$/,'$1-$2').slice(0,9);
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const code=()=>{const c=norm(get('rtm.party.code'));return c.length===9?c:'';};
 const role=()=>{const c=code();return c?get('rtm.map.role.'+c)||'':'';};
 const me=()=>{const r=role();return r&&r!=='gm'?r:'';};
 const seenKey=()=>'rtm.vox.seen.'+code()+'.'+(me()||'party');
 const seen=()=>{try{return new Set(JSON.parse(get(seenKey())||'[]'));}catch(e){return new Set();}};
 const markSeen=ids=>{const s=seen();ids.forEach(i=>s.add(i));put(seenKey(),JSON.stringify([...s].slice(-400)));};
 let client=null,chan=null,chanCode='',msgs=[],busy=false,queue=[],showing=null,first=true;

 function load(){return new Promise((ok,no)=>{if(window.supabase)return ok();const s=document.createElement('script');s.src=LIB;s.onload=ok;s.onerror=no;document.head.appendChild(s);});}
 async function ready(){
  const c=code();if(!c)return false;try{await load();}catch(e){return false;}
  client=client||window.supabase.createClient(URL,KEY,{auth:{persistSession:false}});
  if(chanCode!==c){if(chan)try{client.removeChannel(chan);}catch(e){}
   chanCode=c;chan=client.channel('vox-'+c.replace('-',''),{config:{broadcast:{self:false}}})
    .on('broadcast',{event:'vox'},({payload})=>{const m=me();if(!payload||!payload.chars||!payload.chars.length||(m&&payload.chars.includes(m)))check(true);}).subscribe();}
  return true;
 }
 async function check(live){
  if(busy||role()==='gm')return;if(!await ready())return;busy=true;
  try{const m=me();const{data,error}=await client.rpc('vox_mine',{p_party:code(),p_char:m||null,p_pin:m?get('rtm.key.'+code()+'.'+m):null});
   if(!error){msgs=data||[];const s=seen();const fresh=msgs.filter(x=>!s.has(x.id)&&!queue.some(q=>q.id===x.id)&&!(showing&&showing.id===x.id));
    queue.push(...fresh);if(fresh.length&&(live||!first))alarm();first=false;}}catch(e){}
  busy=false;fab();if(!showing)banner();
 }

 /* ---------- sound + buzz: a short burst of static, then three tones ---------- */
 let ac=null;document.addEventListener('pointerdown',()=>{try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}catch(e){}},{once:false,passive:true});
 function alarm(){try{navigator.vibrate&&navigator.vibrate([60,40,60,40,120]);}catch(e){}
  if(!ac)return;try{const t=ac.currentTime;const n=ac.sampleRate*.35;const b=ac.createBuffer(1,n,ac.sampleRate);const d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
   const src=ac.createBufferSource();src.buffer=b;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;const g=ac.createGain();g.gain.value=.25;src.connect(f).connect(g).connect(ac.destination);src.start(t);
   [880,660,990].forEach((hz,i)=>{const o=ac.createOscillator(),gg=ac.createGain();o.type='square';o.frequency.value=hz;gg.gain.setValueAtTime(.0001,t+.4+i*.14);gg.gain.exponentialRampToValueAtTime(.08,t+.42+i*.14);gg.gain.exponentialRampToValueAtTime(.0001,t+.52+i*.14);o.connect(gg).connect(ac.destination);o.start(t+.4+i*.14);o.stop(t+.56+i*.14);});}catch(e){}}

 const css=`#rtm-vox-b{position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:60;background:#0d1a0f;border:1px solid #3f8f4a;color:#9BF0A6;padding:12px 16px;font:700 14px 'Share Tech Mono',ui-monospace,Menlo,monospace;letter-spacing:.08em;box-shadow:0 0 0 1px #000,0 8px 30px rgba(0,0,0,.7),0 0 18px rgba(80,220,110,.35);cursor:pointer;display:flex;gap:10px;align-items:center;animation:rtmvp 1.2s ease-in-out infinite;max-width:calc(100% - 24px)}
 #rtm-vox-b small{font-weight:400;color:#6fbf7a;letter-spacing:.02em;white-space:nowrap}
 #rtm-vox-b>span{white-space:nowrap}
 @keyframes rtmvp{50%{box-shadow:0 0 0 1px #000,0 8px 30px rgba(0,0,0,.7),0 0 28px rgba(80,220,110,.7)}}
 #rtm-vox{position:fixed;inset:0;z-index:61;display:grid;place-items:center;background:rgba(2,6,3,.72);padding:14px}
 #rtm-vox .card{width:100%;max-width:480px;max-height:86vh;overflow:auto;background:#07110a;color:#9BF0A6;border:1px solid #3f8f4a;box-shadow:0 0 30px rgba(80,220,110,.25),inset 0 0 60px rgba(0,0,0,.6);padding:18px;font:15px/1.5 'Share Tech Mono',ui-monospace,Menlo,monospace;position:relative}
 #rtm-vox .card:after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px)}
 #rtm-vox .k{font-size:11px;letter-spacing:.18em;color:#5fae6b;text-transform:uppercase;display:flex;justify-content:space-between;gap:8px}
 #rtm-vox h2{font:700 17px 'Share Tech Mono',ui-monospace,monospace;margin:8px 0 12px;color:#C8FFD0;letter-spacing:.06em}
 #rtm-vox .body{white-space:pre-wrap;min-height:3em}
 #rtm-vox .body.static{animation:rtmflk .18s steps(2) infinite}
 @keyframes rtmflk{50%{opacity:.82}}
 #rtm-vox .row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;position:relative;z-index:1}
 #rtm-vox button{font:700 13px 'Share Tech Mono',ui-monospace,monospace;letter-spacing:.06em;padding:8px 12px;border:1px solid #3f8f4a;background:#123a19;color:#C8FFD0;cursor:pointer}
 #rtm-vox button.ghost{background:transparent;color:#6fbf7a}
 #rtm-vox .log{display:flex;flex-direction:column;gap:10px}
 #rtm-vox .log .it{border:1px solid #1f4a26;padding:9px 10px;cursor:pointer;position:relative;z-index:1}
 #rtm-vox .log .it.new{border-color:#5fd06e}
 #rtm-vox .log .it b{color:#C8FFD0}
 #rtm-vox .log .it p{margin:4px 0 0;color:#86d892;white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
 #rtm-voxfab{position:fixed;left:14px;bottom:max(14px,env(safe-area-inset-bottom));z-index:38;background:#0d1a0f;border:1px solid #3f8f4a;color:#9BF0A6;padding:9px 12px;font:700 13px 'Share Tech Mono',ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.6)}
 #rtm-voxfab i{font-style:normal;background:#B3262A;color:#fff;border-radius:9px;padding:1px 6px;margin-left:6px}`;
 function host(id){if(!document.getElementById('rtm-vox-css')){const st=document.createElement('style');st.id='rtm-vox-css';st.textContent=css;document.head.appendChild(st);}
  let el=document.getElementById(id);if(!el){el=document.createElement('div');el.id=id;document.body.appendChild(el);}return el;}
 const rm=id=>{const el=document.getElementById(id);if(el)el.remove();};
 const when=t=>{try{return new Date(t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});}catch(e){return'';}};
 const STY={clear:'CLEAR CHANNEL',static:'HEAVY INTERFERENCE',cipher:'ENCRYPTED'};

 function banner(){const q=queue[0];if(!q){rm('rtm-vox-b');return;}const d=q.data||{};
  const b=host('rtm-vox-b');b.innerHTML=`<span>📡 INCOMING VOX${queue.length>1?' ('+queue.length+')':''}</span><small>${esc(d.from||'Unknown source')} · tap to open</small>`;b.onclick=()=>open(queue[0]);}
 function fab(){const c=code();if(!c||role()==='gm'||!msgs.length){rm('rtm-voxfab');return;}const s=seen();const n=msgs.filter(x=>!s.has(x.id)).length;
  const f=host('rtm-voxfab');f.innerHTML=`📡 Vox log${n?`<i>${n}</i>`:''}`;f.onclick=log;}

 // Text effects: static garbles characters and then clears; cipher stays scrambled until "Decrypt".
 const GL='▒░▓#%&@$*/\\|';
 function scramble(t,p){return[...t].map(ch=>/\s/.test(ch)||Math.random()>p?ch:GL[Math.floor(Math.random()*GL.length)]).join('');}
 let fx=0;
 function play(el,text,style){clearInterval(fx);let i=0;const step=Math.max(1,Math.round(text.length/90));
  if(style==='cipher'){el.textContent=scramble(text,.85);fx=setInterval(()=>{el.textContent=scramble(text,.85);},140);return;}
  fx=setInterval(()=>{i=Math.min(text.length,i+step);const shown=text.slice(0,i);el.textContent=style==='static'?scramble(shown,.12)+(i<text.length?'▌':''):shown+(i<text.length?'▌':'');
   if(i>=text.length){clearInterval(fx);if(style==='static'){let k=0;fx=setInterval(()=>{k++;el.textContent=scramble(text,.12/k);if(k>5){clearInterval(fx);el.textContent=text;el.classList.remove('static');}},160);}}},30);}

 function open(m){if(!m)return;showing=m;queue=queue.filter(q=>q.id!==m.id);markSeen([m.id]);rm('rtm-vox-b');fab();
  const d=m.data||{};const st=d.style||'clear';const h=host('rtm-vox');
  h.innerHTML=`<div class="card" role="dialog" aria-label="Vox message"><div class="k"><span>${STY[st]||STY.clear}${m.private?' · only you received this':''}</span><span>${esc(when(m.created_at))}</span></div>
   <h2>FROM: ${esc(d.from||'Unknown source')}</h2><div class="body ${st==='static'?'static':''}" id="rtm-vox-t"></div>
   <div class="row">${st==='cipher'?'<button data-v="dec">Decrypt</button>':''}<button class="ghost" data-v="log">Vox log</button><button data-v="close">${queue.length?'Next ▸':'Close'}</button></div></div>`;
  play(h.querySelector('#rtm-vox-t'),String(d.text||''),st);}
 function log(){showing={id:'_log'};clearInterval(fx);const s=seen();const list=[...msgs].reverse();const h=host('rtm-vox');
  h.innerHTML=`<div class="card" role="dialog" aria-label="Vox log"><div class="k"><span>VOX LOG · ${esc(code())}</span><span>${list.length} message${list.length===1?'':'s'}</span></div><h2>Recorded transmissions</h2>
   <div class="log">${list.map(x=>{const d=x.data||{};return`<div class="it ${s.has(x.id)?'':'new'}" data-id="${esc(x.id)}"><b>${esc(d.from||'Unknown source')}</b> <span style="color:#5fae6b;font-size:12px">${esc(when(x.created_at))}${x.private?' · private':''}</span><p>${esc(d.style==='cipher'?scramble(String(d.text||''),.85):d.text||'')}</p></div>`;}).join('')||'<p>No transmissions yet.</p>'}</div>
   <div class="row"><button data-v="close">Close</button></div></div>`;}
 document.addEventListener('click',e=>{const h=document.getElementById('rtm-vox');if(!h||!h.contains(e.target))return;
  const it=e.target.closest('.it');if(it){const m=msgs.find(x=>x.id===it.dataset.id);if(m)open(m);return;}
  const b=e.target.closest('button');if(!b){if(e.target===h){/* tap outside */}return;}const v=b.dataset.v;
  if(v==='dec'){const m=showing;const el=document.getElementById('rtm-vox-t');if(m&&el){clearInterval(fx);let k=0;const t=String((m.data||{}).text||'');fx=setInterval(()=>{k++;el.textContent=scramble(t,.85/k);if(k>7){clearInterval(fx);el.textContent=t;}},140);}b.remove();return;}
  if(v==='log'){log();return;}
  if(v==='close'){clearInterval(fx);if(queue.length){open(queue[0]);return;}showing=null;h.remove();banner();fab();}
 });
 window.RTMVox={check,log};
 setInterval(()=>{if(document.visibilityState==='visible')check();},30000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});
 window.addEventListener('storage',e=>{if(e.key&&/^rtm\.(party|map\.role|key)/.test(e.key))check();});
 setTimeout(check,1200);
})();
