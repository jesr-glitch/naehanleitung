// Fadenlauf – Schnittkonstruktion. Reines Modul ohne DOM, läuft im Browser und in Node.

const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=(n,d=1)=>Number(n).toLocaleString("de-DE",{maximumFractionDigits:d,minimumFractionDigits:0});

/* ================= Geometrie ================= */
const lerp=(a,b,t)=>a+(b-a)*t;
const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const norm=v=>{const l=Math.hypot(v[0],v[1])||1;return[v[0]/l,v[1]/l]};
function bez(p0,p1,p2,p3,n=20){const o=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t;o.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]])}return o}
function clean(pts){const o=[pts[0]];for(let i=1;i<pts.length;i++)if(dist(pts[i],o[o.length-1])>1e-4)o.push(pts[i]);return o}
function plen(pts){let s=0;for(let i=1;i<pts.length;i++)s+=dist(pts[i-1],pts[i]);return s}
function pointAt(pts,d){let s=0;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=dist(a,b);if(s+l>=d||i===pts.length-1){const u=l?Math.min(1,Math.max(0,(d-s)/l)):0;return{p:[lerp(a[0],b[0],u),lerp(a[1],b[1],u)],t:norm([b[0]-a[0],b[1]-a[1]])}}s+=l}return{p:pts[0],t:[1,0]}}
function catmull(P0,n=14){const P=[P0[0],...P0,P0[P0.length-1]],o=[];for(let i=1;i<P.length-2;i++){const a=P[i-1],b=P[i],c=P[i+1],d=P[i+2];for(let k=i===1?0:1;k<=n;k++){const t=k/n,t2=t*t,t3=t2*t;o.push([0,1].map(j=>0.5*(2*b[j]+(-a[j]+c[j])*t+(2*a[j]-5*b[j]+4*c[j]-d[j])*t2+(-a[j]+3*b[j]-3*c[j]+d[j])*t3)))}}return o}
function cutY(pts,y){if(pts[0][1]>=y)return[pts[0],[pts[0][0],y+1e-3]];const o=[pts[0]];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if(b[1]>=y){const u=(y-a[1])/((b[1]-a[1])||1);o.push([lerp(a[0],b[0],u),y]);return o}o.push(b)}const a=pts[pts.length-2],b=pts[pts.length-1],k=(b[0]-a[0])/((b[1]-a[1])||1);o.push([b[0]+k*(y-b[1]),y]);return o}
function fromY(pts,y){const o=[];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if(b[1]>y){if(!o.length){const u=(y-a[1])/((b[1]-a[1])||1);o.push([lerp(a[0],b[0],u),y])}o.push(b)}}return o}
function area(p){let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return s/2}
function bbox(pts){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const[x,y]of pts){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y}return{x0,y0,x1,y1,w:x1-x0,h:y1-y0}}
function lineX(a,b,c,d){const r=[b[0]-a[0],b[1]-a[1]],s=[d[0]-c[0],d[1]-c[1]],den=r[0]*s[1]-r[1]*s[0];if(Math.abs(den)<1e-9)return null;const t=((c[0]-a[0])*s[1]-(c[1]-a[1])*s[0])/den;return[a[0]+t*r[0],a[1]+t*r[1]]}
function arc(r,a0,a1,n=28){const o=[];for(let i=0;i<=n;i++){const a=lerp(a0,a1,i/n);o.push([r*Math.cos(a),r*Math.sin(a)])}return o}

/* Schnittteil: Kanten mit Zugabe-Art (seam, hem, fold, facing, casing) */
function mk(p){p.edges.forEach(e=>e.pts=clean(e.pts));p.marks=p.marks||[];p.notches=p.notches||[];p.fold=p.edges.some(e=>e.sa==="fold");p.mat=p.mat||"main";return p}
function outline(p){const o=[];p.edges.forEach((e,i)=>o.push(...(i?e.pts.slice(1):e.pts)));if(dist(o[0],o[o.length-1])<1e-3)o.pop();return o}
function offsetPiece(p,sa,sgn){
  const nrm=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return[sgn*dy/l,-sgn*dx/l]};
  const offs=p.edges.map(e=>{const d=sa[e.sa]||0,P=e.pts,n=P.length;return P.map((q,i)=>{const a=i>0?nrm(P[i-1],q):null,b=i<n-1?nrm(q,P[i+1]):null;let v=a&&b?[a[0]+b[0],a[1]+b[1]]:(a||b);v=norm(v);let k=1;if(a&&b)k=1/Math.max(v[0]*a[0]+v[1]*a[1],.4);return[q[0]+v[0]*d*k,q[1]+v[1]*d*k]})});
  const m=offs.length,corner=[],lim=Math.max(sa.seam,sa.hem,4)*2.5;
  for(let i=0;i<m;i++){const A=offs[i],B=offs[(i+1)%m],X=lineX(A[A.length-2],A[A.length-1],B[0],B[1]);corner[i]=X&&dist(X,A[A.length-1])<lim&&dist(X,B[0])<lim?X:null}
  const out=[];for(let i=0;i<m;i++){const P=offs[i].slice(),pv=corner[(i-1+m)%m];if(pv)P[0]=pv;if(corner[i])P[P.length-1]=corner[i];out.push(...P)}
  return clean(out);
}

/* ================= Maße & Größen ================= */
const MKEYS=[
  ["B","Brustumfang","Stärkste Stelle der Brust"],["W","Taillenumfang","Schmalste Stelle"],
  ["H","Hüftumfang","Stärkste Stelle über dem Po"],["BL","Rückenlänge","Halswirbel bis Taille"],
  ["SL","Schulterlänge","Halsansatz bis Schulterknochen"],["AL","Armlänge","Schulter bis Handgelenk"],
  ["UA","Oberarmumfang","Stärkste Stelle"],["N","Halsumfang","Am Halsansatz"],
  ["R","Schritttiefe","Taille bis Sitzfläche, im Sitzen"],["IL","Innenbeinlänge","Schritt bis Boden"],
  ["T","Taille bis Knie","Seitlich gemessen"]];
const SIZES={
  damen:{34:[80,64,88,40.5,12,59,25,34,25.5,78,57],36:[84,68,92,41,12.2,59.5,26,35,26,78,57.5],38:[88,72,96,41.5,12.4,60,27,36,26.5,79,58],40:[92,76,100,42,12.6,60.5,28,37,27,79,58.5],42:[96,80,104,42.5,12.8,61,29.5,38,27.5,80,59],44:[100,84,108,43,13,61.5,31,39,28,80,59.5],46:[104,88,112,43.5,13.2,62,32.5,40,28.5,80,59.5],48:[110,94,118,44,13.4,62.5,34,41,29,80,60]},
  herren:{44:[88,76,92,44,14,61,28,37,25,80,56],46:[92,80,96,44.5,14.3,62,29.5,38,25.5,81,57],48:[96,84,100,45,14.6,63,31,39,26,82,58],50:[100,88,104,45.5,15,64,32.5,40,26.5,83,59],52:[104,92,108,46,15.3,65,34,41,27,83,59],54:[108,98,112,46.5,15.6,65.5,35.5,42,27.5,84,60],56:[112,104,116,47,16,66,37,43,28,84,60]}};
const sizeM=(g,s)=>Object.fromEntries(MKEYS.map(([k],i)=>[k,SIZES[g][s][i]]));


const topDefaults=()=>({passform:"normal",silhouette:"gerade",ausschnitt:"rund",aermel:"kurz",aermelform:"gerade",verschluss:"keiner",kapuze:false,taschen:false,buendchen:false,kragen:"keiner",manschetten:false});

const LEN={
  oberteil:(k,m)=>({bauchfrei:m.BL-6,huefte:m.BL+18,po:m.BL+28,oberschenkel:m.BL+40})[k],
  rock:(k,m)=>({mini:Math.round(m.T*0.68),knie:m.T,midi:m.T+18,maxi:m.T+42})[k],
  kleid:(k,m)=>({mini:Math.round(m.T*0.68),knie:m.T,midi:m.T+18,maxi:m.T+42})[k],
  hose:(k,m)=>{const cy=m.R+1;return({kurz:cy+6,bermuda:cy+m.IL*0.38,siebenachtel:cy+m.IL*0.8,lang:cy+m.IL-1})[k]}};

