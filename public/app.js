// Fadenlauf – Oberfläche: Bedienung, Vorschau, 3D-Skizze, Analyse, Export.
import * as F from "./engine.js";
const {RISE_OPTS,BUND_OPTS,FORM_OPTS,LEG_OPTS,LEN,LENS,MKEYS,SIZES,TOP_OPTS,TOP_TOG,TYPES,TYPNAME,arc,area,arrowHead,bbox,bez,buildPiece,capCurve,catmull,clean,cutY,dist,draftPants,draftSkirt,draftTop,esc,fabricNeed,finishHem,fmt,lerp,lineX,mk,norm,offsetPiece,outline,packSheet,plen,pointAt,rectPiece,sizeM,solveCap,svgList,topDefaults}=F;
const getLen=t=>F.getLen(S,t),draft=()=>F.draft(S),defaultTitle=()=>F.defaultTitle(S),sizeLabel=()=>F.sizeLabel(S),defaultSteps=R=>F.defaultSteps(S,R);
const $=s=>document.querySelector(s);
/* ================= Zustand ================= */

const S={
  typ:"oberteil",stoff:"jersey",group:"damen",size:"38",m:sizeM("damen","38"),
  oberteil:{...topDefaults(),lenKey:"huefte",len:null},
  kleid:{top:{...topDefaults(),silhouette:"ausgestellt"},taillennaht:false,rock:{form:"a_linie"},lenKey:"knie",len:null},
  rock:{form:"a_linie",bund:"fest",taschen:false,lenKey:"knie",len:null},
  hose:{bein:"gerade",bund:"gummizug",leibhoehe:"normal",taschen:false,seitentaschen:false,bindebaender:false,lenKey:"lang",len:null},
  sa:{seam:1,hem:2.5},fw:140,title:null,analysis:null,example:true};
try{const saved=JSON.parse(localStorage.getItem("fadenlauf-masse")||"null");if(saved&&saved.m&&MKEYS.every(([k])=>typeof saved.m[k]==="number")){S.m=saved.m;S.group=saved.group||"damen";S.size=saved.size||"eigene"}}catch(e){}
let MODE=(()=>{try{return localStorage.getItem("fadenlauf-modus")||"easy"}catch(e){return"easy"}})();
const saveM=()=>{try{localStorage.setItem("fadenlauf-masse",JSON.stringify({m:S.m,group:S.group,size:S.size}))}catch(e){}};




let zoom=1,last=null;
function renderSheet(){
  if(!last)return;const{G,lay}=last,wrap=$("#matWrap"),svg=$("#sheet");
  const M=5,W=lay.W+2*M,H=lay.H+2*M,cw=wrap.clientWidth*zoom,px=cw/W,k=1/px;
  svg.setAttribute("viewBox",`0 0 ${W.toFixed(2)} ${H.toFixed(2)}`);svg.setAttribute("width",cw);svg.setAttribute("height",H*px);
  const css=getComputedStyle(document.documentElement),v=n=>css.getPropertyValue(n).trim();
  const st={paper:v("--paper"),ink:v("--pattern"),muted:"#5b6861",line:{cut:{c:v("--pattern"),w:1.5*k},seam:{c:v("--seam"),w:1.1*k,d:`${5*k} ${3.5*k}`},thin:{c:v("--pattern"),w:1*k},dash:{c:v("--pattern"),w:1*k,d:`${4*k} ${3*k}`}},
    font:{name:Math.max(.7,13*k),meta:Math.max(.5,10.5*k),small:Math.max(.42,8.5*k)}};
  let g1="",g10="";for(let x=0;x<=W;x++)(x%10===0?(g10+=`M${x} 0V${H}`):(g1+=`M${x} 0V${H}`));for(let y=0;y<=H;y++)(y%10===0?(g10+=`M0 ${y}H${W}`):(g1+=`M0 ${y}H${W}`));
  let s=`<rect width="${W}" height="${H}" fill="var(--mat)"/>`;
  if(px>2.2)s+=`<path d="${g1}" stroke="var(--mat-grid)" stroke-width="${.8*k}"/>`;
  s+=`<path d="${g10}" stroke="var(--mat-grid-strong)" stroke-width="${1*k}"/>`;
  for(let x=10;x<W;x+=10)s+=`<text x="${x+.6*k*3}" y="${11*k}" font-size="${9*k}" fill="var(--mat-text)" font-family="IBM Plex Mono, monospace">${x}</text>`;
  G.forEach((g,i)=>{const[ox,oy]=lay.pos[i];s+=svgList(g.list,ox+M-g.bb.x0,oy+M-g.bb.y0,st)});
  svg.innerHTML=s;
}

/* ================= UI ================= */

function seg(label,opts,val,on,id){
  const f=document.createElement("div");f.className="field";
  if(label)f.innerHTML=`<span class="lbl">${esc(label)}</span>`;
  const d=document.createElement("div");d.className="seg";if(id)d.id=id;
  for(const[v,t]of opts){const b=document.createElement("button");b.type="button";b.textContent=t;b.setAttribute("aria-pressed",String(v===val));b.onclick=()=>{on(v);touched()};d.append(b)}
  f.append(d);return f;
}
function toggles(obj,list,label){
  const f=document.createElement("div");f.className="field";f.innerHTML=`<span class="lbl">${esc(label)}</span>`;
  const d=document.createElement("div");d.className="seg";
  for(const[k,t]of list){const b=document.createElement("button");b.type="button";b.className="tog";b.textContent=t;b.setAttribute("aria-pressed",String(!!obj[k]));b.onclick=()=>{obj[k]=!obj[k];touched()};d.append(b)}
  f.append(d);return f;
}
function lenField(t,label){
  const o=S[t],f=document.createElement("div");f.className="lenrow";
  const left=seg(label,LENS[t],o.lenKey,v=>{o.lenKey=v});
  const r=document.createElement("div");r.className="m";r.innerHTML=`<label for="lenIn">Länge</label><div class="unit"><input type="number" id="lenIn" step="0.5" min="10" max="160"></div>`;
  const inp=r.querySelector("input");inp.value=getLen(t);
  inp.onchange=()=>{const v=parseFloat(inp.value);if(v>=10&&v<=160){o.lenKey="custom";o.len=v;touched()}else inp.value=getLen(t)};
  f.append(left,r);return f;
}
function buildControls(){
  const ts=$("#typSeg");ts.innerHTML="";
  for(const[v,t]of TYPES){const b=document.createElement("button");b.type="button";b.textContent=t;b.setAttribute("aria-pressed",String(S.typ===v));b.onclick=()=>{S.typ=v;touched()};ts.append(b)}
  const box=$("#modelOpts");box.innerHTML="";
  const addTop=(o,dress)=>{for(const[k,l,opts]of TOP_OPTS){if(dress&&S.kleid.taillennaht&&k==="silhouette")continue;box.append(seg(l,opts,o[k],v=>{o[k]=v}))}
    box.append(toggles(o,dress?TOP_TOG.filter(t=>t[0]!=="kapuze"):TOP_TOG,"Details"))};
  if(S.typ==="oberteil"){addTop(S.oberteil);box.append(lenField("oberteil","Länge ab Schulter"))}
  else if(S.typ==="kleid"){addTop(S.kleid.top,true);box.append(toggles(S.kleid,[["taillennaht","Taillennaht mit angesetztem Rock"]],"Aufbau"));
    if(S.kleid.taillennaht)box.append(seg("Rockform",FORM_OPTS,S.kleid.rock.form,v=>{S.kleid.rock.form=v}));box.append(lenField("kleid","Länge ab Taille"))}
  else if(S.typ==="rock"){box.append(seg("Form",FORM_OPTS,S.rock.form,v=>{S.rock.form=v}),seg("Bund",BUND_OPTS,S.rock.bund,v=>{S.rock.bund=v}),toggles(S.rock,[["taschen","Aufgesetzte Taschen"]],"Details"),lenField("rock","Länge ab Taille"))}
  else{box.append(seg("Beinform",LEG_OPTS,S.hose.bein,v=>{S.hose.bein=v}),seg("Bundhöhe",RISE_OPTS,S.hose.leibhoehe||"normal",v=>{S.hose.leibhoehe=v}),seg("Bund",BUND_OPTS,S.hose.bund,v=>{S.hose.bund=v}),toggles(S.hose,[["seitentaschen","Seitentaschen"],["taschen","Gesäßtaschen"],["bindebaender","Bindebänder"]],"Details"),lenField("hose","Länge ab Taille"))}
  const ss=$("#stoffSeg");ss.innerHTML="";ss.append(...seg(null,[["jersey","Jersey / dehnbar"],["webware","Webware / fest"]],S.stoff,v=>{S.stoff=v;S.sa.hem=v==="jersey"?2:2.5;S.sa.seam=v==="jersey"?.75:1}).children[0].children);
  $("#saSeam").value=S.sa.seam;$("#saHem").value=S.sa.hem;$("#fw").value=S.fw;
}
function buildMeasures(){
  const g=$("#group"),s=$("#size");g.value=S.group;
  s.innerHTML=Object.keys(SIZES[S.group]).map(k=>`<option value="${k}">Größe ${k}</option>`).join("")+`<option value="eigene">Eigene Maße</option>`;
  s.value=S.size in SIZES[S.group]?S.size:"eigene";
  const box=$("#measures");box.innerHTML="";
  for(const[k,l,h]of MKEYS){const d=document.createElement("div");d.className="m";d.innerHTML=`<label for="m_${k}">${esc(l)}</label><div class="unit"><input type="number" id="m_${k}" step="0.5" min="5" max="250" value="${S.m[k]}"></div><small>${esc(h)}</small>`;
    d.querySelector("input").onchange=e=>{const v=parseFloat(e.target.value);if(v>4&&v<260){S.m[k]=v;S.size="eigene";$("#size").value="eigene";saveM();touched(false)}else e.target.value=S.m[k]};box.append(d)}
}
$("#group").onchange=e=>{S.group=e.target.value;const ks=Object.keys(SIZES[S.group]);S.size=ks[Math.floor(ks.length/2)];S.m=sizeM(S.group,S.size);saveM();buildMeasures();touched()};
$("#size").onchange=e=>{if(e.target.value==="eigene"){S.size="eigene";return}S.size=e.target.value;S.m=sizeM(S.group,S.size);saveM();buildMeasures();touched()};
$("#saSeam").onchange=e=>{const v=parseFloat(e.target.value);if(v>=0&&v<=3)S.sa.seam=v;touched(false)};
$("#saHem").onchange=e=>{const v=parseFloat(e.target.value);if(v>=0&&v<=6)S.sa.hem=v;touched(false)};
$("#fw").onchange=e=>{const v=parseFloat(e.target.value);if(v>=90&&v<=300)S.fw=v;touched(false)};
$("#zoomIn").onclick=()=>{zoom=Math.min(4,zoom*1.4);renderSheet()};
$("#zoomOut").onclick=()=>{zoom=Math.max(1,zoom/1.4);renderSheet()};

