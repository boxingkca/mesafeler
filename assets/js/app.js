"use strict";

const PALETTE=["#ffb020","#2dd4bf","#ff5a3c","#a78bfa","#38bdf8","#f472b6","#84cc16","#fb923c"];
const PACES=[4,4.5,5,5.5,6];
const LSKEY="ym_state_v1";
let routes=[], activeId=null, seq=0, pace=5, locDot=null;

const CFG=window.MESAFELER_CONFIG||{};
const map=L.map("map",{zoomControl:false}).setView(CFG.defaultCenter||[41.0082,28.9784],CFG.defaultZoom||15);
L.control.zoom({position:"bottomright"}).addTo(map);

// ---- basemaps ----
// CARTO, basemaps.cartocdn.com altındaki tüm karolar için ücretsiz bir API anahtarı ister
// (anahtarsız karolara "API KEY REQUIRED" filigranı basar). Bu yüzden:
//   - config.js içinde cartoKey doluysa Renkli/Açık/Koyu CARTO'dan gelir,
//   - boşsa aynı üç katman anahtarsız Esri karolarından gelir.
const A_OSM='© OpenStreetMap', A_CARTO='© OpenStreetMap contributors, © CARTO', A_ESRI='Tiles © Esri';
const CARTO_KEY=String(CFG.cartoKey||"").trim();
const carto=(path)=>L.tileLayer("https://{s}.basemaps.cartocdn.com/"+path+"/{z}/{x}/{y}{r}.png?key="+encodeURIComponent(CARTO_KEY),
  {maxZoom:20,subdomains:"abcd",attribution:A_CARTO});
// maxNativeZoom: Esri'nin gerçek karo derinliği; daha yakın zoom'da karo büyütülür, harita boşalmaz
const esri=(svc,nat,attr)=>L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/"+svc+"/MapServer/tile/{z}/{y}/{x}",
  {maxZoom:19,maxNativeZoom:nat,attribution:attr===undefined?A_ESRI:attr});
const BASEMAPS={
  detay:{label:"Detay",layers:[L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:A_OSM})]},
  renkli:{label:"Renkli",layers:CARTO_KEY?[carto("rastertiles/voyager")]:[esri("World_Street_Map",19)]},
  acik:{label:"Açık",layers:CARTO_KEY?[carto("light_all")]:[esri("Canvas/World_Light_Gray_Base",16),esri("Canvas/World_Light_Gray_Reference",16,"")]},
  koyu:{label:"Koyu",layers:CARTO_KEY?[carto("dark_all")]:[esri("Canvas/World_Dark_Gray_Base",16),esri("Canvas/World_Dark_Gray_Reference",16,"")]},
  uydu:{label:"Uydu",layers:[esri("World_Imagery",19),esri("Reference/World_Boundaries_and_Places",19,"")]},
};
let baseKey=null;
function setBasemap(key){
  if(baseKey===key)return;
  if(baseKey) BASEMAPS[baseKey].layers.forEach(l=>map.removeLayer(l));
  BASEMAPS[key].layers.forEach(l=>l.addTo(map));
  baseKey=key;
  document.querySelectorAll(".pill").forEach(p=>p.classList.toggle("on",p.dataset.k===key));
}
(function(){ const box=document.getElementById("layers");
  Object.entries(BASEMAPS).forEach(([k,v])=>{ const b=document.createElement("button");
    b.className="pill"; b.dataset.k=k; b.textContent=v.label; b.onclick=()=>{setBasemap(k);persist();}; box.appendChild(b); });
})();
setBasemap("detay");