const getLen=(S,t)=>{const o=S[t];return o.lenKey==="custom"&&o.len?o.len:Math.round(LEN[t](o.lenKey,S.m)*2)/2};

/* ================= Konstruktion: Oberteil ================= */
function capCurve(w,CH,mf,side){
  const U=[side*w,CH],T=[0,0],M=[side*w*0.5,CH*mf],dir=norm([T[0]-U[0],T[1]-U[1]]),k=dist(U,T)*0.17;
  const a=bez(U,[U[0]-side*w*0.28,CH],[M[0]-dir[0]*k,M[1]-dir[1]*k],M,12);
  const b=bez(M,[M[0]+dir[0]*k,M[1]+dir[1]*k],[side*w*0.32,0],T,12);
  return a.concat(b.slice(1));
}
function solveCap(AHb,AHf,CH,ease){
  const tgt=AHb+AHf+ease,wb0=Math.sqrt(Math.max(AHb*AHb-CH*CH,25)),wf0=Math.sqrt(Math.max(AHf*AHf-CH*CH,25));
  let lo=.4,hi=1.8,s=1;for(let i=0;i<32;i++){s=(lo+hi)/2;const l=plen(capCurve(wb0*s,CH,.47,-1))+plen(capCurve(wf0*s,CH,.53,1));if(l>tgt)hi=s;else lo=s}
  return{wb:wb0*s,wf:wf0*s};
}
function finishHem(side,L,maxRise=10){
  const pr=cutY(side,L),a=pr[pr.length-2],b=pr[pr.length-1],slope=(b[0]-a[0])/((b[1]-a[1])||1);
  const rise=Math.min(maxRise,Math.max(0,0.5*b[0]*slope)),s=cutY(side,L-rise),X=s[s.length-1][0],hem=[];
  for(let i=0;i<=16;i++){const x=X*(1-i/16);hem.push([x,L-rise*(x/X)**2])}
  return{side:s,hem,rise,X};
}
function rectPiece(name,cut,w,h,o={}){
  const t=o.types||["seam","seam","seam","seam"];
  const marks=[];if(o.foldLine==="h")marks.push({t:"dash",pts:[[0,h/2],[w,h/2]]});if(o.foldLine==="v")marks.push({t:"dash",pts:[[w/2,0],[w/2,h]]});
  return mk({name,cut,stretch:!!o.stretch,mat:o.mat,edges:[{pts:[[0,0],[w,0]],sa:t[0]},{pts:[[w,0],[w,h]],sa:t[1]},{pts:[[w,h],[0,h]],sa:t[2]},{pts:[[0,h],[0,0]],sa:t[3]}],marks,rotatable:!!o.rotatable});
}
function draftTop(m,o,ctx){
  const J=ctx.jersey,R={pieces:[],notions:[],extras:[],info:{}};
  const E=(J?{eng:-2,normal:6,locker:12,oversize:24}:{eng:6,normal:10,locker:16,oversize:26})[o.passform];
  const drop={eng:0,normal:0,locker:2,oversize:6}[o.passform];
  const qB=(m.B+E)/4,qW=(m.W+E)/4,qH=(m.H+E)/4;
  let nw=m.N/6+.5,fnd=m.N/6+1.5,bnd=2;
  if(o.ausschnitt==="hoch")fnd=4.5;else if(o.ausschnitt==="v"){fnd=m.N/6+10;nw+=1}else if(o.ausschnitt==="boot"){nw+=4;fnd=3;bnd=1.5}else if(o.ausschnitt==="eckig"){nw+=1.5;fnd=m.N/6+5}
  const col=o.kapuze?"keiner":(o.kragen||"keiner");if(col!=="keiner"){nw=m.N/6+.3;fnd=m.N/6+1;bnd=2}
  const sy=Math.max(1.5,4.2-drop*.35),sx=nw+m.SL+drop,AD=m.B/8+9+Math.max(E,0)*.15+drop*.5,ux=Math.max(qB,sx+1.5);
  const sil=ctx.waistSeam?"tailliert":o.silhouette,cuffH=6,hemBand=o.buendchen&&!ctx.waistSeam;
  let L=ctx.waistSeam?m.BL:Math.max(AD+6,o.laenge);if(hemBand)L-=cuffH-1;
  let wx,hx,rate,dart=0;
  if(sil==="tailliert"){const target=Math.min(ux,qW+(J?.5:1.5)),tot=ux-target;if(!J&&tot>3)dart=Math.min(tot-3,4);wx=target+dart;hx=Math.max(qH,wx+.5);rate=.06}
  else if(sil==="ausgestellt"){wx=ux+1.5;hx=Math.max(ux,qH)+5;rate=.3}
  else{hx=Math.max(ux,qH);wx=(ux+hx)/2;rate=.03}
  const H=finishHem(catmull([[ux,AD],[wx,m.BL],[hx,m.BL+20],[hx+rate*90,m.BL+110]],16),L);
  const side=H.side,hem=H.hem,X=H.X;
  const neckB=bez([0,bnd],[nw*.55,bnd],[nw,bnd*.5],[nw,0],12);
  const neckF=o.ausschnitt==="v"?bez([0,fnd],[nw*.35,fnd*.62],[nw*.85,fnd*.2],[nw,0],12):o.ausschnitt==="eckig"?[[0,fnd],[nw-.6,fnd],[nw,fnd-.6],[nw,0]]:bez([0,fnd],[nw*.55,fnd],[nw,fnd*.45],[nw,0],12);
  const ahB=bez([sx,sy],[sx-1.2,sy+.55*(AD-sy)],[sx-.8+.3*(ux-sx),AD],[ux,AD],20);
  const ahF=bez([sx,sy],[sx-2,sy+.5*(AD-sy)],[sx-1.6+.35*(ux-sx),AD],[ux,AD],20);
  const AHf=plen(ahF),AHb=plen(ahB),sleeves=o.aermel!=="ohne",hemT=ctx.waistSeam||hemBand?"seam":"hem";
  const zipB=o.verschluss==="reissverschluss_hinten",kl=o.verschluss==="knopfleiste",pre=ctx.waistSeam?" Oberteil":"";
  const dartAt=(x,top)=>{if(dart<.6)return[];const yW=Math.min(m.BL,L-H.rise*(x/X)**2),bot=L>m.BL+4?Math.min(L-3,m.BL+12):null;return[{t:"line",pts:bot?[[x,top],[x-dart/2,yW],[x,bot],[x+dart/2,yW],[x,top]]:[[x-dart/2,yW],[x,top],[x+dart/2,yW]]}]};
  // Vorderteil
  const ext=2.2,fx=kl?-ext:0,buttons=[];
  if(kl)for(let y=fnd+1.5;y<L-5;y+=8.5)buttons.push({t:"button",at:[0,y]});
  R.pieces.push(mk({name:"Vorderteil"+pre,cut:kl?"2× gegengleich":"1× im Stoffbruch",edges:[
    {pts:kl?[[-ext,fnd],...neckF]:neckF,sa:"seam"},{pts:[[nw,0],[sx,sy]],sa:"seam"},{pts:ahF,sa:"seam"},{pts:side,sa:"seam"},
    {pts:kl?[...hem,[-ext,L]]:hem,sa:hemT},{pts:[[fx,L],[fx,fnd]],sa:kl?"facing":"fold"}],
    notches:sleeves?[{edge:2,fromEnd:AHf*.42}]:[],
    marks:[...dartAt(Math.min(ux*.45,10),AD+1.5),...(kl?[{t:"dash",pts:[[0,fnd],[0,L]]},{t:"text",at:[.9,L-2.5],str:"VM",rot:90},...buttons]:[])]}));
  // Rückenteil
  const zipLen=ctx.waistSeam?L-bnd-.5:22;
  R.pieces.push(mk({name:"Rückenteil"+pre,cut:zipB?"2× gegengleich":"1× im Stoffbruch",edges:[
    {pts:neckB,sa:"seam"},{pts:[[nw,0],[sx,sy]],sa:"seam"},{pts:ahB,sa:"seam"},{pts:side,sa:"seam"},{pts:hem,sa:hemT},{pts:[[0,L],[0,bnd]],sa:zipB?"seam":"fold"}],
    notches:[...(sleeves?[{edge:2,fromEnd:AHb*.42,double:true}]:[]),...(zipB&&!ctx.waistSeam?[{edge:5,fromEnd:Math.min(zipLen,L-bnd-2)}]:[])],
    marks:dartAt(ux*.45,AD-1)}));
  R.info={waistCirc:4*(X-dart),hemCirc:4*X,dart};
  R.shape={kind:"top",nw,fnd,bnd,sx,sy,AD,ux,side,L,drop,kapuze:!!o.kapuze&&!ctx.waistSeam,kl,kragen:col,hemBand:hemBand?cuffH-1:0,sleeve:null};
  // Ärmel
  if(sleeves){
    const capEase=J?.3:{eng:2,normal:1.5,locker:1,oversize:.5}[o.passform];
    let CH=(AHf+AHb)*{eng:.33,normal:.3,locker:.25,oversize:.18}[o.passform];
    const minB=m.UA+(J?1:5)+Math.max(0,E)*.2;let sl;
    for(let i=0;i<24;i++){sl=solveCap(AHb,AHf,CH,capEase);if(sl.wb+sl.wf>=minB||CH<6)break;CH-=.6}
    const longS=o.aermel==="lang"||o.aermel==="dreiviertel",mans=!!o.manschetten&&longS,cuffS=o.buendchen&&longS&&!mans,mansL=Math.round(m.UA*.6+4+2.5);
    let SLn={kurz:Math.max(CH+5,20),ellenbogen:m.AL*.55,dreiviertel:m.AL*.78,lang:m.AL+(J?0:1)}[o.aermel]-drop;
    if(cuffS)SLn-=cuffH-1;if(mans)SLn-=5.5;SLn=Math.max(SLn,CH+4);
    const bic=sl.wb+sl.wf,t=Math.min(1,Math.max(0,(SLn-CH)/(m.AL-CH))),wrist=m.UA*.6;
    let Hw=mans?mansL-2.5+3:cuffS?lerp(bic,wrist+8,t):{schmal:lerp(bic-1,wrist+(J?2:5),t),gerade:lerp(bic,wrist+10,t*.85),ausgestellt:bic+3+14*t}[o.aermelform];
    const capB=capCurve(sl.wb,CH,.47,-1),capF=capCurve(sl.wf,CH,.53,1);
    R.shape.sleeve={CH,bic,Hw,SLn,cuff:cuffS?cuffH-1:mans?5.5:0};
    R.pieces.push(mk({name:"Ärmel",cut:"2× gegengleich",grainX:0,edges:[
      {pts:capB,sa:"seam"},{pts:capF.slice().reverse(),sa:"seam"},{pts:[[sl.wf,CH],[Hw/2,SLn]],sa:"seam"},
      {pts:[[Hw/2,SLn],[-Hw/2,SLn]],sa:cuffS||mans?"seam":"hem"},{pts:[[-Hw/2,SLn],[-sl.wb,CH]],sa:"seam"}],
      notches:[{edge:0,d:AHb*.42,double:true},{edge:1,fromEnd:AHf*.42},{edge:0,fromEnd:0}],
      marks:[{t:"dash",pts:[[-sl.wb,CH],[sl.wf,CH]]},{t:"text",at:[-sl.wb*.55,CH+2],str:"hinten"},{t:"text",at:[sl.wf*.55,CH+2],str:"vorne"},...(mans?[{t:"line",pts:[[-Hw/4,SLn],[-Hw/4,SLn-10]]},{t:"text",at:[-Hw/4-1.2,SLn-5],str:"Schlitz",rot:90},{t:"text",at:[-Hw/4+2.2,SLn-1.5],str:"Falte"}]:[])],
      labelAt:[0,(CH+SLn)/2+1.5]}));
    if(mans){R.pieces.push(rectPiece("Manschette","2×",mansL,12,{foldLine:"h"}));R.extras.push("Ärmelschlitz: je Ärmel einen Schrägstreifen 3 × 22 cm zum Einfassen zuschneiden.")}
    if(cuffS)R.pieces.push(rectPiece("Ärmelbündchen","2× (Bündchenware)",Math.round(Hw*.8),2*cuffH,{foldLine:"h",stretch:true,mat:J?"rib":"main"}));
  }else{
    R.extras.push(`Armausschnitte: 2 Streifen ${J?"Jersey":"Schrägband"} je ${fmt(Math.round(AHf+AHb+3))} × 3 cm`);
  }
  // Halsausschnitt
  const NLh=plen(neckF)+plen(neckB);
  if(o.kapuze){
    const hw=24+(o.passform==="oversize"?3:o.passform==="locker"?1.5:0),hh=36,xnb=Math.min(hw-3,Math.sqrt(Math.max(NLh*NLh-16,100)));
    R.pieces.push(mk({name:"Kapuze",cut:"2× gegengleich",edges:[
      {pts:bez([0,0],[hw*.7,-.5],[hw,1.5],[hw,11],16),sa:"seam"},{pts:bez([hw,11],[hw+.5,24],[xnb+4,hh-5],[xnb,hh-4],16),sa:"seam"},
      {pts:bez([xnb,hh-4],[xnb*.6,hh-2],[xnb*.25,hh],[0,hh],14),sa:"seam"},{pts:[[0,hh],[0,0]],sa:"hem"}],
      notches:[{edge:2,d:plen(neckB)}]}));
    R.notions.push("Optional: Kordel 140 cm und 2 Ösen für den Kapuzentunnel");
  }else if(col!=="keiner"){
    const hS=3.5,half=NLh+(kl?ext:0),stand=mk({name:col==="stehkragen"?"Stehkragen":"Kragensteg",cut:"2× im Stoffbruch",edges:[
      {pts:bez([0,hS],[half*.5,hS],[half*.85,hS-.4],[half,hS-1.2],16),sa:"seam"},{pts:bez([half,hS-1.2],[half+.7,hS-2],[half+.3,-.6],[half-.8,-.9],8),sa:"seam"},
      {pts:bez([half-.8,-.9],[half*.8,-.4],[half*.5,0],[0,0],16),sa:"seam"},{pts:[[0,0],[0,hS]],sa:"fold"}],
      notches:[{edge:0,d:plen(neckB)},...(kl?[{edge:0,d:NLh}]:[])],labelAt:[half*.45,hS*.5]});
    R.pieces.push(stand);
    if(col==="hemdkragen"){const cl=NLh,cw=7;R.pieces.push(mk({name:"Kragen",cut:"2× im Stoffbruch",edges:[
      {pts:bez([0,cw],[cl*.5,cw],[cl*.85,cw-.3],[cl,cw-.9],16),sa:"seam"},{pts:[[cl,cw-.9],[cl+1.8,-1.2]],sa:"seam"},
      {pts:bez([cl+1.8,-1.2],[cl*.8,-.3],[cl*.5,0],[0,0],16),sa:"seam"},{pts:[[0,0],[0,cw]],sa:"fold"}],
      notches:[{edge:0,d:plen(neckB)}],labelAt:[cl*.45,cw*.5]}))}
    R.notions.push(`Bügeleinlage für ${col==="hemdkragen"?"Kragen, Kragensteg":"den Stehkragen"}${o.manschetten&&(o.aermel==="lang"||o.aermel==="dreiviertel")?" und Manschetten":""} (je 1 Lage)`);
  }else if(kl){
    R.extras.push(`Halsausschnitt: Schrägband ${fmt(Math.round(2*NLh+ext*2+3))} × 3 cm oder Kragen nach Wahl`);
  }else if(J){
    const bw=o.ausschnitt==="hoch"?3:2.2;
    R.pieces.push(rectPiece("Halsbündchen","1× (Bündchenware oder Jersey)",Math.round(2*NLh*(o.ausschnitt==="v"?.9:.85)),2*bw,{foldLine:"h",stretch:true,mat:"rib"}));
  }else{
    R.extras.push(`Halsausschnitt: Schrägband ${fmt(Math.round(2*NLh+4))} × 3 cm`);
  }
  if(hemBand){const bl=Math.round(4*X*(J?.8:.9)),two=bl>65;R.pieces.push(rectPiece("Saumbündchen",two?"2× (Bündchenware)":"1× (Bündchenware)",two?Math.round(bl/2+(ctx.seam||1)):bl,2*cuffH,{foldLine:"h",stretch:true,mat:J?"rib":"main"}))}
  if(o.taschen){
    if(o.kapuze||o.passform==="oversize"){const f=qB/24,w=17*f,tp=11*f,h=21*f,op=15*f;
      R.pieces.push(mk({name:"Kängurutasche",cut:"1× im Stoffbruch",edges:[{pts:[[0,0],[tp,0]],sa:"seam"},{pts:[[tp,0],[w,op]],sa:"hem"},{pts:[[w,op],[w,h]],sa:"seam"},{pts:[[w,h],[0,h]],sa:"seam"},{pts:[[0,h],[0,0]],sa:"fold"}]}))}
    else R.pieces.push(rectPiece("Aufgesetzte Tasche","2×",13,15,{types:["hem","seam","seam","seam"]}));
  }
  {const nb=(kl?buttons.length+(col!=="keiner"?1:0):0)+(R.pieces.some(p=>p.name==="Manschette")?2:0);if(nb)R.notions.push(`${nb} Knöpfe, ca. 10–12 mm`)}
  if(kl){R.notions.push("Bügeleinlage für die Knopfleiste, 2 Streifen 6 cm breit")}
  if(zipB&&!ctx.waistSeam)R.notions.push("Nahtverdeckter Reißverschluss, 22 cm");
  if(J&&(hemBand||o.buendchen))R.notions.push("Bündchenware (Schlauch) für die Bündchen");
  return R;
}