function touched(rebuild=true){if(rebuild)buildControls();update()}

function update(){
  const R=draft(),sa={seam:S.sa.seam,hem:S.sa.hem,fold:0,facing:4,casing:3.5},sl=sizeLabel();
  const G=R.pieces.map(p=>buildPiece(p,sa,sl)),strips=R.strips||[];const lay=packSheet(G,160);last={G,lay,R,strips};
  const title=S.title||defaultTitle();
  $("#sheetTitle").textContent=title;$("#badge").textContent=S.example?"Beispiel · lade ein Foto hoch":(S.source==="foto"?"Aus deinem Foto":S.source==="text"?"Aus deiner Beschreibung":S.source==="preset"?(photos.length?"Standardschnitt · Foto nicht ausgewertet":"Standardschnitt"):"Eigener Entwurf");
  renderSummary();
  $("#sheetSub").textContent=`${TYPNAME[S.typ]} · ${sl} · ${S.stoff==="jersey"?"Jersey":"Webware"} · ${G.length} Schnittteile · Bogen ${Math.round(lay.W)} × ${Math.round(lay.H)} cm`;
  renderSheet();build3D();
  $("#cutBody").innerHTML=G.map(g=>`<tr><td>${esc(g.p.name)}${g.p.mat==="rib"?' <span style="color:var(--muted)">· Bündchen</span>':g.p.mat==="lining"?' <span style="color:var(--muted)">· Futter</span>':""}</td><td class="n">${esc(g.p.cut)}</td></tr>`).join("")
    +strips.map(t=>`<tr><td>${esc(t.name)} <span style="color:var(--muted)">· ohne Schnittteil, ${fmt(t.w)} × ${fmt(t.h)} cm zuschneiden, ${esc(t.note)}</span></td><td class="n">${esc(t.cut)}</td></tr>`).join("");
  const F=fabricNeed(G,S.fw,strips);
  $("#fabric").innerHTML=`<div><b>${fmt(F.len/100,2)} m</b><span>Oberstoff bei ${fmt(S.fw)} cm Breite</span></div>`+(F.rib?`<div><b>${fmt(F.rib)} cm</b><span>Bündchenware, Schlauch</span></div>`:"");
  const ex=[...R.extras,...R.notes];if(F.tooWide)ex.push(`„${F.tooWide}“ ist breiter als dein Stoff. Teile das Schnittteil mit einer zusätzlichen Naht oder nimm breiteren Stoff.`);
  ex.push("Schätzung, eher großzügig. Für Muster mit Richtung oder Karos 20–30 cm mehr einplanen.");
  $("#extras").innerHTML=ex.map(t=>`<li>${esc(t)}</li>`).join("");
  const A=S.analysis&&S.analysis.typ===S.typ?S.analysis:null;
  const notions=A&&Array.isArray(A.zutaten)&&A.zutaten.length?A.zutaten.map(String):R.notions;
  $("#notions").innerHTML=notions.map(t=>`<li>${esc(t)}</li>`).join("");
  $("#fabricRec").textContent=A&&A.stoffempfehlung?String(A.stoffempfehlung):(S.stoff==="jersey"?"Geeignet: Baumwolljersey, Sweat, French Terry, Interlock mit mindestens 20 % Querdehnung.":"Geeignet: Baumwollpopeline, Leinen, Viskose, Twill. Vor dem Zuschnitt waschen, damit der Stoff später nicht einläuft.");
  const steps=A&&Array.isArray(A.schritte)&&A.schritte.length?A.schritte.map(String):defaultSteps(R);
  $("#stepsSrc").textContent=A&&Array.isArray(A.schritte)&&A.schritte.length?"Von Claude passend zu deinem Foto geschrieben":"Standardablauf für die gewählten Optionen";
  $("#steps").innerHTML=steps.map(t=>`<li>${esc(t)}</li>`).join("");
  last.steps=steps;last.notions=notions;last.extras=ex;last.F=F;last.title=title;
}
new ResizeObserver(()=>renderSheet()).observe($("#matWrap"));

/* ================= 3D-Vorschau (Skizzenstil) ================= */
const V={ok:false,auto:!matchMedia("(prefers-reduced-motion: reduce)").matches,fig:true,drag:false,visible:true,raf:null,mats:{},reveal:null};
const SWATCH=[["#6f8fae","Taubenblau"],["#7f9a7a","Salbei"],["#b86b52","Terrakotta"],["#8c4a6b","Beere"],["#e6dfcf","Naturweiß"],["#2e3135","Schwarz"]];
const ell=(C,k)=>{const a=C/(2*Math.PI*Math.sqrt((1+k*k)/2));return[a,a*k]};
const circ=(a,b)=>2*Math.PI*Math.sqrt((a*a+b*b)/2);
function ringsAt(Rg,y){if(y>=Rg[0].y)return Rg[0];const l=Rg[Rg.length-1];if(y<=l.y)return l;for(let i=1;i<Rg.length;i++)if(y>=Rg[i].y){const t=(Rg[i-1].y-y)/(Rg[i-1].y-Rg[i].y);return{a:lerp(Rg[i-1].a,Rg[i].a,t),b:lerp(Rg[i-1].b,Rg[i].b,t)}}return l}
function loftGeo(rings,N=48,arc=null){
  const pos=[],idx=[];
  for(const r of rings)for(let j=0;j<N;j++){const th=arc?lerp(arc[0],arc[1],j/(N-1)):j/N*Math.PI*2,mm=1+(r.amp||0)*Math.sin((r.n||9)*th+.6);pos.push((r.cx||0)+r.a*mm*Math.cos(th),r.y+(r.dy?r.dy(th):0),(r.cz||0)+r.b*mm*Math.sin(th))}
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<(arc?N-1:N);j++){const a=i*N+j,b=i*N+(j+1)%N,c=(i+1)*N+j,d=(i+1)*N+(j+1)%N;idx.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  g.userData={N,n:rings.length,c:rings.map(r=>[r.cx||0,r.cz||0])};return g;
}
function mat(key,make){return V.mats[key]||(V.mats[key]=make())}
function toonMat(color,back,clip){return mat(`t${color}${back}${clip}`,()=>{const m=new THREE.MeshToonMaterial({color:new THREE.Color(color).multiplyScalar(back?.62:1),gradientMap:V.grad,side:back?THREE.BackSide:THREE.FrontSide});if(clip)m.clippingPlanes=[V.clip];return m})}
function inkMat(t,color,clip){return mat(`o${t}${color}${clip}`,()=>{const m=new THREE.ShaderMaterial({uniforms:{t:{value:t},c:{value:new THREE.Color(color)}},side:THREE.BackSide,clipping:true,
  vertexShader:"uniform float t;\n#include <clipping_planes_pars_vertex>\nvoid main(){vec4 mvPosition=modelViewMatrix*vec4(position+normal*t,1.0);gl_Position=projectionMatrix*mvPosition;\n#include <clipping_planes_vertex>\n}",
  fragmentShader:"uniform vec3 c;\n#include <clipping_planes_pars_fragment>\nvoid main(){\n#include <clipping_planes_fragment>\ngl_FragColor=vec4(c,1.0);}"});if(clip)m.clippingPlanes=[V.clip];return m})}
function lineMat(color,dash,clip){return mat(`l${color}${dash}${clip}`,()=>{const m=dash?new THREE.LineDashedMaterial({color,dashSize:1.3,gapSize:1}):new THREE.LineBasicMaterial({color});if(clip)m.clippingPlanes=[V.clip];return m})}
function addLoft(grp,rings,o){
  const g=loftGeo(rings,o.N||48,o.arc||null);grp.add(new THREE.Mesh(g,toonMat(o.color,false,o.clip)));
  if(o.inner)grp.add(new THREE.Mesh(g,toonMat(o.color,true,o.clip)));
  grp.add(new THREE.Mesh(g,inkMat(o.ow||.32,o.oc||0x1b231f,o.clip)));return g;
}
function seam(grp,g,col,o){const P=g.attributes.position.array,{N,n,c}=g.userData,pts=[];
  for(let i=0;i<n;i++){const k=(i*N+col)*3,dx=P[k]-c[i][0],dz=P[k+2]-c[i][1],l=Math.hypot(dx,dz)||1;pts.push(new THREE.Vector3(P[k]+dx/l*.18,P[k+1],P[k+2]+dz/l*.18))}
  const L=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMat(o.lc,!!o.dash,true));if(o.dash)L.computeLineDistances();grp.add(L)}
function ringLine(grp,g,i,o){const P=g.attributes.position.array,{N,c}=g.userData,pts=[];
  for(let j=0;j<=N;j++){const k=(i*N+j%N)*3,dx=P[k]-c[i][0],dz=P[k+2]-c[i][1],l=Math.hypot(dx,dz)||1;pts.push(new THREE.Vector3(P[k]+dx/l*.18,P[k+1],P[k+2]+dz/l*.18))}
  grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMat(o.lc,false,true)))}