// ---- helpers ----
const $=s=>document.querySelector(s);
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),2200); }
function haversine(a,b){
  const R=6371000,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180;
  const la1=a.lat*Math.PI/180,la2=b.lat*Math.PI/180;
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function fmt(m){ if(m<1000) return [Math.round(m).toString(),"m"]; return [(m/1000).toFixed(2),"km"]; }
function fmtStr(m){ const [v,u]=fmt(m); return v+" "+u; }
function durText(m){
  if(m<1) return "~0 dk";
  const mins=Math.round(m/(pace*1000/60));
  if(mins<1) return "<1 dk";
  if(mins<60) return "~"+mins+" dk";
  const h=Math.floor(mins/60), mm=mins%60;
  return mm? "~"+h+" sa "+mm+" dk" : "~"+h+" sa";
}
function escapeXml(s){ return (s||"").replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c])); }
const active=()=>routes.find(r=>r.id===activeId);

function decodePolyline(str,precision){
  let index=0,lat=0,lng=0,coords=[],factor=Math.pow(10,precision||6);
  while(index<str.length){
    let b,shift=0,result=0;
    do{ b=str.charCodeAt(index++)-63; result|=(b&0x1f)<<shift; shift+=5; }while(b>=0x20);
    lat += (result&1)?~(result>>1):(result>>1); shift=0; result=0;
    do{ b=str.charCodeAt(index++)-63; result|=(b&0x1f)<<shift; shift+=5; }while(b>=0x20);
    lng += (result&1)?~(result>>1):(result>>1);
    coords.push([lat/factor,lng/factor]);
  } return coords;
}
function encPoly(coords,precision){
  const factor=Math.pow(10,precision||5); let out="",pLat=0,pLng=0;
  const enc=num=>{ num=num<0?~(num<<1):(num<<1); let s=""; while(num>=0x20){ s+=String.fromCharCode((0x20|(num&0x1f))+63); num=Math.floor(num/32);} s+=String.fromCharCode(num+63); return s; };
  coords.forEach(c=>{ const la=Math.round(c[0]*factor),ln=Math.round(c[1]*factor); out+=enc(la-pLat)+enc(ln-pLng); pLat=la; pLng=ln; });
  return out;
}

// ---- persistence ----
let persistTimer=null;
function persistNow(){
  try{ localStorage.setItem(LSKEY,JSON.stringify({v:1,pace,base:baseKey,
    r:routes.map(r=>({n:r.name,c:r.color,s:r.snap,p:r.pts,sl:r.snappedLen,lg:r.legs}))})); }catch(_){}
}
function persist(){ clearTimeout(persistTimer); persistTimer=setTimeout(persistNow,300); }
// Sekme kapanırken / arka plana giderken bekleyen kaydı hemen yaz
addEventListener("pagehide",()=>{ clearTimeout(persistTimer); persistNow(); });
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden"){ clearTimeout(persistTimer); persistNow(); } });