/* ================= Konstruktion: Rock ================= */
function draftSkirt(m,o,ctx){
  const J=ctx.jersey,R={pieces:[],notions:[],extras:[]},L=Math.max(20,o.laenge),inD=!!ctx.inDress;
  const elastic=o.bund==="gummizug"&&!inD,zip=inD?!!ctx.zipBack:(!elastic&&!J),Wc=ctx.waistCirc||(m.W+(J?0:1)),wT=elastic?"casing":"seam";
  const names=inD?["Rock vorne","Rock hinten"]:["Vorderrock","Hinterrock"];
  if(["bleistift","gerade","a_linie","ausgestellt"].includes(o.form)){
    const qW=Wc/4,qH=Math.max((m.H+(J?0:3))/4,qW),hipY=19;
    [false,true].forEach(isBack=>{
      let wx,dart=0;
      if(elastic)wx=qH+.5;else{const diff=qH-qW;let si=Math.min(diff,2.2);dart=diff-si;if(J||dart<.8){si=diff;dart=0}if(dart>4){dart=4;si=diff-4}wx=qH-si}
      const hemX={bleistift:qH-2,gerade:qH,a_linie:qH+L*.16,ausgestellt:qH+L*.34}[o.form],flare=(hemX-qH)/Math.max(1,L-hipY);
      const topY=-.8,cY=isBack?1:0,Hm=finishHem(catmull([[wx,topY],[qH+Math.max(0,flare)*3,hipY],[hemX,L],[hemX+flare*20,L+20]],14),L);
      const waist=bez([0,cY],[wx*.5,cY],[wx*.85,topY+(cY-topY)*.15],[wx,topY],12);
      if(!isBack)R.shape={kind:"skirt",form:o.form,L,band:!inD&&!elastic,prof:Hm.side.filter(p=>p[1]>=0).map(p=>[p[1],4*p[0]]).concat([[L,4*Hm.X]])};
      const cb=isBack&&zip,marks=[];
      if(dart>0){const x=isBack?Math.min(wx*.5,10):Math.min(wx*.45,9),yw=waist.reduce((b,p)=>Math.abs(p[0]-x)<Math.abs(b[0]-x)?p:b)[1],dl=isBack?13:9.5;marks.push({t:"line",pts:[[x-dart/2,yw],[x,yw+dl],[x+dart/2,yw]]})}
      R.pieces.push(mk({name:names[+isBack],cut:cb?"2× gegengleich":"1× im Stoffbruch",edges:[{pts:waist,sa:wT},{pts:Hm.side,sa:"seam"},{pts:Hm.hem,sa:"hem"},{pts:[[0,L],[0,cY]],sa:cb?"seam":"fold"}],
        notches:cb?[{edge:3,fromEnd:20}]:[],marks}));
    });
  }else if(o.form==="halbteller"||o.form==="teller"){
    const full=o.form==="teller",alpha=(full?90:45)*Math.PI/180,r=full?Wc/(2*Math.PI):Wc/Math.PI,Rr=r+L,a90=Math.PI/2,aS=a90-alpha;
    R.shape={kind:"skirt",form:o.form,L,band:!inD&&!elastic,prof:[0,2,5,10,16,24,34,46,60,76,94,115].filter(y=>y<L).concat([L]).map(y=>[y,(full?2:1)*Math.PI*(r+y)])};
    [false,true].forEach(isBack=>{const cb=isBack&&zip;
      R.pieces.push(mk({name:names[+isBack],cut:cb?"2× gegengleich":"1× im Stoffbruch",edges:[
        {pts:arc(r,a90,aS,20),sa:wT},{pts:[[r*Math.cos(aS),r*Math.sin(aS)],[Rr*Math.cos(aS),Rr*Math.sin(aS)]],sa:"seam"},{pts:arc(Rr,aS,a90,40),sa:"hem"},{pts:[[0,Rr],[0,r]],sa:cb?"seam":"fold"}],
        notches:cb?[{edge:3,fromEnd:20}]:[],labelAt:[Rr*Math.sin(alpha/2)*.62,Rr*Math.cos(alpha/2)*.62]}));
    });
    R.extras.push("Tellerrock vor dem Säumen 24 Stunden hängen lassen und den Saum dann gerade schneiden, weil der schräge Fadenlauf nachgibt.");
  }else{
    const total=Math.max(2*Wc,1.45*m.H),half=total/4;
    R.shape={kind:"skirt",form:"gerafft",L,band:!inD&&!elastic,prof:[[0,Wc],[2,total*.6],[8,total*.85],[L,total]]};
    [false,true].forEach(isBack=>{const cb=isBack&&zip;
      R.pieces.push(rectPiece(names[+isBack],cb?"2×":"1× im Stoffbruch",Math.round(half),Math.round(L),{types:[wT,"seam","hem",cb?"seam":"fold"]}));
    });
    if(!elastic)R.extras.push(`Oberkante mit zwei Reihen langer Stiche einkräuseln, bis sie auf ${fmt(Math.round(Wc))} cm passt.`);
  }
  if(!inD&&!elastic){R.pieces.push(rectPiece("Bund","1×",7,Math.round(Wc+3),{foldLine:"v",rotatable:true}));R.notions.push("Bügeleinlage für den Bund");R.notions.push("1 Knopf oder Rockhaken")}
  if(!inD&&zip)R.notions.push("Nahtverdeckter Reißverschluss, 20 cm");
  if(elastic)R.notions.push(`Gummiband 2,5 cm breit, ${fmt(Math.round(m.W*.9))} cm lang`);
  if(o.taschen&&!inD)R.pieces.push(rectPiece("Aufgesetzte Tasche","2×",15,16,{types:["hem","seam","seam","seam"]}));
  return R;
}