function blob(grp,r,sc,pos,color,clip){const g=new THREE.SphereGeometry(r,20,14);const m=new THREE.Mesh(g,toonMat(color,false,clip));m.scale.set(...sc);m.position.set(...pos);grp.add(m);const o=new THREE.Mesh(g,inkMat(clip?.3:.2,clip?0x1b231f:0x8d978f,clip));o.scale.copy(m.scale);o.position.copy(m.position);grp.add(o);return m}
function fabricColor(){return S.color||S.photoColor||"#6f8fae"}

function init3D(){
  const cv=$("#v3");
  if(!window.THREE){$("#viewer").hidden=true;return}
  try{V.ren=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){$("#viewer").hidden=true;return}
  V.ren.setPixelRatio(Math.min(2,window.devicePixelRatio||1));V.ren.localClippingEnabled=true;
  V.scene=new THREE.Scene();V.cam=new THREE.PerspectiveCamera(28,1,1,3000);
  V.grad=new THREE.DataTexture(new Uint8Array([120,190,255]),3,1,THREE.LuminanceFormat);V.grad.minFilter=V.grad.magFilter=THREE.NearestFilter;V.grad.needsUpdate=true;
  const key=new THREE.DirectionalLight(0xffffff,.75);key.position.set(120,220,260);V.scene.add(key,new THREE.AmbientLight(0xffffff,.42));
  V.clip=new THREE.Plane(new THREE.Vector3(0,1,0),1e4);
  V.root=new THREE.Group();V.body=new THREE.Group();V.garm=new THREE.Group();V.root.add(V.body,V.garm);V.scene.add(V.root);
  const sh=new THREE.Mesh(new THREE.CircleGeometry(38,40),new THREE.MeshBasicMaterial({color:0x1b231f,transparent:true,opacity:.07}));sh.rotation.x=-Math.PI/2;sh.position.y=.2;V.scene.add(sh);
  let lx=0;
  cv.addEventListener("pointerdown",e=>{V.drag=true;lx=e.clientX;cv.setPointerCapture(e.pointerId);kick()});
  cv.addEventListener("pointermove",e=>{if(!V.drag)return;V.root.rotation.y+=(e.clientX-lx)*.012;lx=e.clientX;kick()});
  const up=()=>{V.drag=false;kick()};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
  new ResizeObserver(()=>{size3D();frame3D();kick()}).observe(cv);
  new IntersectionObserver(es=>{V.visible=es[0].isIntersecting;kick()}).observe(cv);
  $("#vFig").onclick=e=>{V.fig=!V.fig;V.body.visible=V.fig;V.root.traverse(o=>{if(o.userData.fig)o.visible=V.fig});e.target.setAttribute("aria-pressed",String(V.fig));kick()};
  $("#vSpin").setAttribute("aria-pressed",String(V.auto));$("#vSpin").onclick=e=>{V.auto=!V.auto;e.target.setAttribute("aria-pressed",String(V.auto));kick()};
  V.ok=true;buildSwatches();size3D();
}
function buildSwatches(){
  const d=$("#swatches");d.innerHTML="";const cur=fabricColor(),opts=[...(S.photoColor?[[S.photoColor,"Farbe aus dem Foto"]]:[]),...SWATCH];
  for(const[c,n]of opts){const b=document.createElement("button");b.type="button";b.style.background=c;b.title=n;b.setAttribute("aria-label",n);b.setAttribute("aria-pressed",String(c===cur));if(n.startsWith("Farbe aus"))b.textContent="F";
    b.onclick=()=>{S.color=c===S.photoColor?null:c;buildSwatches();build3D(false)};d.append(b)}
}
function size3D(){const cv=$("#v3"),w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;V.w=w;V.h=h;V.ren.setSize(w,h,false);V.cam.aspect=w/h;V.cam.updateProjectionMatrix()}
function frame3D(){
  if(!V.box)return;const c=V.box.getCenter(new THREE.Vector3()),s=V.box.getSize(new THREE.Vector3()),asp=(V.w||1)/(V.h||1),fov=V.cam.fov*Math.PI/180;
  const hNeed=Math.max(s.y*1.3,Math.max(s.x,s.z)*1.5/asp,70),dist=hNeed/2/Math.tan(fov/2)+s.z/2;
  V.cam.position.set(0,c.y+dist*.16,dist);V.cam.lookAt(0,c.y,0);
}
function kick(){if(V.ok&&!V.raf)V.raf=requestAnimationFrame(loop3D)}
function loop3D(t){
  V.raf=null;if(!V.visible)return;let more=V.drag;
  if(V.auto&&!V.drag){V.root.rotation.y+=.005;more=true}
  if(V.reveal){const k=Math.min(1,(t-V.reveal.t0)/1100),e=1-Math.pow(1-k,3);V.clip.constant=-lerp(V.reveal.top,V.reveal.bot,e);if(k>=1){V.reveal=null;V.clip.constant=1e4}else more=true}
  V.ren.render(V.scene,V.cam);if(more)V.raf=requestAnimationFrame(loop3D);
}
function build3D(animate=true){
  if(!V.ok||!last||!last.R.shape)return;
  for(const g of[V.body,V.garm])while(g.children.length){const c=g.children.pop();if(c.geometry)c.geometry.dispose()}
  const m=S.m,sh=last.R.shape,waistY=m.IL+m.R,neckY=waistY+m.BL,shX=m.N/6+.5+m.SL,chestY=neckY-(m.B/8+9),kneeY=waistY-m.T;
  const[ca,cb]=ell(m.B,.68),[wa,wb]=ell(m.W,.74),[ha,hb]=ell(m.H,.72),[na,nb]=ell(m.N,.9),legX=ha*.5;
  const torso=[{y:neckY+9,a:na*.95,b:nb*.95},{y:neckY+1,a:na*1.05,b:nb*1.05},{y:neckY-2.5,a:shX*.8,b:cb*.8},{y:neckY-5.5,a:shX*.98,b:cb*.92},{y:chestY,a:ca,b:cb},{y:waistY,a:wa,b:wb},{y:waistY-20,a:ha,b:hb},{y:m.IL+3,a:ha*.96,b:hb*.95}];
  const legR=[[m.IL+4,.58],[m.IL-8,.53],[kneeY+6,.4],[kneeY,.37],[kneeY-12,.37],[10,.23],[2,.22]].map(([y,f])=>{const[a,b]=ell(m.H*f,.92);return{y,a,b}});
  const armL=[[0,1.15],[-8,1],[-m.AL*.45,.8],[-m.AL*.55,.85],[-m.AL,.55]].map(([y,f])=>{const[a,b]=ell(m.UA*f,.9);return{y,a,b}});
  const bodyAt=y=>{if(y>m.IL+3)return ringsAt(torso,y);const l=ringsAt(legR,y);return{a:legX+l.a,b:Math.max(l.b,hb*.6)}};
  // Figur
  const BC="#d9ddd7",bo={color:BC,ow:.2,oc:0x8d978f,N:36};
  addLoft(V.body,torso,bo);
  for(const sx of[-1,1]){addLoft(V.body,legR.map(r=>({...r,cx:sx*legX})),bo);blob(V.body,1,[4.2,3,11],[sx*legX,3,4],BC)}
  const arms=[-1,1].map(sx=>{const g=new THREE.Group();g.position.set(sx*(shX-1.5),neckY-4.5,0);g.rotation.z=sx*.17;V.root.add(g);g.userData.arm=true;return g});
  V.root.children.filter(c=>c.userData.arm&&!arms.includes(c)).forEach(c=>{c.traverse(o=>{if(o.geometry)o.geometry.dispose()});V.root.remove(c)});
  const armBody=new THREE.Group();V.body.add(armBody);
  arms.forEach(g=>{const b=new THREE.Group();b.userData.fig=true;g.add(b);addLoft(b,armL,bo);blob(b,1,[3.6,8,2.4],[0,-m.AL-6.5,0],BC)});
  V.body.add(new THREE.Group());blob(V.body,10,[.82,1.12,.95],[0,neckY+19,1],BC);
  // Kleidungsstück
  const col=fabricColor(),dark=new THREE.Color(col).getHSL({}).l<.3,lc=dark?0xc9cfca:0x1b231f,go={color:col,inner:true,clip:true},lo={lc};
  const fit=(y,a,b,f=1.03)=>{const B=bodyAt(y);return{a:Math.max(a,B.a*f+.3),b:Math.max(b,B.b*f+.3)}};
  const drape=(r,y)=>{const B=bodyAt(y),Cb=circ(B.a,B.b),C=circ(r.a,r.b),e=C/Cb-1;if(e>.22){const e2=.22+(e-.22)*.5,f=Cb*(1+e2)/C;r.a*=f;r.b*=f;r.amp=Math.min(.15,(e-e2)*.09);r.n=9}return r};
  const garmRings=(prof,top,k,waistFix)=>prof.map(([yy,C],i)=>{const y=top-yy;let[a,b]=ell(C,k);if(i===0&&waistFix){const B=bodyAt(y),r={y,...fit(y,B.a,B.b,1.04)},ex=C/circ(B.a,B.b)-1;if(ex>.05){r.amp=Math.min(.05,ex*.06);r.n=14}return r}return drape({y,...fit(y,a,b)},y)});
  const topRings=t=>{
    const fr=th=>Math.max(0,Math.sin(th))**2,bk=th=>Math.max(0,-Math.sin(th))**2,fnd=Math.min(t.fnd,t.AD-6),out=[];
    out.push({y:neckY,...fit(neckY,t.nw,t.nw*.95),cz:-.6,dy:th=>-(fnd*fr(th)+t.bnd*bk(th))});
    const s1=fit(neckY-t.sy,t.sx,0);s1.b=Math.max(s1.b,cb*1.05);out.push({y:neckY-t.sy,...s1,dy:th=>-Math.max(0,fnd+2-t.sy)*fr(th)});
    t.side.forEach((p,i)=>{if(i%2&&i!==t.side.length-1)return;const y=neckY-p[1],[a,b]=ell(4*p[0],.7);out.push(drape({y,...fit(y,a,b)},y))});
    if(t.hemBand){const l=out[out.length-1];out.push({y:l.y-.4,a:l.a*.93,b:l.b*.93},{y:l.y-t.hemBand,a:l.a*.92,b:l.b*.92})}
    return out};
  const sleeves=t=>{if(!t.sleeve)return;const sl=t.sleeve,top=-t.drop;
    arms.forEach(g=>{const grp=new THREE.Group();g.add(grp);
      const ar=y=>ringsAt(armL,y),mk=(y,C)=>{const[a,b]=ell(C,.85),A=ar(y);return drape({y,a:Math.max(a,A.a*1.05+.3),b:Math.max(b,A.b*1.05+.3)},y)};
      const rs=[mk(top+1.5,sl.bic*.92),mk(top-sl.CH*.5,sl.bic),mk(top-sl.SLn,sl.Hw)];
      rs.forEach(r=>{if(r.amp){const A=ar(r.y);r.amp=Math.min(r.amp,.12)}});
      if(sl.cuff){const l=rs[rs.length-1];rs.push({y:l.y-.4,a:l.a*.8,b:l.b*.8},{y:l.y-sl.cuff,a:l.a*.78,b:l.b*.78})}
      const gg=addLoft(grp,rs,{...go});ringLine(grp,gg,rs.length-1,lo)})};
  const seamsTorso=(g,kl)=>{const N=g.userData.N;seam(V.garm,g,0,lo);seam(V.garm,g,N/2,lo);ringLine(V.garm,g,0,lo);ringLine(V.garm,g,g.userData.n-1,lo);if(kl)seam(V.garm,g,N/4,lo)};
  if(sh.kind==="top"||sh.kind==="dress"){
    const t=sh.kind==="top"?sh:sh.top;let rs=topRings(t);
    if(sh.kind==="dress"){const sk=garmRings(sh.skirt.prof,waistY,.75,false).filter(r=>r.y<waistY-.5);rs=rs.concat(sk)}
    const g=addLoft(V.garm,rs,go);seamsTorso(g,t.kl);sleeves(t);
    if(t.kragen&&t.kragen!=="keiner"&&!t.kapuze){const f2=Math.min(t.fnd,t.AD-6),fr=th=>Math.max(0,Math.sin(th))**2,bk=th=>Math.max(0,-Math.sin(th))**2,b0=rs[0];
      const st=[{y:neckY,a:b0.a,b:b0.b,cz:b0.cz,dy:b0.dy},{y:neckY+3.5,a:b0.a*.97,b:b0.b*.97,cz:b0.cz,dy:th=>-(f2*.7*fr(th)+t.bnd*bk(th))}],gs=addLoft(V.garm,st,go);ringLine(V.garm,gs,1,lo);
      if(t.kragen==="hemdkragen")addLoft(V.garm,[{y:neckY+3.7,a:b0.a,b:b0.b,cz:b0.cz,dy:st[1].dy},{y:neckY-1.8,a:b0.a*1.45,b:b0.b*1.4,cz:b0.cz,dy:th=>-(f2*.9*fr(th)+t.bnd*bk(th))}],{...go,arc:[Math.PI/2+.34,Math.PI*2.5-.34]})}
    if(sh.kind==="dress")ringLine(V.garm,g,rs.findIndex(r=>r.y<=waistY+.01)||0,lo);
    if(t.kl){for(let y=neckY-Math.min(t.fnd,t.AD-6)-1.5;y>rs[rs.length-1].y+3;y-=8.5){const r=ringsAt(rs.filter(q=>!q.dy),y);blob(V.garm,.55,[1,1,.6],[0,y,r.b*(1+(r.amp||0))+.35],dark?"#ddd":"#1b231f",true)}}
    if(t.kapuze){const hg=new THREE.SphereGeometry(13,28,16,0,Math.PI*2,0,Math.PI*.62),h=new THREE.Mesh(hg,toonMat(col,false,true)),hi=new THREE.Mesh(hg,toonMat(col,true,true)),ho=new THREE.Mesh(hg,inkMat(.32,0x1b231f,true));
      for(const o of[h,hi,ho]){o.scale.set(1.05,.62,.9);o.rotation.x=-1.15;o.position.set(0,neckY+3,-nb-9);V.garm.add(o)}}
  }else if(sh.kind==="skirt"){
    const rs=garmRings(sh.prof,waistY,.75,true),g=addLoft(V.garm,rs,go);seamsTorso(g,false);if(sh.band){const B=bodyAt(waistY-3.5);ringLine(V.garm,loftGeo([{y:waistY-3.5,a:rs[0].a,b:rs[0].b}]),0,lo)}
  }else if(sh.kind==="pants"){
    const tr=garmRings(sh.torso,waistY,.72,true),g=addLoft(V.garm,tr,go);ringLine(V.garm,g,0,lo);seam(V.garm,g,0,lo);seam(V.garm,g,g.userData.N/2,lo);seam(V.garm,g,g.userData.N/4,lo);
    if(sh.band)ringLine(V.garm,loftGeo([{y:waistY-4,a:tr[0].a,b:tr[0].b}]),0,lo);
    const legRs={};
    for(const sx of[-1,1]){
      const rs=[[sh.cy-4,sh.legs[0][1]],...sh.legs].map(([yy,C])=>{const y=waistY-yy,[a,b]=ell(C,.9),l=ringsAt(legR,y),r={y,cx:sx*legX,a:Math.max(a,l.a*1.04+.3),b:Math.max(b,l.b*1.04+.3)},e=circ(r.a,r.b)/circ(l.a,l.b)-1;if(e>.35){const e2=.35+(e-.35)*.85,f=(1+e2)/(1+e);r.a*=f;r.b*=f;r.amp=Math.min(.12,(e-e2)*.08);r.n=7}return r});
      if(sh.cuff){const l=rs[rs.length-1];rs.push({...l,y:l.y-.4,a:l.a*.82,b:l.b*.82,amp:0},{...l,y:l.y-sh.cuff,a:l.a*.8,b:l.b*.8,amp:0})}
      legRs[sx]=rs;const gl=addLoft(V.garm,rs,go),N=gl.userData.N;seam(V.garm,gl,sx>0?0:N/2,lo);seam(V.garm,gl,sx>0?N/2:0,lo);seam(V.garm,gl,N/4,{lc,dash:true});ringLine(V.garm,gl,rs.length-1,lo)}
    const y0=waistY-(sh.rd||0),at=(sx,th,y,out=1.02)=>{const r=ringsAt(tr,y);return new THREE.Vector3(sx*r.a*out*Math.cos(th),y,r.b*out*Math.sin(th))};
    if(sh.pockets)for(const sx of[-1,1]){const pts=[];for(let i=0;i<=10;i++){const t=i/10;pts.push(at(sx,.55*(1-t),y0-17*t))}V.garm.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMat(lc,false,true)))}
    // Bindebänder hängen außen an der Hose: oberhalb des Schritts am Rumpfteil, darunter am Bein entlang
    const crotchY=waistY-sh.cy,tieCol="#"+new THREE.Color(col).multiplyScalar(dark?2.4:.7).getHexString();
    const onSurface=(sx,th,y,lift)=>{if(y>crotchY)return at(sx,th,y,1.03+lift);const r=ringsAt(legRs[sx].map(q=>({y:q.y,a:q.a*(1+(q.amp||0)),b:q.b*(1+(q.amp||0))})),y),ph=th*1.25;return new THREE.Vector3(sx*legX+sx*r.a*(1.04+lift)*Math.cos(ph),y,r.b*(1.04+lift)*Math.sin(ph))};
    if(sh.ties)for(const sx of[-1,1])for(const[th,len,sw]of[[0,68,.04],[.45,58,.02],[1.05,52,.03]]){const pts=[];for(let i=0;i<=12;i++){const t=i/12;pts.push(onSurface(sx,th,y0-1.5-len*t,sw*Math.sin(t*3.1)))}
      const curve=new THREE.CatmullRomCurve3(pts),tg=new THREE.TubeGeometry(curve,36,.5,6,false);V.garm.add(new THREE.Mesh(tg,toonMat(tieCol,false,true)),new THREE.Mesh(tg,inkMat(.12,0x1b231f,true)))}
  }
  arms.forEach(g=>g.children.forEach(c=>{if(c.userData.fig)c.visible=V.fig}));V.body.visible=V.fig;
  V.root.updateMatrixWorld(true);V.box=new THREE.Box3().setFromObject(V.garm);arms.forEach(g=>g.children.forEach(c=>{if(!c.userData.fig)V.box.expandByObject(c)}));
  if(sh.kind==="pants"||sh.kind==="skirt")V.box.max.y+=16;
  frame3D();
  if(animate&&!matchMedia("(prefers-reduced-motion: reduce)").matches){V.reveal={t0:performance.now(),top:V.box.max.y+1,bot:V.box.min.y-1};V.clip.constant=-(V.box.max.y+1)}else V.clip.constant=1e4;
  kick();
}