// ---- route lifecycle ----
function makeRoute(o){
  const color=o.color||PALETTE[routes.length%PALETTE.length];
  const r={id:++seq,name:o.name||("Rota "+(routes.length+1)),color,pts:o.pts||[],
    snap:!!o.snap,polyline:L.polyline([],{color,weight:4,opacity:.9}).addTo(map),
    markers:[],snappedLen:o.snappedLen??null,legs:o.legs??null,snapGeom:null};
  routes.push(r); rebuildMarkers(r); drawLine(r);
  if(r.snap && r.pts.length>=2) snapRoute(r);
  return r;
}
function newRoute(){ const r=makeRoute({}); activeId=r.id; renderAll(); persist(); }
function delRoute(id){
  const r=routes.find(x=>x.id===id); if(!r)return;
  map.removeLayer(r.polyline); r.markers.forEach(m=>map.removeLayer(m));
  routes=routes.filter(x=>x.id!==id);
  if(!routes.length){ newRoute(); return; }
  if(activeId===id) activeId=routes[routes.length-1].id;
  renderAll(); persist();
}
function numIcon(n,color){ return L.divIcon({className:"numico",iconSize:[22,22],iconAnchor:[11,11],html:'<div style="background:'+color+'">'+n+'</div>'}); }
function addPoint(latlng){ const r=active(); if(!r)return; r.pts.push({lat:latlng.lat,lng:latlng.lng}); rebuildMarkers(r); refresh(r); }
function rebuildMarkers(r){
  r.markers.forEach(m=>map.removeLayer(m)); r.markers=[];
  r.pts.forEach((p,i)=>{
    const m=L.marker([p.lat,p.lng],{icon:numIcon(i+1,r.color),draggable:true,autoPan:true}).addTo(map);
    m.on("drag",e=>{ r.pts[i]={lat:e.latlng.lat,lng:e.latlng.lng}; drawLine(r); });
    m.on("dragend",()=>refresh(r));
    r.markers.push(m);
  });
}
function drawLine(r){ if(r.snap && r.snapGeom) r.polyline.setLatLngs(r.snapGeom); else r.polyline.setLatLngs(r.pts.map(p=>[p.lat,p.lng])); }
function straightData(r){ let total=0; const segs=[]; for(let i=1;i<r.pts.length;i++){ const d=haversine(r.pts[i-1],r.pts[i]); total+=d; segs.push({d,run:total}); } return {total,segs}; }
async function snapRoute(r){
  if(r.pts.length<2){ r.snapGeom=null; r.snappedLen=null; r.legs=null; drawLine(r); return; }
  const token=Symbol(); r._token=token;
  try{
    const body={locations:r.pts.map(p=>({lat:p.lat,lon:p.lng})),costing:"pedestrian",directions_options:{units:"kilometers"}};
    const res=await fetch("https://valhalla1.openstreetmap.de/route",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!res.ok) throw new Error("http");
    const j=await res.json(); if(r._token!==token) return;
    let geom=[]; const legs=[];
    (j.trip.legs||[]).forEach(l=>{ geom=geom.concat(decodePolyline(l.shape,6)); legs.push(l.summary.length*1000); });
    r.snapGeom=geom; r.snappedLen=j.trip.summary.length*1000; r.legs=legs;
    drawLine(r); renderPanel(); renderRoutes(); persist();
  }catch(e){
    if(r._token!==token) return;
    r.snap=false; r.snapGeom=null; r.snappedLen=null; r.legs=null; drawLine(r);
    renderPanel(); renderRoutes(); persist(); toast("Yol servisine ulaşılamadı, düz çizgi kullanılıyor.");
  }
}
function refresh(r){ drawLine(r); if(r.snap) snapRoute(r); renderPanel(); renderRoutes(); persist(); }
function routeTotal(r){ if(r.snap && r.snappedLen!=null) return r.snappedLen; return straightData(r).total; }
// Panelin kapladığı alanı hesaba katan sığdırma payı (masaüstü: sol sütun, mobil: üst panel)
const isMobile=()=>innerWidth<=480;
function fitPad(){
  if(isMobile()){
    const ph=document.querySelector("#panel").offsetHeight;
    return {paddingTopLeft:[24,Math.min(ph+16,innerHeight*.62)],paddingBottomRight:[24,24]};
  }
  return {paddingTopLeft:[350,40],paddingBottomRight:[40,40]};
}
function flyToRoute(r){
  if(!r.pts.length)return;
  if(r.pts.length===1){ map.setView([r.pts[0].lat,r.pts[0].lng],17); return; }
  map.fitBounds(L.latLngBounds(r.pts.map(p=>[p.lat,p.lng])),{...fitPad(),maxZoom:18});
}