/* ================= Konstruktion: Hose ================= */
function draftPants(m,o,ctx){
  const J=ctx.jersey,R={pieces:[],notions:[],extras:[]};
  const E={eng:J?-4:2,gerade:J?2:5,weit:J?6:10,palazzo:J?8:12,jogger:J?4:8}[o.bein],elastic=o.bund==="gummizug";
  const hipY=Math.min(20,m.R*.72),cy=m.R+1,fullL=cy+m.IL-1,cuff=o.bein==="jogger";
  let L=Math.max(cy+4,o.laenge);if(cuff)L-=5;
  const kneeY=cy+m.IL*.5-4;
  const K={eng:m.H*.37,gerade:m.H*.46,weit:m.H*.62,palazzo:m.H*.86,jogger:m.H*.44}[o.bein],Hm={eng:m.H*.27,gerade:m.H*.43,weit:m.H*.7,palazzo:m.H*.94,jogger:m.H*.3}[o.bein];
  // Bundhöhe: tief sitzt 5 cm unter der Taille, hoch 4 cm darüber
  const rd={tief:5,hoch:-4}[o.leibhoehe]||0,Wt=rd>0?lerp(m.W,m.H,rd/hipY):m.W;
  const pd=[];
  [false,true].forEach(isBack=>{
    const W=(m.H+E)/4+(isBack?1:-1),ext=isBack?m.H/10+1.5:m.H/20+.5,crease=(W-ext)/2+(isBack?.5:0);
    const kh=K/4+(isBack?1:-1),hh=Hm/4+(isBack?1:-1),cpY=isBack?cy+.8:cy,cw=isBack?[3*(hipY-(rd-2.8))/(hipY+2.8),rd-2.8]:[.8*(hipY-rd)/hipY,rd];
    let swx=W,dart=0;
    if(!elastic){const tq=Wt/4+(isBack?1:-1)+(J?0:.5),diff=Math.max(0,W-cw[0]-tq);let si=Math.min(diff,2.5);dart=diff-si;if(J||dart<.8){si=diff;dart=0}if(dart>4){dart=4;si=diff-4}swx=W-si}
    const sideFull=catmull([[swx,rd],[W,hipY],[crease+kh*1.02,kneeY],[crease+hh,fullL],[crease+hh+(hh-kh)*.2,fullL+20]],14);
    const side=cutY(sideFull,L),sE=side[side.length-1];
    const insFull=catmull([[-ext,cpY],[lerp(-ext,crease-kh,.5)+ext*.15,lerp(cpY,kneeY,.5)],[crease-kh,kneeY],[crease-hh,fullL],[crease-hh-(hh-kh)*.2,fullL+20]],14);
    pd.push({sideFull,insFull,swx,cw,W});
    const ins=cutY(insFull,L),iE=ins[ins.length-1];
    const d=norm([0-cw[0],hipY-cw[1]]),k=(cpY-hipY)*.6;
    const crotch=bez([0,hipY],[d[0]*k,hipY+d[1]*k],[-ext*.5,cpY],[-ext,cpY],18).reverse();
    const marks=[{t:"dash",pts:[[crease,hipY+2],[crease,L-2]]}];
    if(L>kneeY+3)marks.push({t:"line",pts:[[crease-2,kneeY],[crease+2,kneeY]]},{t:"text",at:[crease+3.6,kneeY-.6],str:"Knie"});
    if(dart>0){const x=isBack?(cw[0]+swx)/2:crease,yw=lerp(cw[1],rd,(x-cw[0])/(swx-cw[0]));marks.push({t:"line",pts:[[x-dart/2,yw],[x,yw+(isBack?12:8)],[x+dart/2,yw]]})}
    // Schräger Eingriff: Ecke an Bund und Seitennaht wird ausgeschnitten, Seitenteil und Taschenbeutel liegen darunter
    const wy=x=>lerp(cw[1],rd,(x-cw[0])/(swx-cw[0])),pocket=!isBack&&o.seitentaschen,p2y=rd+17;
    const P1=[swx-4.5,wy(swx-4.5)],P2=cutY(sideFull,p2y).at(-1),sideEdge=pocket?fromY(side,p2y):side;
    const tie=(x,y)=>[{t:"line",pts:[[x-.7,y+.6],[x+.7,y+2]]},{t:"line",pts:[[x-.7,y+2],[x+.7,y+.6]]},{t:"text",at:[x,y+3.6],str:"Band"}];
    if(o.bindebaender){const xs=isBack?[swx-1.5]:[crease+(dart>0?dart/2+1.8:0),pocket?P1[0]-1.5:swx-1.5];for(const x of xs)marks.push(...tie(x,wy(x)))}
    const hipD=plen(cutY(sideFull,hipY))-(pocket?plen(cutY(sideFull,p2y)):0);
    R.pieces.push(mk({name:isBack?"Hinterhose":"Vorderhose",cut:"2× gegengleich",grainX:crease,edges:[
      {pts:[cw,pocket?P1:[swx,rd]],sa:elastic?"casing":"seam"},...(pocket?[{pts:[P1,P2],sa:"seam"}]:[]),{pts:sideEdge,sa:"seam"},{pts:[sE,iE],sa:cuff?"seam":"hem"},
      {pts:ins.slice().reverse(),sa:"seam"},{pts:crotch,sa:"seam"},{pts:[[0,hipY],cw],sa:!isBack&&!elastic&&!J?"facing":"seam"}],
      notches:hipD>1?[{edge:pocket?2:1,d:hipD,double:isBack}]:[],marks,labelAt:[crease,hipY+(L-hipY)*.3]}));
    if(pocket){
      const A=[P1[0]-3,wy(P1[0]-3)],Sb=cutY(sideFull,rd+22).at(-1),cx=Math.min(Math.max(crease+1.5,P1[0]-10),A[0]-1),C=[cx,wy(cx)],Sb2=cutY(sideFull,rd+30).at(-1);
      const opening=[{t:"dash",pts:[P1,P2]},{t:"text",at:[(P1[0]+P2[0])/2-1.6,(P1[1]+P2[1])/2],str:"Eingriff",rot:90}];
      R.pieces.push(mk({name:"Seitenteil Tasche",cut:"2× gegengleich",grainX:(A[0]+swx)/2,edges:[
        {pts:[A,[swx,rd]],sa:"seam"},{pts:cutY(sideFull,rd+22),sa:"seam"},{pts:bez(Sb,[Sb[0]-2,Sb[1]+1.5],[A[0]+2,rd+21],[A[0],rd+20],12),sa:"seam"},{pts:[[A[0],rd+20],A],sa:"seam"}],
        marks:opening,labelAt:[(A[0]+swx)/2+.5,rd+13]}));
      R.pieces.push(mk({name:"Taschenbeutel",cut:"4× (Futter, 2 Paar)",mat:"lining",grainX:(C[0]+swx)/2,edges:[
        {pts:[C,[swx,rd]],sa:"seam"},{pts:cutY(sideFull,rd+30),sa:"seam"},{pts:bez(Sb2,[Sb2[0]-3,Sb2[1]+2],[C[0]+3,rd+28],[C[0],rd+27],12),sa:"seam"},{pts:[[C[0],rd+27],C],sa:"seam"}],
        marks:opening,labelAt:[(C[0]+swx)/2,rd+17]}));
    }
  });
  {const xAt=(P,y)=>{for(let i=1;i<P.length;i++)if(P[i][1]>=y){const a=P[i-1],b=P[i],u=(y-a[1])/((b[1]-a[1])||1);return lerp(a[0],b[0],u)}return P[P.length-1][0]};
   const[F,B]=pd,lc=y=>(xAt(F.sideFull,y)-xAt(F.insFull,y))+(xAt(B.sideFull,y)-xAt(B.insFull,y)),legs=[];for(let y=cy+1;y<L;y+=4)legs.push([y,lc(y)]);legs.push([L,lc(L)]);
   R.shape={kind:"pants",cy,L,rd,ties:!!o.bindebaender,pockets:!!o.seitentaschen,cuff:cuff?5:0,band:!elastic,torso:[[rd,2*((F.swx-F.cw[0])+(B.swx-B.cw[0]))],[hipY,2*(F.W+B.W)],[cy-1,2*(F.W+B.W)]],legs}}
  if(!elastic){R.pieces.push(rectPiece("Bund","1×",8,Math.round(Wt+4),{foldLine:"v",rotatable:true}));
    if(!J){R.notions.push("Hosenreißverschluss, 18 cm");R.notions.push("1 Hosenknopf oder Haken");R.notions.push("Bügeleinlage für Bund und Schlitz");R.extras.push("Hosenschlitz: Untertritt 1× 8 × 20 cm im Stoffbruch zuschneiden. Der Übertritt ist an der vorderen Mitte angeschnitten (4 cm).")}}
  else{R.notions.push(`Gummiband 3 cm breit, ${fmt(Math.round(Wt*.9))} cm lang`);R.notions.push("Optional: Kordel 150 cm")}
  if(cuff)R.pieces.push(rectPiece("Beinbündchen","2× (Bündchenware)",Math.round(Hm*.8),14,{foldLine:"h",stretch:true,mat:J?"rib":"main"}));
  if(o.taschen)R.pieces.push(rectPiece("Gesäßtasche","2×",14,15,{types:["hem","seam","seam","seam"]}));
  if(o.seitentaschen){R.notions.push("Futterstoff für die Taschenbeutel, ca. 0,3 m");R.extras.push("Eingriffkante der Vorderhose mit einem 1 cm breiten Formband verstärken, damit sie nicht ausleiert.")}
  if(o.bindebaender)R.strips=[{name:"Bindeband",cut:"6×",w:3.5,h:130,note:"längs falten, zu 1,2 cm breiten Bändern steppen; Ansatzpunkte sind im Schnitt mit „Band“ markiert"}];
  return R;
}