/* ================= Fotos & Analyse ================= */
let photos=[],sample=null,limits=null,ctl=null,imgBlocked=false;
const blobToB64=b=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result).split(",")[1]);fr.onerror=rej;fr.readAsDataURL(b)});
// Foto-Analyse über den eigenen Server (/api/analyze), der Claude mit dem Server-Schlüssel aufruft.
const api={async analyze({images,desc,hint,signal}){
  const data=await Promise.all(images.map(blobToB64));let res;
  try{res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({images:data.map(d=>({media_type:"image/jpeg",data:d})),desc,hint}),signal})}
  catch(e){throw{code:signal&&signal.aborted?"cancelled":"offline"}}
  const j=await res.json().catch(()=>({}));if(!res.ok)throw{code:j.code||"upstream_error",message:j.message};return j.result}};
const canSendPhotos=()=>!!sample&&!imgBlocked;
const descText=()=>$("#desc").value.trim().slice(0,600);
let PSTATE="unknown";
function setPState(k){PSTATE=k;const e=$("#pState");e.hidden=false;e.className="pstate "+(k==="ok"?"ok":k==="unknown"?"":"bad");
  e.textContent={ok:"✓ Claude wertet dein Foto aus und erkennt Schnitt und Details.",unknown:"Die Foto-Analyse wird geprüft …",text:"⚠ Fotos können gerade nicht ausgewertet werden. Beschreib das Kleidungsstück im Feld darunter.",none:"⚠ Die Foto-Analyse ist gerade nicht erreichbar (offline oder nicht eingerichtet). Wähl bei „Was ist es?“ aus, was du nähen willst, dann bekommst du einen Standardschnitt."}[k]}