// ---- render ----
function renderPanel(){
  const r=active(); if(!r)return;
  $("#actDot").style.background=r.color; $("#actName").textContent=r.name;
  $("#snap").classList.toggle("on",r.snap);
  const total=routeTotal(r); const [v,u]=fmt(total);
  $("#distVal").textContent=v; $("#distUnit").textContent=u;
  $("#headDist").textContent=fmtStr(total);
  $("#durVal").textContent=durText(total);
  $("#paceBtn").textContent=pace.toFixed(1);
  const n=r.pts.length;
  $("#ptCount").textContent = n===0?"Haritaya tıklayarak başla" : n===1?"1 nokta • bir nokta daha ekle"
    : n+" nokta • "+(n-1)+" bölüm"+(r.snap?(r.snappedLen!=null?" • yola oturtuldu":" • yola oturtuluyor…"):"");
  const box=$("#segs");
  if(n<2){ box.innerHTML='<div class="empty">Ardışık marker\'lar arası mesafe ve toplam burada listelenir.</div>'; $("#segTotal").textContent=""; }
  else{
    let rows="",run=0;
    if(r.snap && r.legs){ r.legs.forEach((d,i)=>{ run+=d; rows+=segRow(i+1,d,run); }); }
    else{ straightData(r).segs.forEach((s,i)=>rows+=segRow(i+1,s.d,s.run)); }
    box.innerHTML=rows; $("#segTotal").textContent=fmtStr(total);
  }
  $("#undoBtn").disabled=n===0; $("#clearBtn").disabled=n===0;
}
function segRow(i,d,run){ return '<div class="seg"><span class="n mono">'+i+'→'+(i+1)+'</span><span><span class="d mono">'+fmtStr(d)+'</span><span class="run mono">Σ '+fmtStr(run)+'</span></span></div>'; }

function renderRoutes(){
  const list=$("#routeList"); list.innerHTML="";
  const measured=routes.filter(r=>r.pts.length>=2);
  const baseline=measured.length>=2?Math.min(...measured.map(routeTotal)):null;
  routes.forEach(r=>{
    const div=document.createElement("div");
    div.className="rrow"+(r.id===activeId?" active":"");
    const t=routeTotal(r);
    let meta=(r.pts.length?'<span class="rd mono">'+fmtStr(t)+'</span>':'<span class="rd" style="color:var(--faint)">boş</span>');
    if(baseline!=null && r.pts.length>=2){
      if(Math.abs(t-baseline)<0.5){ meta+='<span class="rmin">en kısa</span>'; }
      else{ const dd=t-baseline, pct=Math.round(dd/baseline*100);
        meta+='<span class="rdelta" title="En kısa rotadan '+fmtStr(dd)+' (%'+pct+') daha uzun">+'+fmtStr(dd)+' · %'+pct+'</span>'; }
    }
    div.innerHTML='<span class="dot" style="background:'+r.color+'"></span>'+
      '<span class="rn"><input value="'+r.name.replace(/"/g,'&quot;')+'" spellcheck="false"/></span>'+
      '<span class="rmeta">'+meta+'</span><span class="rx" title="Sil">×</span>';
    div.addEventListener("click",e=>{
      if(e.target.classList.contains("rx")){ delRoute(r.id); return; }
      if(e.target.tagName==="INPUT") return;
      activeId=r.id; renderAll(); flyToRoute(r);
    });
    const inp=div.querySelector("input");
    inp.addEventListener("input",()=>{ r.name=inp.value||"Rota"; if(r.id===activeId)$("#actName").textContent=r.name; persist(); });
    inp.addEventListener("click",e=>e.stopPropagation());
    list.appendChild(div);
  });
}
function renderAll(){ renderPanel(); renderRoutes(); }

// ---- events ----
map.on("click",e=>{ hideResults(); if(isMobile()) $("#panel").classList.add("collapsed"); addPoint(e.latlng); });
$("#collapseBtn").addEventListener("click",()=>$("#panel").classList.toggle("collapsed"));
$("#snap").addEventListener("click",()=>{
  const r=active(); r.snap=!r.snap;
  if(r.snap){ if(r.pts.length>=2){toast("Yürüyüş yollarına oturtuluyor…"); snapRoute(r);} }
  else { r.snapGeom=null; drawLine(r); }
  renderPanel(); renderRoutes(); persist();
});
$("#paceBtn").addEventListener("click",()=>{ const i=PACES.indexOf(pace); pace=PACES[(i+1)%PACES.length]; renderPanel(); persist(); });
$("#undoBtn").addEventListener("click",undo);
function undo(){ const r=active(); if(!r||!r.pts.length)return; r.pts.pop(); rebuildMarkers(r); refresh(r); }
$("#clearBtn").addEventListener("click",()=>{
  const r=active(); r.pts=[]; r.snapGeom=null; r.snappedLen=null; r.legs=null;
  rebuildMarkers(r); drawLine(r); renderPanel(); renderRoutes(); persist();
});
$("#addRoute").addEventListener("click",newRoute);
$("#shareBtn").addEventListener("click",shareLink);
$("#gpxBtn").addEventListener("click",exportGPX);
document.addEventListener("keydown",e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="z"){ e.preventDefault(); undo(); }
  if(e.key==="Backspace" && document.activeElement.tagName!=="INPUT"){ e.preventDefault(); undo(); }
  if(e.key==="Escape") hideResults();
});
$("#locBtn").addEventListener("click",()=>{
  if(!navigator.geolocation){ toast("Konum desteklenmiyor."); return; }
  toast("Konum alınıyor…");
  navigator.geolocation.getCurrentPosition(p=>{
    const ll=[p.coords.latitude,p.coords.longitude]; map.setView(ll,17);
    if(locDot) locDot.setLatLng(ll); else locDot=L.circleMarker(ll,{radius:7,color:"#fff",weight:2,fillColor:"#3b82f6",fillOpacity:1}).addTo(map);
  },()=>toast("Konuma erişilemedi."),{enableHighAccuracy:true,timeout:8000});
});