/* ================= Gesamtentwurf ================= */
function draft(S){
  const m=S.m,J=S.stoff==="jersey",ctx={jersey:J,seam:S.sa.seam};
  let R,notes=[];
  if(S.typ==="oberteil")R=draftTop(m,{...S.oberteil,laenge:getLen(S,"oberteil")},ctx);
  else if(S.typ==="rock")R=draftSkirt(m,{...S.rock,laenge:getLen(S,"rock")},ctx);
  else if(S.typ==="hose")R=draftPants(m,{...S.hose,laenge:getLen(S,"hose")},ctx);
  else{
    const k=S.kleid,len=getLen(S,"kleid"),top={...k.top};
    if(!k.taillennaht)R=draftTop(m,{...top,laenge:m.BL+len},ctx);
    else{
      if(!J&&top.verschluss==="keiner"){top.verschluss="reissverschluss_hinten";notes.push("Ein Kleid mit Taillennaht aus Webware braucht einen Verschluss. Fadenlauf plant einen Reißverschluss in der hinteren Mitte ein.")}
      const T=draftTop(m,{...top,kapuze:false,buendchen:false,laenge:m.BL},{...ctx,waistSeam:true});
      const Sk=draftSkirt(m,{form:k.rock.form,laenge:len,bund:"fest"},{...ctx,inDress:true,waistCirc:T.info.waistCirc,zipBack:top.verschluss==="reissverschluss_hinten"});
      R={pieces:[...T.pieces.slice(0,2),...Sk.pieces,...T.pieces.slice(2)],notions:[...T.notions,...Sk.notions],extras:[...T.extras,...Sk.extras],shape:{kind:"dress",top:T.shape,skirt:Sk.shape}};
      if(top.verschluss==="reissverschluss_hinten")R.notions.push("Nahtverdeckter Reißverschluss, 55 cm");
    }
  }
  R.notions.push("Passendes Nähgarn");
  if(J)R.notions.push("Jersey- oder Stretchnadel, für Säume eine Zwillingsnadel");
  R.notes=notes;return R;
}


