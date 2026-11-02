/* Rogue Trader Manifest — battle map generator and movement rules (shared by map.html and gm.html). */
/*GEN-START*/
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let a=hashStr(String(seed));return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Terrain: ' ' void, '.' floor, '#' wall, '+' door, 'c' cover (half cover, difficult), 'd' difficult, 'h' hazard
const WALK='.+cdh';
const COST={'.':1,'+':1,'h':1,'c':2,'d':2};
const THEMES={ship:'Voidship deck',hive:'Hive underworks',maze:'Egarian labyrinth',open:'Open ground'};
const SIZES={s:[20,15,'Small · 100×75 ft'],m:[30,20,'Medium · 150×100 ft'],l:[40,28,'Large · 200×140 ft']};

function generate(theme,w,h,seed){
 const R=rng(seed+':'+theme+':'+w+'x'+h);const ri=(a,b)=>a+Math.floor(R()*(b-a+1));
 let g=new Array(w*h).fill('#');
 const at=(x,y)=>(x<0||y<0||x>=w||y>=h)?'#':g[y*w+x];
 const set=(x,y,c)=>{if(x>0&&y>0&&x<w-1&&y<h-1)g[y*w+x]=c;};
 const rect=(x0,y0,x1,y1,c)=>{for(let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++)for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)set(x,y,c);};
 const blob=(c,steps,only)=>{let x=ri(2,w-3),y=ri(2,h-3);for(let i=0;i<steps;i++){if(!only||only.includes(at(x,y)))set(x,y,c);x+=ri(-1,1);y+=ri(-1,1);x=Math.max(1,Math.min(w-2,x));y=Math.max(1,Math.min(h-2,y));}};
 let start={x:2,y:h>>1};
 if(theme==='ship'){
  const leaves=[];
  (function split(x,y,W,H,d){
   const canH=W>=14,canV=H>=12;
   if(d>4||(!canH&&!canV)||(d>2&&R()<.25)){leaves.push({x,y,W,H});return;}
   const horiz=canH&&(!canV||W/H>1.2||(W/H>.8&&R()<.5));
   if(horiz){const s=ri(6,W-6);split(x,y,s,H,d+1);split(x+s,y,W-s,H,d+1);}
   else{const s=ri(5,H-5);split(x,y,W,s,d+1);split(x,y+s,W,H-s,d+1);}
  })(1,1,w-2,h-2,0);
  const rooms=leaves.map(l=>{const rw=ri(Math.max(3,Math.floor(l.W*.55)),l.W-2),rh=ri(Math.max(3,Math.floor(l.H*.55)),l.H-2);
   const rx=l.x+ri(1,Math.max(1,l.W-rw-1)),ry=l.y+ri(1,Math.max(1,l.H-rh-1));return{x:rx,y:ry,w:rw,h:rh,cx:rx+(rw>>1),cy:ry+(rh>>1)};});
  rooms.forEach(r=>rect(r.x,r.y,r.x+r.w-1,r.y+r.h-1,'.'));
  const corr=(a,b)=>{if(R()<.5){rect(a.cx,a.cy,b.cx,a.cy+1,'.');rect(b.cx,a.cy,b.cx+1,b.cy,'.');}else{rect(a.cx,a.cy,a.cx+1,b.cy,'.');rect(a.cx,b.cy,b.cx,b.cy+1,'.');}};
  for(let i=1;i<rooms.length;i++)corr(rooms[i-1],rooms[i]);
  for(let k=0;k<Math.floor(rooms.length/3);k++)corr(rooms[ri(0,rooms.length-1)],rooms[ri(0,rooms.length-1)]);
  const inRoom=(x,y)=>rooms.some(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);
  rooms.forEach(r=>{
   const sides=[[],[],[],[]];
   for(let x=r.x;x<r.x+r.w;x++){sides[0].push([x,r.y-1]);sides[1].push([x,r.y+r.h]);}
   for(let y=r.y;y<r.y+r.h;y++){sides[2].push([r.x-1,y]);sides[3].push([r.x+r.w,y]);}
   sides.forEach(side=>{let run=[];const flush=()=>{if(run.length&&run.length<=3)run.forEach(([x,y])=>set(x,y,'+'));run=[];};
    side.forEach(([x,y])=>{if(at(x,y)==='.'&&!inRoom(x,y))run.push([x,y]);else flush();});flush();});
  });
  rooms.forEach(r=>{if(r.w*r.h<16)return;for(let i=ri(0,2);i>0;i--){const x=ri(r.x+1,r.x+r.w-2),y=ri(r.y+1,r.y+r.h-2);if(at(x,y)==='.')set(x,y,'c');}});
  if(rooms.length>2&&R()<.6){const r=rooms[ri(1,rooms.length-1)];const x=ri(r.x,r.x+r.w-2),y=ri(r.y,r.y+r.h-2);for(const[dx,dy]of[[0,0],[1,0],[0,1],[1,1]])if(at(x+dx,y+dy)==='.')set(x+dx,y+dy,'h');}
  start={x:rooms[0].cx,y:rooms[0].cy};
 }else if(theme==='hive'){
  let best=null;
  for(let tries=0;tries<6;tries++){
   let a=new Array(w*h);for(let i=0;i<w*h;i++){const x=i%w,y=(i/w)|0;a[i]=(x===0||y===0||x===w-1||y===h-1||R()<.45)?'#':'.';}
   for(let it=0;it<5;it++){const b=a.slice();for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(a[(y+dy)*w+x+dx]==='#')n++;b[y*w+x]=n>=5?'#':'.';}a=b;}
   const reg=regions(a,w,h);if(reg.length&&(!best||reg[0].length>best.size))best={a,size:reg[0].length,cells:reg[0]};
   if(best&&best.size>w*h*.38)break;
  }
  if(!best){rect(2,2,w-3,h-3,'.');best={cells:[]};for(let i=0;i<w*h;i++)if(g[i]==='.')best.cells.push(i);}
  else{g=best.a.map(c=>c==='.'?'#':c);best.cells.forEach(i=>g[i]='.');}
  for(let i=Math.max(2,(w*h/140)|0);i>0;i--)blob('d',ri(5,12),'.');
  for(let i=Math.max(1,(w*h/400)|0);i>0;i--)blob('h',ri(4,8),'.');
  const pick=best.cells.reduce((p,i)=>(i%w)<(p%w)?i:p,best.cells[0]);start={x:pick%w,y:(pick/w)|0};
 }else if(theme==='maze'){
  const cols=Math.floor((w-1)/3),rows=Math.floor((h-1)/3);const seen=new Uint8Array(cols*rows);
  const cell=(i,j)=>rect(1+3*i,1+3*j,2+3*i,2+3*j,'.');
  const link=(i,j,k,l)=>{if(k>i)rect(3+3*i,1+3*j,3+3*i,2+3*j,'.');else if(k<i)rect(3*i,1+3*j,3*i,2+3*j,'.');else if(l>j)rect(1+3*i,3+3*j,2+3*i,3+3*j,'.');else rect(1+3*i,3*j,2+3*i,3*j,'.');};
  const st=[[0,rows>>1]];seen[(rows>>1)*cols]=1;cell(0,rows>>1);
  while(st.length){const[i,j]=st[st.length-1];const nb=[[i+1,j],[i-1,j],[i,j+1],[i,j-1]].filter(([k,l])=>k>=0&&l>=0&&k<cols&&l<rows&&!seen[l*cols+k]);
   if(!nb.length){st.pop();continue;}const[k,l]=nb[ri(0,nb.length-1)];seen[l*cols+k]=1;cell(k,l);link(i,j,k,l);st.push([k,l]);}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){if(i<cols-1&&R()<.12)link(i,j,i+1,j);if(j<rows-1&&R()<.12)link(i,j,i,j+1);}
  for(let c=0;c<2&&cols>3&&rows>3;c++){const i=ri(1,cols-3),j=ri(0,rows-2);rect(1+3*i,1+3*j,2+3*(i+1),2+3*(j+1),'.');}
  for(let i=Math.max(2,(w*h/110)|0);i>0;i--){const x=ri(1,w-2),y=ri(1,h-2);if(at(x,y)==='.')set(x,y,'h');}
  start={x:1,y:1+3*(rows>>1)};
 }else{
  rect(1,1,w-2,h-2,'.');
  for(let i=(w*h/55)|0;i>0;i--){let x=ri(4,w-5),y=ri(2,h-3);const len=ri(2,5),dir=ri(0,3);const bend=R()<.4;
   for(let k=0;k<len;k++){set(x,y,'#');if(dir===0)x++;else if(dir===1)x--;else if(dir===2)y++;else y--;}
   if(bend)for(let k=0;k<ri(1,3);k++){set(x,y,'#');if(dir<2)y++;else x++;}}
  for(let i=(w*h/45)|0;i>0;i--){const x=ri(3,w-4),y=ri(1,h-2);for(let k=ri(1,3);k>0;k--){const xx=x+ri(-1,1),yy=y+ri(-1,1);if(at(xx,yy)==='.')set(xx,yy,'c');}}
  for(let i=Math.max(2,(w*h/120)|0);i>0;i--)blob('d',ri(4,10),'.');
  if(R()<.6)blob('h',ri(5,9),'.');
  start={x:2,y:h>>1};
 }
 const m={w,h,theme,seed:String(seed),cells:g.join('')};
 m.start=nearestWalk(m,start.x,start.y)||{x:1,y:1};
 // drop pockets you can't walk to, then turn walls far from any floor into empty void
 const d=flood(m,m.start.x,m.start.y);
 for(let i=0;i<w*h;i++)if(WALK.includes(g[i])&&d[i]<0)g[i]='#';
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(g[y*w+x]!=='#')continue;let near=false;
  for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++){const c=at(x+dx,y+dy);if(c!=='#'&&c!==' '&&WALK.includes(c)){near=true;break;}}
  if(!near)g[y*w+x]=' ';}
 m.cells=g.join('');
 let far=0;for(let i=0;i<w*h;i++)if(d[i]>d[far]&&WALK.includes(g[i]))far=i;
 m.foe={x:far%w,y:(far/w)|0};
 return m;
}
function regions(a,w,h){const seen=new Uint8Array(w*h),out=[];
 for(let i=0;i<w*h;i++){if(seen[i]||a[i]!=='.')continue;const q=[i],reg=[];seen[i]=1;
  while(q.length){const c=q.pop();reg.push(c);const x=c%w,y=(c/w)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=(y+dy)*w+x+dx;if(x+dx<0||x+dx>=w||y+dy<0||y+dy>=h||seen[n]||a[n]!=='.')continue;seen[n]=1;q.push(n);}}
  out.push(reg);}
 return out.sort((p,q)=>q.length-p.length);}