function showTextMode(){if(PSTATE!=="none")setPState("text");$("#descBox").hidden=false;$("#descHint").textContent="Diese Ansicht kann keine Fotos an Claude schicken. Beschreib das Kleidungsstück hier in ein paar Worten, dann leitet Claude den Schnitt daraus ab.";$("#desc").placeholder="z. B. Kariertes Flanellhemd, locker, Knopfleiste, Brusttaschen, Hemdkragen, lange Ärmel mit Manschetten"}
function toast(t){const d=document.createElement("div");d.className="toast";d.textContent=t;document.body.append(d);setTimeout(()=>d.remove(),3200)}
function loadImage(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=fr.result};fr.onerror=rej;fr.readAsDataURL(file)})}
function scaled(im,max,q){const s=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement("canvas");c.width=Math.round(im.naturalWidth*s);c.height=Math.round(im.naturalHeight*s);const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);return c}
async function addFiles(list){
  const max=3;
  for(const f of list){if(photos.length>=Math.min(3,max))break;if(!f.type.startsWith("image/"))continue;
    try{const im=await loadImage(f),big=scaled(im,1600),blob=await new Promise(r=>big.toBlob(r,"image/jpeg",.9)),thumb=scaled(im,700).toDataURL("image/jpeg",.82);photos.push({blob,thumb,w:im.naturalWidth,h:im.naturalHeight});if(photos.length===1)takeColor(im)}
    catch(e){setStatus("Dieses Bild konnte nicht gelesen werden. Nimm ein JPEG oder PNG.",true)}}
  drawThumbs();
}
function takeColor(im){try{const c=document.createElement("canvas");c.width=c.height=40;const x=c.getContext("2d"),w=im.naturalWidth,h=im.naturalHeight;x.drawImage(im,w*.3,h*.3,w*.4,h*.4,0,0,40,40);const d=x.getImageData(0,0,40,40).data;let r=0,g=0,b=0,n=0;
  for(let i=0;i<d.length;i+=4){const mx=Math.max(d[i],d[i+1],d[i+2]),mn=Math.min(d[i],d[i+1],d[i+2]);if(mx>245&&mn>235)continue;r+=d[i];g+=d[i+1];b+=d[i+2];n++}
  if(n<50)return;S.photoColor="#"+[r,g,b].map(v=>Math.round(v/n).toString(16).padStart(2,"0")).join("");if(V.ok){buildSwatches();build3D(false)}}catch(e){}}
function drawThumbs(){
  const t=$("#thumbs");t.innerHTML="";
  photos.forEach((p,i)=>{const f=document.createElement("figure");f.innerHTML=`<img alt="Foto ${i+1}" src="${p.thumb}"><button type="button" aria-label="Foto entfernen">×</button>`;f.querySelector("button").onclick=()=>{photos.splice(i,1);drawThumbs()};t.append(f)});
  $("#analyze").disabled=!sample||!(canSendPhotos()&&photos.length||descText());$("#analyze").textContent=canSendPhotos()&&photos.length?"Schnitt aus Foto ableiten":"Schnitt aus Beschreibung ableiten";
}
function setStatus(t,err){for(const id of["#aStatus","#eStatus"]){const e=$(id);e.textContent="";e.classList.remove("err")}const s=$(MODE==="easy"?"#eStatus":"#aStatus");s.textContent=t;s.classList.toggle("err",!!err)}
$("#file").onchange=e=>{addFiles([...e.target.files]);e.target.value=""};
const drop=$("#drop");
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("over")}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("over")}));
drop.addEventListener("drop",e=>addFiles([...e.dataTransfer.files]));
document.addEventListener("paste",e=>{const fs=[...(e.clipboardData?.files||[])];if(fs.length)addFiles(fs)});


const pick=(v,ok,f)=>ok.includes(v)?v:f;
function renderSummary(){
  const r=$("#aResult");if(r.hidden||!S.analysis)return;let box=$("#aSum");if(!box){box=document.createElement("div");box.id="aSum";r.append(box)}
  const lab=(list,k,v)=>{const e=list.find(x=>x[0]===k);return e?(e[2].find(x=>x[0]===v)||[,v])[1]:v},o=S.typ==="oberteil"?S.oberteil:S.typ==="kleid"?S.kleid.top:null,c=[];
  if(o){c.push("Passform: "+lab(TOP_OPTS,"passform",o.passform),"Ärmel: "+lab(TOP_OPTS,"aermel",o.aermel));if(o.kragen&&o.kragen!=="keiner"&&!o.kapuze)c.push(lab(TOP_OPTS,"kragen",o.kragen));else c.push("Ausschnitt: "+lab(TOP_OPTS,"ausschnitt",o.ausschnitt));
    if(o.verschluss!=="keiner")c.push(lab(TOP_OPTS,"verschluss",o.verschluss));for(const[k,t]of TOP_TOG)if(o[k])c.push(t)}
  if(S.typ==="kleid"||S.typ==="rock"||S.typ==="hose"||S.typ==="oberteil"){const lk=S[S.typ].lenKey,le=(LENS[S.typ].find(x=>x[0]===lk)||[,"eigene"])[1];c.push("Länge: "+le)}
  if(S.typ==="rock")c.push("Form: "+(FORM_OPTS.find(x=>x[0]===S.rock.form)||[,S.rock.form])[1]);
  if(S.typ==="hose")c.push("Bein: "+(LEG_OPTS.find(x=>x[0]===S.hose.bein)||[,S.hose.bein])[1],"Bundhöhe: "+(RISE_OPTS.find(x=>x[0]===(S.hose.leibhoehe||"normal"))||[,""])[1]);if(S.typ==="hose"){if(S.hose.seitentaschen)c.push("Seitentaschen");if(S.hose.taschen)c.push("Gesäßtaschen");if(S.hose.bindebaender)c.push("Bindebänder")}
  c.push(S.stoff==="jersey"?"Jersey":"Webware");
  box.innerHTML=`<span class="lbl">So setzt Fadenlauf es um</span><div class="chips">${c.map(t=>`<span>${esc(t)}</span>`).join("")}</div><p class="hint" style="margin:6px 0 0">Stimmt etwas nicht? Im Profi-Modus kannst du jede Option ändern.</p>`;
}
function applyAnalysis(a){
  const typ=pick(a.typ,["oberteil","kleid","rock","hose"],"oberteil");S.typ=typ;S.stoff=pick(a.stoff,["jersey","webware"],S.stoff);
  S.sa.seam=S.stoff==="jersey"?.75:1;S.sa.hem=S.stoff==="jersey"?2:2.5;
  const T=a.oberteil||{},applyTop=(o)=>{for(const[k,,opts]of TOP_OPTS)o[k]=pick(T[k],opts.map(x=>x[0]),o[k]);for(const[k]of TOP_TOG)if(typeof T[k]==="boolean")o[k]=T[k]};
  if(typ==="oberteil"){applyTop(S.oberteil);S.oberteil.lenKey=pick(T.laenge,LENS.oberteil.map(x=>x[0]),"huefte")}
  if(typ==="kleid"){applyTop(S.kleid.top);const K=a.kleid||{};S.kleid.taillennaht=!!K.taillennaht;S.kleid.lenKey=pick(K.laenge,LENS.kleid.map(x=>x[0]),"knie");if(a.rock)S.kleid.rock.form=pick(a.rock.form,FORM_OPTS.map(x=>x[0]),"a_linie")}
  if(typ==="rock"){const r=a.rock||{};S.rock.form=pick(r.form,FORM_OPTS.map(x=>x[0]),"a_linie");S.rock.bund=pick(r.bund,["fest","gummizug"],"fest");S.rock.taschen=!!r.taschen;S.rock.lenKey=pick(r.laenge,LENS.rock.map(x=>x[0]),"knie")}
  if(typ==="hose"){const h=a.hose||{};S.hose.bein=pick(h.bein,LEG_OPTS.map(x=>x[0]),"gerade");S.hose.bund=pick(h.bund,["fest","gummizug"],"gummizug");S.hose.leibhoehe=pick(h.leibhoehe,RISE_OPTS.map(x=>x[0]),"normal");S.hose.taschen=!!h.taschen;S.hose.seitentaschen=!!h.seitentaschen;S.hose.bindebaender=!!h.bindebaender;S.hose.lenKey=pick(h.laenge,LENS.hose.map(x=>x[0]),"lang")}
  S.title=typeof a.erkannt==="string"&&a.erkannt.trim()?a.erkannt.trim().slice(0,60):null;S.analysis={...a,typ};S.example=false;
  const r=$("#aResult");r.hidden=false;r.innerHTML="";
  const h=document.createElement("h3");h.textContent=S.title||"Erkannt";const p=document.createElement("p");p.style.margin="0";p.textContent=a.beschreibung||"";r.append(h,p);
  if(Array.isArray(a.merkmale)&&a.merkmale.length){const q=document.createElement("p");q.className="hint";q.style.margin="0";q.textContent="Gesehen: "+a.merkmale.slice(0,10).map(String).join(" · ");r.append(q)}
  if(Array.isArray(a.nicht_abgebildet)&&a.nicht_abgebildet.length){const l=document.createElement("span");l.className="lbl";l.textContent="Nicht im Grundschnitt enthalten";const ul=document.createElement("ul");a.nicht_abgebildet.slice(0,8).forEach(t=>{const li=document.createElement("li");li.textContent=String(t);ul.append(li)});r.append(l,ul)}
  touched();
}
const ERR={offline:"Keine Verbindung. Prüf dein Internet und versuch es noch einmal.",busy:"Claude ist gerade ausgelastet. Versuch es in einer Minute noch einmal.",quota:"Für heute sind alle Foto-Analysen verbraucht. Versuch es morgen wieder oder wähl das Modell von Hand.",not_configured:"Die Foto-Analyse ist auf diesem Server nicht eingerichtet.",invalid_request:"Die Anfrage war unvollständig. Lade das Foto noch einmal hoch.",not_granted:"Die Bildanalyse ist für diese Seite nicht freigegeben. Wähle das Modell in Schritt 2 von Hand.",sampling_disabled:"Claude ist für dieses Konto nicht verfügbar. Wähle das Modell in Schritt 2 von Hand.",rate_limited:"Gerade zu viele Anfragen. Versuch es in einer Minute noch einmal.",session_expired:"Bitte melde dich erneut bei Claude an.",image_rejected:"Dieses Bild konnte nicht verarbeitet werden. Nimm ein anderes JPEG oder PNG.",refused:"Zu diesem Bild gibt es keine Analyse. Versuch ein anderes Foto.",images_unavailable:"In dieser Ansicht können keine Bilder an Claude gehen. Wähle das Modell in Schritt 2 von Hand."};
let lastCancelled=false;
async function runAnalysis(hint){
  lastCancelled=false;const desc=descText();let withImg=canSendPhotos()&&photos.length>0;
  if(!sample||(!withImg&&!desc))return null;
  $("#stop").hidden=false;$("#analyze").disabled=true;$("#create").disabled=true;
  const t0=Date.now(),msg=()=>setStatus(`Claude sieht sich das Kleidungsstück an … ${Math.round((Date.now()-t0)/1000)} s`),tick=setInterval(msg,1000);msg();
  const run=()=>{ctl=new AbortController();return sample.analyze({images:withImg?photos.map(p=>p.blob):[],desc,hint,signal:ctl.signal})};
  try{let a;
    try{a=await run()}catch(e){if(e&&e.code==="images_unavailable"&&withImg){imgBlocked=true;showTextMode();if(!desc)throw e;withImg=false;a=await run()}else throw e}
    if(!a||typeof a!=="object"||a.fehler){setStatus(a&&a.fehler?`Kein Kleidungsstück erkannt: ${a.fehler}`:"Die Antwort war unvollständig. Versuch es noch einmal.",true);return null}
    a.__src=withImg?"foto":"text";return a}
  catch(e){const c=e&&e.code;
    if(c==="cancelled"){lastCancelled=true;setStatus("Abgebrochen.")}
    else if(c==="images_unavailable")setStatus("Diese Ansicht kann keine Fotos an Claude schicken. Beschreib das Kleidungsstück im Feld beim Foto oder wähl aus, was es ist.",true);
    else setStatus(ERR[c]||"Die Analyse ist fehlgeschlagen. Versuch es noch einmal.",true);
    if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(c)){sample=null;$("#descBox").hidden=true;setPState("none")}
    return null}
  finally{clearInterval(tick);$("#stop").hidden=true;$("#create").disabled=false;drawThumbs();buildEasy()}
}
$("#analyze").onclick=async()=>{
  if(!sample)return;if(!(canSendPhotos()&&photos.length)&&!descText()){showTextMode();$("#desc").focus();return}
  const a=await runAnalysis(null);if(a){applyAnalysis(a);S.source=a.__src;update();setStatus("Fertig. Prüf die Optionen in Schritt 2 und trag deine Maße ein.")}
};