/* ================= Zeichenliste je Teil ================= */
function arrowHead(tip,dir,s=.8){const p=[-dir[1],dir[0]];return{k:"poly",st:"thin",pts:[[tip[0]-dir[0]*s+p[0]*s*.45,tip[1]-dir[1]*s+p[1]*s*.45],tip,[tip[0]-dir[0]*s-p[0]*s*.45,tip[1]-dir[1]*s-p[1]*s*.45]]}}
function buildPiece(p,sa,sizeLabel){
  const seam=outline(p),sgn=area(seam)>0?1:-1,cut=offsetPiece(p,sa,sgn),bb=bbox(cut),sb=bbox(seam),L=[];
  L.push({k:"poly",st:"cut",pts:[...cut,cut[0]],fill:true});
  L.push({k:"poly",st:"seam",pts:[...seam,seam[0]]});
  for(const n of p.notches){const e=p.edges[n.edge],len=plen(e.pts),base=n.d!=null?n.d:len-n.fromEnd;
    for(const d of(n.double?[base-.35,base+.35]:[base])){const{p:q,t}=pointAt(e.pts,Math.max(0,Math.min(len,d))),nv=[sgn*t[1],-sgn*t[0]],ln=Math.max(sa[e.sa]||0,.6);L.push({k:"poly",st:"cut",pts:[q,[q[0]+nv[0]*ln,q[1]+nv[1]*ln]]})}}
  for(const e of p.edges){if(e.sa!=="fold")continue;const a=e.pts[0],b=e.pts[e.pts.length-1],len=dist(a,b),al=norm([b[0]-a[0],b[1]-a[1]]),inn=[-sgn*al[1],sgn*al[0]],off=1.4;
    const p1=[a[0]+al[0]*len*.14,a[1]+al[1]*len*.14],p2=[b[0]-al[0]*len*.14,b[1]-al[1]*len*.14],i1=[p1[0]+inn[0]*off,p1[1]+inn[1]*off],i2=[p2[0]+inn[0]*off,p2[1]+inn[1]*off];
    L.push({k:"poly",st:"thin",pts:[p1,i1,i2,p2]},arrowHead(p1,[-inn[0],-inn[1]]),arrowHead(p2,[-inn[0],-inn[1]]));
    L.push({k:"text",at:[(i1[0]+i2[0])/2+inn[0]*1.2,(i1[1]+i2[1])/2+inn[1]*1.2],str:"STOFFBRUCH",sz:"small",rot:Math.abs(al[0])<.3?90:0})}
  const cx=p.labelAt?p.labelAt[0]:(sb.x0+sb.x1)/2,cy=p.labelAt?p.labelAt[1]:(sb.y0+sb.y1)/2;
  if(p.stretch){const y=sb.y1-Math.min(1.1,sb.h*.18),x1=sb.x0+sb.w*.25,x2=sb.x1-sb.w*.25;L.push({k:"poly",st:"thin",pts:[[x1,y],[x2,y]]},arrowHead([x1,y],[-1,0],.6),arrowHead([x2,y],[1,0],.6))}
  else{const gx=p.grainX!=null?p.grainX:cx,y1=sb.y0+sb.h*.1,y2=sb.y1-sb.h*.1;if(sb.h>8){L.push({k:"poly",st:"thin",pts:[[gx,y1],[gx,y2]]},arrowHead([gx,y1],[0,-1]),arrowHead([gx,y2],[0,1]))}}
  for(const mk of p.marks){if(mk.t==="line")L.push({k:"poly",st:"thin",pts:mk.pts});else if(mk.t==="dash")L.push({k:"poly",st:"dash",pts:mk.pts});else if(mk.t==="button")L.push({k:"circle",at:mk.at,r:.6},{k:"poly",st:"thin",pts:[[mk.at[0]-.9,mk.at[1]],[mk.at[0]+.9,mk.at[1]]]});else if(mk.t==="text")L.push({k:"text",at:mk.at,str:mk.str,sz:"small",rot:mk.rot||0})}
  const rot=sb.w<12&&sb.h>2.2*sb.w?90:0;
  const lines=p.stretch?[[p.name,"name"],[p.cut+" · Dehnrichtung ↔","meta"]]:[[p.name,"name"],[p.cut,"meta"],[sizeLabel,"small"]];
  L.push({k:"label",at:[cx,p.stretch?sb.y0+sb.h*.4:cy],lines,rot});
  return{p,seam,cut,bb,list:L};
}
function packSheet(G,maxW){
  const gap=3,items=G.map((g,i)=>({i,w:g.bb.w,h:g.bb.h})).sort((a,b)=>b.h-a.h);
  const wid=Math.max(...items.map(t=>t.w)),ar=items.reduce((s,t)=>s+(t.w+gap)*(t.h+gap),0),W=Math.max(wid,Math.min(maxW,Math.sqrt(ar*1.6)));
  let x=0,y=0,rh=0,mx=0;const pos=[];
  for(const t of items){if(x>0&&x+t.w>W){x=0;y+=rh+gap;rh=0}pos[t.i]=[x,y];x+=t.w+gap;rh=Math.max(rh,t.h);mx=Math.max(mx,x-gap)}
  return{pos,W:mx,H:y+rh};
}
function fabricNeed(G,fw,strips=[]){
  const pack=(arr,width)=>{arr.sort((a,b)=>b.h-a.h);let x=0,y=0,rh=0;for(const t of arr){if(x>0&&x+t.w>width){x=0;y+=rh+1.5;rh=0}x+=t.w+1.5;rh=Math.max(rh,t.h)}return y+rh};
  const main=[],rib=[];let tooWide=null;
  for(const s of strips)for(let i=0;i<(parseInt(s.cut)||1);i++)main.push({w:Math.min(s.h,fw),h:s.w*Math.ceil(s.h/fw)});
  for(const g of G){if(g.p.mat==="lining")continue;const n=parseInt(g.p.cut)||1;let w=g.bb.w*(g.p.fold?2:1),h=g.bb.h;const tgt=g.p.mat==="rib"?rib:main,lim=g.p.mat==="rib"?70:fw;
    if(w>lim&&g.p.rotatable&&h<=lim)[w,h]=[h,w];if(w>lim&&g.p.mat!=="rib")tooWide=g.p.name;for(let i=0;i<n;i++)tgt.push({w:Math.min(w,lim),h})}
  const len=main.length?Math.ceil((pack(main,fw)+10)/10)*10:0,rl=rib.length?Math.ceil((pack(rib,70)+5)/5)*5:0;
  return{len,rib:rl,tooWide};
}