// ---- share ----
function shareLink(){
  const withPts=routes.filter(r=>r.pts.length);
  if(!withPts.length){ toast("Önce rota çiz."); return; }
  const d={v:1,r:withPts.map(r=>({n:encodeURIComponent(r.name),c:r.color,s:r.snap?1:0,p:encPoly(r.pts.map(p=>[p.lat,p.lng]),5)}))};
  const b64=btoa(unescape(encodeURIComponent(JSON.stringify(d))));
  const url=location.origin+location.pathname+"#s="+b64;
  const fallback=()=>{ try{ history.replaceState(null,"","#s="+b64); }catch(_){} toast("Bağlantı adres çubuğunda, oradan kopyala"); };
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(()=>toast("Bağlantı kopyalandı ✓")).catch(fallback);
  }else fallback();
}

// ---- GPX export ----
function exportGPX(){
  const r=active(); if(!r||r.pts.length<1){ toast("Önce rota çiz."); return; }
  const coords=(r.snap && r.snapGeom && r.snapGeom.length)? r.snapGeom : r.pts.map(p=>[p.lat,p.lng]);
  const now=new Date().toISOString();
  let g='<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Yuruyus Mesafesi" xmlns="http://www.topografix.com/GPX/1/1">\n';
  g+='<metadata><name>'+escapeXml(r.name)+'</name><time>'+now+'</time></metadata>\n';
  r.pts.forEach((p,i)=>{ g+='<wpt lat="'+p.lat+'" lon="'+p.lng+'"><name>'+(i+1)+'</name></wpt>\n'; });
  g+='<trk><name>'+escapeXml(r.name)+'</name><trkseg>\n';
  coords.forEach(c=>{ g+='<trkpt lat="'+c[0]+'" lon="'+c[1]+'"></trkpt>\n'; });
  g+='</trkseg></trk>\n</gpx>\n';
  const blob=new Blob([g],{type:"application/gpx+xml"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=(r.name||"rota").replace(/[^0-9A-Za-z._-]+/g,"_")+".gpx";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  toast("GPX indirildi");
}

// ---- search ----
// Nominatim kullanım politikası yazarken otomatik tamamlamaya izin vermez: yalnızca Enter ile arar.
const qEl=$("#q"), resEl=$("#results");
function hideResults(){ resEl.classList.remove("show"); resEl.innerHTML=""; }
async function runSearch(q){
  const b=map.getBounds(), vb=[b.getWest(),b.getNorth(),b.getEast(),b.getSouth()].join(",");
  const url="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=tr&accept-language=tr&addressdetails=1&dedupe=1&viewbox="+vb+"&bounded=0&q="+encodeURIComponent(q);
  return (await fetch(url)).json();
}
function showResults(items){
  if(!items.length){ resEl.innerHTML='<div class="res"><div class="r1" style="color:var(--faint)">Sonuç bulunamadı</div></div>'; resEl.classList.add("show"); return; }
  resEl.innerHTML="";
  items.forEach(it=>{
    const parts=(it.display_name||"").split(", "), main=it.name||parts[0]||"";
    const sub=parts.slice(main===parts[0]?1:0).slice(0,4).join(", ");
    const d=document.createElement("div"); d.className="res";
    d.innerHTML='<div class="r1">'+main+'</div><div class="r2">'+sub+'</div>';
    d.onclick=()=>{ hideResults(); qEl.value=main;
      if(it.boundingbox){ const bb=it.boundingbox.map(Number);
        map.fitBounds([[bb[0],bb[2]],[bb[1],bb[3]]],{...fitPad(),maxZoom:17});
      }else map.setView([+it.lat,+it.lon],16); };
    resEl.appendChild(d);
  });
  resEl.classList.add("show");
}
qEl.addEventListener("keydown",async e=>{
  if(e.key!=="Enter")return; const q=qEl.value.trim(); if(q.length<2)return;
  try{ showResults(await runSearch(q)); }catch(_){ toast("Arama başarısız."); }
});
document.addEventListener("click",e=>{ if(!e.target.closest(".qwrap")) hideResults(); });

// ---- init / load ----
// Kayıtlı rotalar önce yüklenir. Paylaşılan bağlantıdaki rotalar bunların YANINA eklenir;
// aynı noktalara sahip rota zaten varsa tekrar eklenmez. Böylece link açmak kayıtları ezmez.
function routeKey(pts){ return encPoly(pts.map(p=>[p.lat,p.lng]),5); }
function loadStored(){
  try{ const raw=localStorage.getItem(LSKEY); if(!raw) return false;
    const d=JSON.parse(raw); if(d.pace)pace=d.pace; if(d.base&&BASEMAPS[d.base])setBasemap(d.base);
    if(d.r&&d.r.length){ d.r.forEach(x=>makeRoute({name:x.n,color:x.c,snap:!!x.s,pts:x.p||[],snappedLen:x.sl,legs:x.lg}));
      activeId=routes[0].id; return true; }
  }catch(_){}
  return false;
}
function loadShared(){
  const h=location.hash||""; const idx=h.indexOf("s="); if(idx<0) return 0;
  let added=[];
  try{
    const d=JSON.parse(decodeURIComponent(escape(atob(h.slice(idx+2)))));
    const known=new Set(routes.filter(r=>r.pts.length).map(r=>routeKey(r.pts)));
    (d.r||[]).forEach(x=>{
      const pts=decodePolyline(x.p,5).map(c=>({lat:c[0],lng:c[1]}));
      if(!pts.length||known.has(routeKey(pts))) return;
      let nm=decodeURIComponent(x.n); if(!/\(paylaşılan\)$/.test(nm)) nm+=" (paylaşılan)";
      added.push(makeRoute({name:nm,color:x.c,snap:!!x.s,pts}));
    });
  }catch(_){}
  try{ history.replaceState(null,"",location.pathname+location.search); }catch(_){}
  if(added.length){
    activeId=added[0].id; flyToRoute(added[0]);
    toast(added.length===1?"Paylaşılan rota eklendi":added.length+" paylaşılan rota eklendi");
    persist();
  }
  return added.length;
}
loadStored();
loadShared();
if(!routes.length) newRoute();
renderAll();
// Uygulama açıkken adres çubuğuna paylaşım linki yapıştırılırsa sayfa yenilenmez; bunu yakala
addEventListener("hashchange",()=>{ if(loadShared()) renderAll(); });