/* ================= Einfacher Modus ================= */
const E={fit:null,len:null,kind:null,base:null};
const KINDS=[["tshirt","T-Shirt"],["pulli","Pulli / Hoodie"],["bluse","Bluse / Hemd"],["kleid","Kleid"],["rock","Rock"],["hose","Hose"]];
const KIND_HINT={tshirt:"ein T-Shirt",pulli:"ein Pullover oder Hoodie",bluse:"eine Bluse oder ein Hemd",kleid:"ein Kleid",rock:"ein Rock",hose:"eine Hose"};
function applyPreset(k){
  const t=topDefaults();S.title=null;S.analysis=null;S.source="preset";$("#aResult").hidden=true;
  if(k==="tshirt"){S.typ="oberteil";S.stoff="jersey";S.oberteil={...t,lenKey:"huefte",len:null}}
  if(k==="pulli"){S.typ="oberteil";S.stoff="jersey";S.oberteil={...t,passform:"locker",aermel:"lang",kapuze:true,taschen:true,buendchen:true,lenKey:"huefte",len:null}}
  if(k==="bluse"){S.typ="oberteil";S.stoff="webware";S.oberteil={...t,aermel:"lang",verschluss:"knopfleiste",kragen:"hemdkragen",manschetten:true,taschen:true,lenKey:"po",len:null}}
  if(k==="kleid"){S.typ="kleid";S.stoff="jersey";S.kleid={top:{...t,silhouette:"ausgestellt"},taillennaht:false,rock:{form:"a_linie"},lenKey:"knie",len:null}}
  if(k==="rock"){S.typ="rock";S.stoff="webware";S.rock={form:"a_linie",bund:"gummizug",taschen:false,lenKey:"knie",len:null}}
  if(k==="hose"){S.typ="hose";S.stoff="jersey";S.hose={bein:"gerade",bund:"gummizug",leibhoehe:"normal",taschen:false,seitentaschen:true,bindebaender:false,lenKey:"lang",len:null}}
  S.sa.seam=S.stoff==="jersey"?.75:1;S.sa.hem=S.stoff==="jersey"?2:2.5;
}
function applyKeyfacts(){
  if(!E.base||E.base.typ!==S.typ)return;const o=S[S.typ];Object.assign(o,JSON.parse(E.base.o));const f=E.fit;
  if(f){if(S.typ==="oberteil")o.passform=f;else if(S.typ==="kleid")o.top.passform=f;
    else if(S.typ==="hose"){if(o.bein!=="jogger")o.bein=f==="eng"?"eng":f==="normal"?"gerade":f==="locker"?"weit":"palazzo"}
    else if(S.typ==="rock"){if(f==="eng"&&["gerade","a_linie"].includes(o.form))o.form="bleistift";if((f==="locker"||f==="oversize")&&["bleistift","gerade","a_linie"].includes(o.form))o.form="ausgestellt";if(f==="normal"&&o.form==="bleistift")o.form="gerade"}}
  if(E.len){const keys=LENS[S.typ].map(x=>x[0]);let i=keys.indexOf(o.lenKey);if(i<0)i=1;o.lenKey=keys[Math.max(0,Math.min(keys.length-1,i+(E.len==="laenger"?1:-1)))]}
}
function buildEasy(){
  const chips=(id,opts,val,on)=>{const d=$(id);d.innerHTML="";for(const[v,t]of opts){const b=document.createElement("button");b.type="button";b.textContent=t;b.setAttribute("aria-pressed",String(v===val));b.onclick=()=>{on(v);buildEasy()};d.append(b)}};
  const live=()=>{if(!S.example&&E.base){applyKeyfacts();touched()}};
  chips("#eGroup",[["damen","Damen"],["herren","Herren"]],S.group,v=>{if(v===S.group)return;S.group=v;const ks=Object.keys(SIZES[v]);S.size=ks[Math.floor(ks.length/2)];S.m=sizeM(v,S.size);saveM();buildMeasures();update()});
  chips("#eSize",Object.keys(SIZES[S.group]).map(k=>[k,k]),S.size,v=>{S.size=v;S.m=sizeM(S.group,v);saveM();buildMeasures();update()});
  $("#eSizeHint").textContent=S.size==="eigene"?"Deine eigenen Maße aus dem Profi-Modus sind aktiv. Tipp eine Größe an, um sie zu ersetzen.":"Deutsche Konfektionsgröße. Eigene Körpermaße trägst du im Profi-Modus ein.";
  chips("#eFit",[[null,"Wie im Foto"],["eng","Eng"],["normal","Normal"],["locker","Locker"],["oversize","Oversize"]],E.fit,v=>{E.fit=v;live()});
  chips("#eLen",[["kuerzer","Kürzer"],[null,"Wie im Foto"],["laenger","Länger"]],E.len,v=>{E.len=v;live()});
  chips("#eKind",KINDS,E.kind,v=>{E.kind=E.kind===v?null:v});
  $("#eKindLbl").textContent=sample?"Was ist es? (optional, sonst erkennt Claude es)":"Was ist es?";
}
$("#create").onclick=async()=>{
  const photoOK=!!sample&&canSendPhotos()&&photos.length>0,desc=descText(),can=photoOK||(!!sample&&!!desc);
  const nudge=sel=>{const k=$(sel);k.classList.remove("nudge");void k.offsetWidth;k.classList.add("nudge")};
  if(photos.length&&!photoOK&&!desc&&!E.force){
    if(sample){setStatus("Dein Foto kann hier nicht ausgewertet werden. Beschreib das Kleidungsstück kurz im Feld beim Foto, z. B. „kariertes Hemd, locker, Hemdkragen, Brusttaschen, Manschetten“, und tipp noch einmal.",true);$("#descBox").hidden=false;$("#desc").focus();return}
    if(!E.kind){setStatus("Die Foto-Analyse ist gerade nicht erreichbar. Wähl bei „Was ist es?“ aus, was du nähen willst, dann bekommst du einen Standardschnitt.",true);nudge("#eKind");return}
  }
  if(!can&&!E.kind){setStatus("Lade ein Foto hoch oder wähl bei „Was ist es?“ aus, was du nähen willst.",true);nudge("#eKind");return}
  let a=null;if(can)a=await runAnalysis(E.kind?KIND_HINT[E.kind]:null);
  if(lastCancelled)return;
  if(a){applyAnalysis(a);S.source=a.__src}else if(E.kind&&!can){applyPreset(E.kind);S.source="preset"}else return;
  E.base={typ:S.typ,o:JSON.stringify(S[S.typ])};applyKeyfacts();S.example=false;touched();
  const kn=E.kind?KINDS.find(x=>x[0]===E.kind)[1]:"";
  setStatus(a?`Fertig: ${S.title||defaultTitle()} in ${sizeLabel()}, ${a.__src==="foto"?"aus deinem Foto":"aus deiner Beschreibung"}. Prüf oben beim Foto, was Claude erkannt hat.`:`Standardschnitt ${kn} in ${sizeLabel()}. ${photos.length?"Dein Foto wurde nicht ausgewertet.":""}`,!a&&photos.length>0);
  if(window.innerWidth<980)$("main").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
};