function svgList(list,tx,ty,st){
  let s="";const P=pts=>pts.map(p=>`${(p[0]+tx).toFixed(2)},${(p[1]+ty).toFixed(2)}`).join(" ");
  for(const it of list){
    if(it.k==="poly"){const sty=st.line[it.st];s+=`<polyline points="${P(it.pts)}" fill="${it.fill?st.paper:"none"}" stroke="${sty.c}" stroke-width="${sty.w}"${sty.d?` stroke-dasharray="${sty.d}"`:""} stroke-linejoin="round" stroke-linecap="round"/>`}
    else if(it.k==="circle")s+=`<circle cx="${(it.at[0]+tx).toFixed(2)}" cy="${(it.at[1]+ty).toFixed(2)}" r="${it.r}" fill="none" stroke="${st.line.thin.c}" stroke-width="${st.line.thin.w}"/>`;
    else if(it.k==="text"){const x=it.at[0]+tx,y=it.at[1]+ty,f=st.font.small;s+=`<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${f}" text-anchor="middle" dominant-baseline="middle" fill="${st.ink}" font-family="IBM Plex Mono, monospace" letter-spacing="${f*.08}"${it.rot?` transform="rotate(-${it.rot} ${x.toFixed(2)} ${y.toFixed(2)})"`:""}>${esc(it.str)}</text>`}
    else if(it.k==="label"){const x=it.at[0]+tx,y=it.at[1]+ty,hs=it.lines.map(l=>st.font[l[1]]*1.3),tot=hs.reduce((a,b)=>a+b,0);let off=-tot/2;
      s+=`<g${it.rot?` transform="rotate(-90 ${x.toFixed(2)} ${y.toFixed(2)})"`:""}>`;
      it.lines.forEach((l,i)=>{const f=st.font[l[1]];off+=hs[i]/2;s+=`<text x="${x.toFixed(2)}" y="${(y+off).toFixed(2)}" font-size="${f}" text-anchor="middle" dominant-baseline="middle" fill="${l[1]==="name"?st.ink:st.muted}" font-family="${l[1]==="name"?"Young Serif, Georgia, serif":"IBM Plex Mono, monospace"}" stroke="${st.paper}" stroke-width="${f*.3}" paint-order="stroke">${esc(l[0])}</text>`;off+=hs[i]/2});
      s+=`</g>`}
  }
  return s;
}

const TOP_OPTS=[
  ["passform","Passform",[["eng","Eng"],["normal","Normal"],["locker","Locker"],["oversize","Oversize"]]],
  ["silhouette","Silhouette",[["gerade","Gerade"],["tailliert","Tailliert"],["ausgestellt","Ausgestellt"]]],
  ["ausschnitt","Ausschnitt",[["rund","Rund"],["hoch","Hoch"],["v","V"],["boot","U-Boot"],["eckig","Eckig"]]],
  ["aermel","Ärmel",[["ohne","Ohne"],["kurz","Kurz"],["ellenbogen","Ellenbogen"],["dreiviertel","¾"],["lang","Lang"]]],
  ["aermelform","Ärmelform",[["schmal","Schmal"],["gerade","Gerade"],["ausgestellt","Ausgestellt"]]],
  ["verschluss","Verschluss",[["keiner","Keiner"],["knopfleiste","Knopfleiste vorn"],["reissverschluss_hinten","Reißverschluss hinten"]]],
  ["kragen","Kragen",[["keiner","Kein Kragen"],["hemdkragen","Hemdkragen"],["stehkragen","Stehkragen"]]]];
const TOP_TOG=[["kapuze","Kapuze"],["taschen","Tasche"],["buendchen","Bündchen"],["manschetten","Manschetten"]];
const FORM_OPTS=[["bleistift","Bleistift"],["gerade","Gerade"],["a_linie","A-Linie"],["ausgestellt","Ausgestellt"],["halbteller","Halbteller"],["teller","Teller"],["gerafft","Gerafft"]];
const BUND_OPTS=[["fest","Fester Bund"],["gummizug","Gummizug"]];
const LEG_OPTS=[["eng","Eng"],["gerade","Gerade"],["weit","Weit"],["palazzo","Sehr weit"],["jogger","Jogger"]];
const RISE_OPTS=[["normal","Taille"],["tief","Tief (Hüfte)"],["hoch","Hoch"]];
const LENS={oberteil:[["bauchfrei","Bauchfrei"],["huefte","Hüfte"],["po","Po"],["oberschenkel","Oberschenkel"]],kleid:[["mini","Mini"],["knie","Knie"],["midi","Midi"],["maxi","Maxi"]],rock:[["mini","Mini"],["knie","Knie"],["midi","Midi"],["maxi","Maxi"]],hose:[["kurz","Kurz"],["bermuda","Bermuda"],["siebenachtel","7/8"],["lang","Lang"]]};
const TYPES=[["oberteil","Oberteil"],["kleid","Kleid"],["rock","Rock"],["hose","Hose"]];

const TYPNAME={oberteil:"Oberteil",kleid:"Kleid",rock:"Rock",hose:"Hose"};
function defaultTitle(S){
  if(S.typ==="oberteil"){const o=S.oberteil;if(o.kapuze)return"Hoodie";if(o.verschluss==="knopfleiste")return"Bluse";if(o.aermel==="ohne")return"Top";return o.aermel==="lang"?"Langarmshirt":"Basic-T-Shirt"}
  if(S.typ==="kleid")return S.kleid.taillennaht?"Kleid mit Taillennaht":"Hängerkleid";
  if(S.typ==="rock")return({bleistift:"Bleistiftrock",gerade:"Gerader Rock",a_linie:"A-Linien-Rock",ausgestellt:"Ausgestellter Rock",halbteller:"Halbtellerrock",teller:"Tellerrock",gerafft:"Gekräuselter Rock"})[S.rock.form];
  return({eng:"Schmale Hose",gerade:"Gerade Hose",weit:"Weite Hose",palazzo:"Palazzohose",jogger:"Jogger"})[S.hose.bein];
}
function sizeLabel(S){return S.size!=="eigene"&&SIZES[S.group][S.size]?`Gr. ${S.size} ${S.group==="damen"?"Damen":"Herren"}`:"Eigene Maße"}

