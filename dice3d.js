/* Rogue Trader Manifest — 3D dice (D&D Beyond style).
   The app decides every roll itself; this only animates real 3D dice that land on those exact numbers
   (@3d-dice/dice-box-threejs, MIT, vendored in vendor/dice/). Window.Dice3D.roll([[sides,value],...]) resolves when they settle.
   Settings per device: localStorage rtm.dice3d ('0' = off), rtm.dice3d.sound ('0' = mute). */
(function(){
 const BASE=(document.currentScript&&document.currentScript.src||location.href).replace(/[^/]*$/,'');
 const get=k=>{try{return localStorage.getItem(k);}catch(e){return null;}},put=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
 const SIDES=[4,6,8,10,12,20];
 let box=null,loading=null,queue=Promise.resolve(),el=null,hideT=0,dims='';
 const on=()=>get('rtm.dice3d')!=='0',sound=()=>get('rtm.dice3d.sound')!=='0';
 const webgl=(()=>{try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch(e){return false;}})();
 function host(){if(el)return el;el=document.createElement('div');el.id='rtm-dice3d';
  el.style.cssText='position:fixed;inset:0;z-index:70;pointer-events:none;opacity:0;transition:opacity .35s;visibility:hidden';
  document.body.appendChild(el);return el;}
 function load(){if(loading)return loading;
  loading=new Promise((ok,no)=>{const s=document.createElement('script');s.src=BASE+'vendor/dice/dice-box-threejs.umd.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);})
  .then(async()=>{host();const M=window['dice-box-threejs'];const DB=(M&&(M.default||M.DiceBox))||M;
   box=new DB('#rtm-dice3d',{assetPath:BASE+'vendor/dice/',sounds:sound(),volume:60,sound_dieMaterial:'plastic',theme_surface:'taverntable',
    theme_customColorset:{name:'rtm',foreground:'#F1D27A',background:'#7a1a1a',outline:'#1a0606',texture:'none',material:'plastic'},
    theme_material:'plastic',shadows:true,light_intensity:0.85,gravity_multiplier:400,baseScale:130,strength:1.4});
   await box.initialize();dims=innerWidth+'x'+innerHeight;return box;})
  .catch(e=>{loading=null;box=null;throw e;});
  return loading;}
 async function animate(tape){
  const T=tape.filter(t=>SIDES.includes(+t[0])).slice(0,15);if(!T.length)return;
  const groups=[];T.forEach(([s,v])=>{const g=groups[groups.length-1];if(g&&g.s===s)g.v.push(v);else groups.push({s,v:[v]});});
  const note=groups.map(g=>g.v.length+'d'+g.s).join('+')+'@'+groups.flatMap(g=>g.v).join(',');
  await load();
  if(dims!==innerWidth+'x'+innerHeight){try{box.updateConfig({});}catch(e){}dims=innerWidth+'x'+innerHeight;}
  clearTimeout(hideT);el.style.visibility='visible';el.style.opacity='1';
  await Promise.race([box.roll(note),new Promise(r=>setTimeout(r,6000))]);
  hideT=setTimeout(()=>{el.style.opacity='0';setTimeout(()=>{if(el.style.opacity==='0'){el.style.visibility='hidden';try{box.clearDice();}catch(e){}}},400);},1600);}
 window.Dice3D={
  available:webgl,
  on:()=>webgl&&on(),
  sound,
  set(v){put('rtm.dice3d',v?'1':'0');},
  setSound(v){put('rtm.dice3d.sound',v?'1':'0');if(box)try{box.updateConfig({sounds:!!v});}catch(e){}},
  // tape: [[sides,value],...]. Resolves after the dice settle (or straight away if 3D is off / fails).
  roll(tape){if(!this.on()||!tape||!tape.length)return Promise.resolve();
   const p=queue.then(()=>animate(tape)).catch(e=>{try{console.warn('3D dice:',e);}catch(_){}});queue=p;return p;},
  preload(){if(this.on())load().catch(()=>{});}
 };
 // warm up after the page settles so the first roll isn't slow
 addEventListener('load',()=>setTimeout(()=>window.Dice3D.preload(),2500));
})();