function setMode(m){MODE=m;$(".app").dataset.mode=m;try{localStorage.setItem("fadenlauf-modus",m)}catch(e){}
  document.querySelectorAll("#modeSeg button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===m)));
  const a4=$('#exports [data-x="a4"]');a4.textContent=m==="easy"?"Schnittmuster als PDF":"PDF A4";a4.classList.toggle("primary",m==="easy");
  for(const id of["#aStatus","#eStatus"])$(id).textContent="";buildEasy();buildControls();update()}
document.querySelectorAll("#modeSeg button").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

$("#desc").addEventListener("input",()=>drawThumbs());
$("#stop").onclick=()=>ctl&&ctl.abort();

/* ================= Export ================= */
const WIN=new Set([..."€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ"]);
const pdfTxt=s=>String(s).replace(/→/g,"->").replace(/↔/g,"<->").replace(/≈/g,"ca. ").replace(/[‐‑]/g,"-").replace(/[  ]/g," ").split("").filter(c=>c.charCodeAt(0)<256||WIN.has(c)).join("");
function clipSeg(a,b,r){let t0=0,t1=1;const dx=b[0]-a[0],dy=b[1]-a[1],p=[-dx,dx,-dy,dy],q=[a[0]-r.x0,r.x1-a[0],a[1]-r.y0,r.y1-a[1]];
  for(let i=0;i<4;i++){if(p[i]===0){if(q[i]<0)return null}else{const t=q[i]/p[i];if(p[i]<0){if(t>t1)return null;if(t>t0)t0=t}else{if(t<t0)return null;if(t<t1)t1=t}}}
  return[[a[0]+t0*dx,a[1]+t0*dy],[a[0]+t1*dx,a[1]+t1*dy],t0>0,t1<1]}
function clipRuns(pts,r){if(!r)return[pts];const runs=[];let cur=null;for(let i=1;i<pts.length;i++){const c=clipSeg(pts[i-1],pts[i],r);if(!c){if(cur){runs.push(cur);cur=null}continue}if(!cur||c[2]){if(cur)runs.push(cur);cur=[c[0]]}cur.push(c[1]);if(c[3]){runs.push(cur);cur=null}}if(cur)runs.push(cur);return runs}
const PDFSTY={cut:{w:.35,c:[20,20,20]},seam:{w:.2,c:[194,38,75],d:[2,1.4]},thin:{w:.18,c:[20,20,20]},dash:{w:.18,c:[20,20,20],d:[1.6,1.2]}};
function pdfSheet(doc,ox,oy,clip,sc=10){
  // ox,oy: mm-Position des Bogen-Ursprungs; clip: Rechteck in mm oder null
  const{G,lay}=last;
  G.forEach((g,i)=>{const[px,py]=lay.pos[i],tx=px-g.bb.x0,ty=py-g.bb.y0,T=p=>[ox+(p[0]+tx)*sc,oy+(p[1]+ty)*sc];
    const inClip=p=>!clip||(p[0]>=clip.x0+2&&p[0]<=clip.x1-2&&p[1]>=clip.y0+2&&p[1]<=clip.y1-2);
    for(const it of g.list){
      if(it.k==="poly"){const s=PDFSTY[it.st];doc.setLineWidth(s.w);doc.setDrawColor(...s.c);doc.setLineDashPattern(s.d||[],0);
        for(const run of clipRuns(it.pts.map(T),clip)){if(run.length<2)continue;const d=[];for(let j=1;j<run.length;j++)d.push([run[j][0]-run[j-1][0],run[j][1]-run[j-1][1]]);doc.lines(d,run[0][0],run[0][1],[1,1],"S",false)}}
      else if(it.k==="circle"){const c=T(it.at);if(inClip(c)){doc.setLineDashPattern([],0);doc.setLineWidth(.18);doc.circle(c[0],c[1],it.r*sc,"S")}}
      else if(it.k==="text"){const c=T(it.at);if(!inClip(c))continue;doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(40);const w=doc.getTextWidth(pdfTxt(it.str));
        if(it.rot)doc.text(pdfTxt(it.str),c[0]+1,c[1]+w/2,{angle:90});else doc.text(pdfTxt(it.str),c[0]-w/2,c[1]+1)}
      else if(it.k==="label"){const c=T(it.at);if(!inClip(c))continue;const sz={name:14,meta:10,small:8},lh=it.lines.map(l=>sz[l[1]]*.3528*1.35),tot=lh.reduce((a,b)=>a+b,0);let off=-tot/2;
        it.lines.forEach((l,j)=>{doc.setFont("helvetica",l[1]==="name"?"bold":"normal");doc.setFontSize(sz[l[1]]);doc.setTextColor(l[1]==="name"?20:80);const s=pdfTxt(l[0]),w=doc.getTextWidth(s);off+=lh[j]/2;const base=off+sz[l[1]]*.3528*.35;
          if(it.rot)doc.text(s,c[0]+base,c[1]+w/2,{angle:90});else doc.text(s,c[0]-w/2,c[1]+base);off+=lh[j]/2})}
    }});
  doc.setLineDashPattern([],0);doc.setTextColor(0);
}
function pdfPara(doc,txt,x,y,w,size,pg,style="normal"){doc.setFont("helvetica",style);doc.setFontSize(size);const ls=doc.splitTextToSize(pdfTxt(txt),w),lh=size*.3528*1.4;
  for(const l of ls){if(y>pg.h-14){doc.addPage(pg.fmt,"portrait");y=18}doc.text(l,x,y);y+=lh}return y}
async function makePDF(kind){
  const{jsPDF}=window.jspdf;const{lay,G,R}=last;const LW=lay.W*10,LH=lay.H*10;
  const pg=kind==="letter"?{fmt:"letter",w:215.9,h:279.4}:{fmt:"a4",w:210,h:297};
  const doc=new jsPDF({unit:"mm",format:pg.fmt,orientation:"portrait"});
  // Kachelraster
  const mg=10;let til=null;
  if(kind!=="plot"){const opts=[["portrait",pg.w,pg.h],["landscape",pg.h,pg.w]].map(([o,w,h])=>{const tw=w-2*mg,th=h-2*mg,c=Math.ceil(LW/tw),r=Math.ceil(LH/th);return{o,w,h,tw,th,c,r,n:c*r}});til=opts[0].n<=opts[1].n?opts[0]:opts[1];
    til.ox=(til.c*til.tw-LW)/2;til.oy=(til.r*til.th-LH)/2;til.used=[];
    for(let r=0;r<til.r;r++)for(let c=0;c<til.c;c++){const x0=c*til.tw-til.ox,y0=r*til.th-til.oy,x1=x0+til.tw,y1=y0+til.th;
      til.used.push(G.some((g,i)=>{const[px,py]=lay.pos[i],a=px*10,b=py*10,A=a+g.bb.w*10,B=b+g.bb.h*10;return A>x0&&a<x1&&B>y0&&b<y1}))}}
  // Deckblatt
  let y=20;doc.setFont("helvetica","bold");doc.setFontSize(20);doc.text(pdfTxt(last.title),15,y);y+=7;
  doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(90);doc.text(pdfTxt(`${TYPNAME[S.typ]} · ${sizeLabel()} · ${S.stoff==="jersey"?"Jersey":"Webware"} · Nahtzugabe ${fmt(S.sa.seam)} cm, Saum ${fmt(S.sa.hem)} cm · ${new Date().toLocaleDateString("de-DE")}`),15,y);doc.setTextColor(0);y+=4;
  let photoBottom=y;
  if(photos[0]){const p=photos[0],ar=p.h/p.w,w=ar>1.3?38:50,h=Math.min(62,w*ar);try{doc.addImage(p.thumb,"JPEG",pg.w-15-w,24,w,h);photoBottom=24+h}catch(e){}}
  // Testquadrat
  y+=6;doc.setLineWidth(.3);doc.rect(15,y,50,50);doc.setFontSize(9);doc.text("Testquadrat 5 × 5 cm",17,y+6);doc.setFontSize(7.5);doc.setTextColor(90);
  const ty=pdfPara(doc,"Mit 100 % bzw. „Tatsächliche Größe“ drucken, nicht „An Seite anpassen“. Danach nachmessen.",17,y+11,46,7.5,pg);doc.setTextColor(0);
  let x2=72,y2=y+4;doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text("Maße",x2,y2);y2+=5;doc.setFont("helvetica","normal");doc.setFontSize(8.5);
  MKEYS.forEach(([k,l],i)=>{const cx=x2+(i%2)*(i%2?48:0),cy=y2+Math.floor(i/2)*4.4;doc.text(pdfTxt(`${l}: ${fmt(S.m[k])} cm`),cx,cy)});
  y=Math.max(y+56,y2+Math.ceil(MKEYS.length/2)*4.4+4,photoBottom+6);
  // Zuschnitt
  doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("Zuschnitt",15,y);y+=5.5;doc.setFontSize(9);
  G.forEach(g=>{doc.setFont("helvetica","normal");doc.text(pdfTxt(g.p.name+(g.p.mat==="lining"?" (Futter)":"")),15,y);doc.text(pdfTxt(g.p.cut),80,y);y+=4.6});
  (last.strips||[]).forEach(t=>{doc.text(pdfTxt(`${t.name} (ohne Schnittteil: ${fmt(t.w)} × ${fmt(t.h)} cm)`),15,y);doc.text(pdfTxt(t.cut),80,y);y+=4.6});
  y+=1.5;doc.setFont("helvetica","bold");doc.text(pdfTxt(`Stoffverbrauch ca. ${fmt(last.F.len/100,2)} m bei ${fmt(S.fw)} cm Breite`+(last.F.rib?`, Bündchenware ca. ${last.F.rib} cm`:"")),15,y);y+=5.5;
  for(const t of last.extras)y=pdfPara(doc,"• "+t,15,y,pg.w-30,8.5,pg);
  y+=2;doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("Zutaten",15,y);y+=5;for(const t of last.notions)y=pdfPara(doc,"• "+t,15,y,pg.w-30,9,pg);
  // Übersicht
  if(til){y+=4;if(y>pg.h-70){doc.addPage(pg.fmt,"portrait");y=18}
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text(pdfTxt(`Seitenplan: ${til.used.filter(Boolean).length} Seiten ${pg.fmt.toUpperCase()} ${til.o==="portrait"?"hoch":"quer"}`),15,y);y+=3;
    const bw=pg.w-30,bh=Math.min(pg.h-y-30,110),s=Math.min(bw/(til.c*til.tw),bh/(til.r*til.th)),X0=15,Y0=y+2;
    doc.setLineWidth(.15);
    for(let r=0;r<til.r;r++)for(let c=0;c<til.c;c++){const u=til.used[r*til.c+c],x=X0+c*til.tw*s,yy=Y0+r*til.th*s;if(!u){doc.setFillColor(238,238,238);doc.rect(x,yy,til.tw*s,til.th*s,"F")}doc.setDrawColor(170);doc.rect(x,yy,til.tw*s,til.th*s);doc.setFontSize(7);doc.setTextColor(u?120:170);doc.text(String.fromCharCode(65+r)+(c+1),x+1.2,yy+3.2)}
    doc.setTextColor(0);doc.setDrawColor(20);
    G.forEach((g,i)=>{const[px,py]=lay.pos[i],pts=g.cut.map(p=>[X0+((p[0]-g.bb.x0+px)*10+til.ox)*s,Y0+((p[1]-g.bb.y0+py)*10+til.oy)*s]);pts.push(pts[0]);const d=[];for(let j=1;j<pts.length;j++)d.push([pts[j][0]-pts[j-1][0],pts[j][1]-pts[j-1][1]]);doc.setLineWidth(.25);doc.lines(d,pts[0][0],pts[0][1],[1,1],"S",false)});
    y=Y0+til.r*til.th*s+6;doc.setFontSize(8.5);doc.setTextColor(70);
    y=pdfPara(doc,"Graue Felder bleiben leer und werden nicht gedruckt. Bei jeder Seite den Rand rechts und unten an der Rahmenlinie abschneiden, Seiten nach den Feldnamen (A1, A2, …) aneinanderlegen und festkleben.",15,y,pg.w-30,8.5,pg);doc.setTextColor(0)}
  // Anleitung
  doc.addPage(pg.fmt,"portrait");y=20;doc.setFont("helvetica","bold");doc.setFontSize(14);doc.text("Nähanleitung",15,y);y+=8;
  last.steps.forEach((t,i)=>{y=pdfPara(doc,`${i+1}.  ${t}`,15,y,pg.w-30,10,pg)+2});
  y+=3;doc.setTextColor(90);pdfPara(doc,"Fadenlauf zeichnet einen Grundschnitt nach deinen Maßen. Nähe zuerst ein Probeteil aus günstigem Stoff und übertrage Änderungen auf den Papierschnitt.",15,y,pg.w-30,8.5,pg);doc.setTextColor(0);
  // Schnittbogen
  if(kind==="plot"){const W=LW+20,H=LH+28;doc.addPage([W,H],W>H?"landscape":"portrait");doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text(pdfTxt(`${last.title} · ${sizeLabel()} · Maßstab 1:1 · Bogen ${Math.round(lay.W)} × ${Math.round(lay.H)} cm`),10,8);
    doc.setLineWidth(.3);doc.rect(10,12,50,50);doc.setFontSize(8);doc.text("5 × 5 cm",12,17);pdfSheet(doc,10,16+0,null);}
  else{for(let r=0;r<til.r;r++)for(let c=0;c<til.c;c++){if(!til.used[r*til.c+c])continue;doc.addPage(pg.fmt,til.o);
    const x0=c*til.tw-til.ox,y0=r*til.th-til.oy,clip={x0:mg,y0:mg,x1:mg+til.tw,y1:mg+til.th},name=String.fromCharCode(65+r)+(c+1);
    doc.setFont("helvetica","bold");doc.setFontSize(90);doc.setTextColor(236);const w=doc.getTextWidth(name);doc.text(name,til.w/2-w/2,til.h/2+12);doc.setTextColor(0);
    doc.setLineWidth(.12);doc.setDrawColor(150);doc.setLineDashPattern([1,1],0);doc.rect(mg,mg,til.tw,til.th);doc.setLineDashPattern([],0);doc.setDrawColor(0);
    pdfSheet(doc,mg-x0,mg-y0,clip);
    doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(110);doc.text(pdfTxt(`${name} · ${last.title} · ${sizeLabel()}`),mg,mg-3);
    const nb=(rr,cc)=>rr>=0&&cc>=0&&rr<til.r&&cc<til.c&&til.used[rr*til.c+cc]?String.fromCharCode(65+rr)+(cc+1):null;
    const rt=nb(r,c+1),bt=nb(r+1,c);if(rt)doc.text(`-> ${rt}`,til.w-mg+1,til.h/2,{angle:90});if(bt){const t=`${bt}`;doc.text(t,til.w/2-doc.getTextWidth(t)/2,til.h-mg+5)}
    doc.setTextColor(0)}}
  return doc.output("blob");
}
function makeSVG(){
  const{G,lay}=last,M=2,W=lay.W+2*M,H=lay.H+2*M;
  const st={paper:"#ffffff",ink:"#141414",muted:"#555555",line:{cut:{c:"#141414",w:.035},seam:{c:"#c2264b",w:.022,d:"0.2 0.14"},thin:{c:"#141414",w:.018},dash:{c:"#141414",w:.018,d:"0.16 0.12"}},font:{name:.55,meta:.4,small:.3}};
  let s=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(2)}cm" height="${H.toFixed(2)}cm" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}"><title>${esc(last.title)} – ${esc(sizeLabel())} – Maßstab 1:1</title><rect width="100%" height="100%" fill="#fff"/>`;
  G.forEach((g,i)=>{const[ox,oy]=lay.pos[i];s+=svgList(g.list,ox+M-g.bb.x0,oy+M-g.bb.y0,st)});
  return s+"</svg>";
}
function saveFile(filename,data){
  const blob=data instanceof Blob?data:new Blob([data],{type:filename.endsWith(".svg")?"image/svg+xml":"application/octet-stream"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;a.rel="noopener";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
const slug=()=>(last.title||"schnitt").toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+(S.size!=="eigene"?"gr"+S.size:"eigene-masse");
document.querySelectorAll("#exports button").forEach(b=>b.onclick=async()=>{
  const k=b.dataset.x;b.disabled=true;
  try{let data,filename;
    if(k==="svg"){data=makeSVG();filename=slug()+".svg"}
    else{if(!window.jspdf)throw{code:"nolib"};data=await makePDF(k);filename=slug()+(k==="plot"?"-plotter":k==="letter"?"-letter":"-a4")+".pdf"}
    saveFile(filename,data);toast("Download gestartet.")}
  catch(e){const c=e&&e.code;if(c==="declined")toast("Download abgebrochen.");else if(c==="rate_limited")toast("Ein Download-Dialog ist schon offen.");else if(c==="nolib")toast("Die PDF-Bibliothek wurde nicht geladen. Nimm SVG 1:1.");else{toast("Der Download hat nicht geklappt.");console.error(e)}}
  finally{b.disabled=false}});

/* ================= Start ================= */
init3D();buildControls();buildMeasures();setMode(MODE);
async function checkAnalysis(){
  try{const r=await fetch("/api/health",{cache:"no-store"}),j=await r.json();
    if(j.analyze){sample=api;$("#descBox").hidden=false;setPState("ok")}
    else{sample=null;setPState("none")}}
  catch(e){sample=null;setPState("none")}
  drawThumbs();buildEasy();
}
checkAnalysis();addEventListener("online",checkAnalysis);addEventListener("offline",()=>{sample=null;setPState("none");drawThumbs();buildEasy()});

/* ================= App: Offline & Installation ================= */
if("serviceWorker" in navigator&&location.protocol!=="file:")addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
let installEvt=null;
addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;$("#install").hidden=false});
$("#install").onclick=async()=>{if(!installEvt)return;installEvt.prompt();await installEvt.userChoice.catch(()=>{});installEvt=null;$("#install").hidden=true};
addEventListener("appinstalled",()=>{$("#install").hidden=true});

window.__fl={makePDF,makeSVG,S,update,applyAnalysis,rotate3D:r=>{if(V.ok){V.root.rotation.y=r;kick()}},get last(){return last}};