function cellAtM(m,x,y){return(x<0||y<0||x>=m.w||y>=m.h)?' ':m.cells[y*m.w+x];}
function walkable(m,x,y,s){s=s||1;for(let j=0;j<s;j++)for(let i=0;i<s;i++)if(!WALK.includes(cellAtM(m,x+i,y+j)))return false;return true;}
function stepCost(m,x,y,s){let c=1;for(let j=0;j<(s||1);j++)for(let i=0;i<(s||1);i++)c=Math.max(c,COST[cellAtM(m,x+i,y+j)]||1);return c;}
function nearestWalk(m,x,y,s,taken){let best=null,bd=1e9;for(let yy=0;yy<m.h;yy++)for(let xx=0;xx<m.w;xx++){if(!walkable(m,xx,yy,s)||(taken&&taken(xx,yy,s)))continue;const dd=Math.max(Math.abs(xx-x),Math.abs(yy-y))*100+Math.abs(xx-x)+Math.abs(yy-y);if(dd<bd){bd=dd;best={x:xx,y:yy};}}return best;}
// Movement cost in squares (2024 rules: every square, diagonal or not, is 5 ft; difficult terrain costs double).
// No cutting diagonally past a wall corner.
function flood(m,sx,sy,s){s=s||1;const N=m.w*m.h,d=new Int32Array(N).fill(-1);if(!walkable(m,sx,sy,s))return d;
 const buckets=[[sy*m.w+sx]];d[sy*m.w+sx]=0;
 for(let cost=0;cost<buckets.length;cost++){const b=buckets[cost];if(!b)continue;
  for(let k=0;k<b.length;k++){const c=b[k];if(d[c]!==cost)continue;const x=c%m.w,y=(c/m.w)|0;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(!walkable(m,nx,ny,s))continue;
    if(dx&&dy&&(!walkable(m,x+dx,y,s)||!walkable(m,x,y+dy,s)))continue;
    const nc=cost+stepCost(m,nx,ny,s),n=ny*m.w+nx;if(d[n]>=0&&d[n]<=nc)continue;d[n]=nc;(buckets[nc]=buckets[nc]||[]).push(n);}}}
 return d;}
if(typeof module!=='undefined')module.exports={generate,flood,walkable,nearestWalk,WALK,THEMES,SIZES};
/*GEN-END*/