function defaultSteps(S,R){
  const J=S.stoff==="jersey",st=[],has=n=>R.pieces.some(p=>p.name.startsWith(n));
  st.push("Schnittteile entlang der Schnittkante ausschneiden. Stoff doppelt legen, Teile mit Stoffbruch an die Bruchkante legen und den Fadenlaufpfeil parallel zur Webkante ausrichten. Knipse 3 mm tief einschneiden.");
  if(S.typ==="oberteil"||S.typ==="kleid"){
    const o=S.typ==="oberteil"?S.oberteil:S.kleid.top;
    if(R.pieces.some(p=>p.marks.some(m=>m.t==="line")))st.push("Abnäher von der Spitze aus abnähen, Fäden verknoten und die Abnäher zur Mitte bügeln.");
    if(o.verschluss==="knopfleiste")st.push("Bügeleinlage auf die Knopfleisten-Belege bügeln und die Belege an der vorderen Kante nach innen umbügeln.");
    st.push(`Vorder- und Rückenteil rechts auf rechts legen und die Schulternähte schließen${J?" (Overlock oder schmaler Zickzack)":", Zugaben versäubern und auseinanderbügeln"}.`);
    if(o.kapuze)st.push("Kapuzenteile an der hinteren Rundung zusammennähen, vordere Kante umbügeln und absteppen. Kapuze an den Halsausschnitt stecken, Knipse auf die Schulternähte, und annähen.");
    else if(has("Halsbündchen"))st.push("Halsbündchen zum Ring schließen, längs falten, in Viertel einteilen und gedehnt rechts auf rechts an den Halsausschnitt nähen. Zugabe nach unten bügeln und knappkantig absteppen.");
    else st.push("Halsausschnitt mit Schrägband einfassen oder einen Beleg verstürzen.");
    if(o.kragen&&o.kragen!=="keiner"&&!o.kapuze)st.push(o.kragen==="hemdkragen"?"Einlage auf je ein Kragen- und Kragenstegteil bügeln. Kragen rechts auf rechts steppen, wenden, absteppen. Kragen zwischen die beiden Kragenstegteile legen und festnähen. Steg an den Halsausschnitt nähen, Innensteg von innen knappkantig festnähen.":"Einlage aufbügeln, Stehkragen rechts auf rechts an den Ausschnitt nähen, Innenseite umbügeln und knappkantig festnähen.");
    if(o.aermel!=="ohne")st.push(`Ärmel an den Armausschnitt stecken: Knips oben auf die Schulternaht, einfacher Knips vorne, doppelter hinten. ${J?"Flach einnähen":"Die Mehrweite der Ärmelkugel mit Heftstichen einhalten und einnähen"}.`);
    else st.push("Armausschnitte mit Schrägband oder Jerseystreifen versäubern.");
    if(S.typ==="kleid"&&S.kleid.taillennaht){st.push("Rockteile an den Seiten schließen. Oberteil-Seitennähte schließen.");st.push("Rock rechts auf rechts an das Oberteil nähen, Seitennähte treffen aufeinander.")}
    st.push(o.aermel!=="ohne"?"Seitennähte und Ärmelnähte in einem Zug vom Saum bis zum Ärmelsaum schließen.":"Seitennähte schließen.");
    if(o.verschluss==="reissverschluss_hinten")st.push("Nahtverdeckten Reißverschluss in die hintere Mitte nähen, danach die hintere Mittelnaht unterhalb schließen.");
    if(o.taschen)st.push("Tasche an der Eingriffskante säumen, übrige Kanten umbügeln und die Tasche aufsteppen.");
    if(has("Saumbündchen")||has("Ärmelbündchen"))st.push("Bündchen zum Ring schließen, längs falten, gedehnt an Saum und Ärmel nähen.");
    st.push(J?"Saum umbügeln und mit Zwillingsnadel oder Coverstich absteppen.":"Saum doppelt umbügeln und schmal absteppen.");
    if(o.manschetten&&(o.aermel==="lang"||o.aermel==="dreiviertel"))st.push("Ärmelschlitz mit dem Schrägstreifen einfassen, Ärmelsaum in die Falte legen. Manschetten mit Einlage rechts auf rechts an den Ärmel nähen, Enden verstürzen, innen festnähen.");
    if(o.verschluss==="knopfleiste")st.push("Knopflöcher auf der rechten Leiste nähen (Damen) bzw. links (Herren) und Knöpfe annähen.");
  }else if(S.typ==="rock"){
    const o=S.rock;
    if(R.pieces.some(p=>p.marks.some(m=>m.t==="line")))st.push("Abnäher nähen und zur Mitte bügeln.");
    if(o.form==="gerafft")st.push("Oberkanten mit zwei Reihen langer Stiche zum Kräuseln versehen.");
    st.push("Seitennähte schließen und Zugaben versäubern.");
    if(o.bund==="fest"&&S.stoff!=="jersey")st.push("Nahtverdeckten Reißverschluss in die hintere Mitte nähen, Mittelnaht darunter schließen.");
    st.push(o.bund==="gummizug"?"Oberkante 3,5 cm nach innen bügeln, Tunnel absteppen und eine Öffnung lassen. Gummiband einziehen, Enden überlappend zusammennähen, Öffnung schließen.":"Bügeleinlage auf den Bund bügeln. Bund rechts auf rechts an den Rock nähen, längs falten, Enden verstürzen und innen festnähen. Knopf oder Haken anbringen.");
    st.push("Saum umbügeln und absteppen.");
  }else{
    const o=S.hose;
    if(R.pieces.some(p=>p.marks.some(m=>m.t==="line")))st.push("Abnäher nähen.");
    if(o.taschen)st.push("Gesäßtaschen säumen, umbügeln und auf die Hinterhosen steppen.");
    if(o.bindebaender)st.push("Bindebänder längs rechts auf rechts falten, steppen, wenden und bügeln. Ein Ende jeweils schräg einschlagen und absteppen.");
    if(o.seitentaschen)st.push("Seitenteil auf einen Taschenbeutel steppen. Den zweiten Taschenbeutel rechts auf rechts an die Eingriffkante der Vorderhose nähen, nach innen wenden, Kante absteppen. Beide Beutel aufeinanderlegen und unten rund zusammennähen; oben und seitlich im Bund und in der Seitennaht mitfassen.");
    st.push(o.bindebaender?"Je Bein Vorder- und Hinterhose an Seiten- und Innenbeinnaht rechts auf rechts zusammennähen. Die seitlichen Bindebänder an der Markierung „Band“ in die Seitennaht mitfassen.":"Je Bein Vorder- und Hinterhose an Seiten- und Innenbeinnaht rechts auf rechts zusammennähen.");
    st.push("Ein Bein auf rechts wenden und in das andere stecken. Schrittnaht von der vorderen bis zur hinteren Mitte in einem Zug nähen, im Schrittbereich doppelt.");
    if(o.bund==="fest"&&S.stoff!=="jersey")st.push("Hosenschlitz mit Untertritt und Reißverschluss einnähen.");
    if(o.bindebaender)st.push("Die vorderen Bindebänder an den Markierungen „Band“ an die Oberkante der Hose heften, damit sie beim Bundannähen mitgefasst werden.");
    st.push(o.bund==="gummizug"?"Oberkante für den Tunnel nach innen bügeln, absteppen, Gummiband einziehen.":"Bund mit Einlage verstärken, annähen, verstürzen und innen festnähen. Knopfloch und Knopf setzen.");
    st.push(o.bein==="jogger"?"Beinbündchen zum Ring schließen, falten und gedehnt annähen.":"Beinsäume umbügeln und absteppen.");
  }
  return st;
}


export {BUND_OPTS,FORM_OPTS,LEG_OPTS,LEN,LENS,MKEYS,SIZES,TOP_OPTS,TOP_TOG,TYPES,TYPNAME,arc,area,arrowHead,bbox,bez,buildPiece,capCurve,catmull,clean,cutY,defaultSteps,defaultTitle,dist,draft,draftPants,draftSkirt,draftTop,esc,fabricNeed,finishHem,fmt,getLen,lerp,lineX,mk,norm,offsetPiece,outline,packSheet,plen,pointAt,rectPiece,sizeLabel,sizeM,solveCap,svgList,topDefaults,RISE_OPTS,fromY};
