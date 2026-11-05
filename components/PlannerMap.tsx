"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { PlannerPoint } from "@/lib/planner";
import type { Locale } from "@/lib/i18n";
import { OUTLINE, PROJ } from "@/lib/mongolia-map-data";

function arc(from: PlannerPoint, to: PlannerPoint): [number, number][] {
  const rad = Math.PI / 180;
  const a = [Math.cos(from.lat * rad) * Math.cos(from.lng * rad), Math.cos(from.lat * rad) * Math.sin(from.lng * rad), Math.sin(from.lat * rad)];
  const b = [Math.cos(to.lat * rad) * Math.cos(to.lng * rad), Math.cos(to.lat * rad) * Math.sin(to.lng * rad), Math.sin(to.lat * rad)];
  const angle = Math.acos(Math.min(1,Math.max(-1,a.reduce((sum,v,i) => sum+v*b[i],0))));
  if (Math.abs(Math.sin(angle)) < .00001) return [[from.lat,from.lng],[to.lat,to.lng]];
  return Array.from({length:65},(_,i) => { const t=i/64; const p=a.map((v,j)=>(Math.sin((1-t)*angle)*v+Math.sin(t*angle)*b[j])/Math.sin(angle)); return [Math.atan2(p[2],Math.hypot(p[0],p[1]))/rad, Math.atan2(p[1],p[0])/rad] as [number,number]; });
}

export default function PlannerMap({ from, to, active, onPick, onMove, places, onPlace, locale, label, loading, errorText }: {
  from: PlannerPoint; to: PlannerPoint | null; active: "from" | "to"; onPick: (lat: number, lng: number) => void;
  onMove: (target: "from" | "to", lat: number, lng: number) => void; places: PlannerPoint[]; onPlace: (point: PlannerPoint) => void;
  locale: Locale; label: string; loading: string; errorText: string;
}) {
  const element = useRef<HTMLDivElement>(null), wrapper = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | null>(null), layer = useRef<import("leaflet").LayerGroup | null>(null), tiles = useRef<import("leaflet").TileLayer | null>(null);
  const events = useRef({onPick,onMove,onPlace});
  const resizeFit = useRef<() => void>(() => {});
  const [ready,setReady] = useState(false), [failed,setFailed] = useState(false), [theme,setTheme] = useState<"satellite" | "map">("satellite"), [expanded,setExpanded] = useState(false);
  const mn=locale === "mn", text=(en:string,mongolian:string)=>mn?mongolian:en;
  useEffect(()=>{ events.current={onPick,onMove,onPlace}; },[onPick,onMove,onPlace]);
  useEffect(()=>{
    let disposed=false; let resize:ResizeObserver|undefined;
    void import("leaflet").then(({default:L})=>{
      if(disposed || !element.current)return;
      const m=L.map(element.current,{scrollWheelZoom:false,minZoom:2,zoomControl:false,worldCopyJump:true}).setView([47.4,103.6],5);
      map.current=m;
      const country: [number,number][] = [];
      for(let i=0;i<OUTLINE.length;i+=2)country.push([-(OUTLINE[i+1]/PROJ.s+PROJ.y0),(OUTLINE[i]/PROJ.s+PROJ.x0)/PROJ.k]);
      L.polygon(country,{color:"#f6e5c2",weight:1,opacity:.6,fillColor:"#f6e5c2",fillOpacity:.025,interactive:false}).addTo(m);
      L.control.zoom({position:"bottomright"}).addTo(m); layer.current=L.layerGroup().addTo(m);
      L.control.scale({position:"bottomleft",imperial:false,maxWidth:100}).addTo(m);
      m.on("click",e=>{const p=e.latlng.wrap();events.current.onPick(p.lat,p.lng);});
      resize=new ResizeObserver(()=>{m.invalidateSize();if(element.current?.clientWidth)resizeFit.current();});resize.observe(element.current);setReady(true);
    }).catch(()=>setFailed(true));
    return()=>{disposed=true;resize?.disconnect();map.current?.remove();map.current=null;layer.current=null;tiles.current=null;};
  },[]);
  useEffect(()=>{
    if(!ready)return;let disposed=false;setFailed(false);
    void import("leaflet").then(({default:L})=>{
      const m=map.current;if(disposed||!m)return;if(tiles.current)m.removeLayer(tiles.current);
      const url=theme === "satellite" ? process.env.NEXT_PUBLIC_SATELLITE_TILE_URL || "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" : process.env.NEXT_PUBLIC_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
      const attribution=theme === "satellite" ? process.env.NEXT_PUBLIC_SATELLITE_ATTRIBUTION || 'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics &amp; GIS User Community' : process.env.NEXT_PUBLIC_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
      tiles.current=L.tileLayer(url,{attribution,maxZoom:18,className:`atlas-tiles atlas-tiles--${theme}`}).on("tileerror",()=>setFailed(true)).addTo(m);
    });return()=>{disposed=true;};
  },[ready,theme]);
  function fit() {
    void import("leaflet").then(({default:L})=>{const m=map.current;if(!m)return;
      const mobile=window.matchMedia("(max-width: 760px)").matches;
      if(to)m.fitBounds(L.latLngBounds([[from.lat,from.lng],[to.lat,to.lng]]),{paddingTopLeft:[mobile?35:90,mobile?115:145],paddingBottomRight:[mobile?45:85,mobile?190:200],maxZoom:10,animate:false});
      else m.setView([47.4,103.6],5,{animate:false});
    });
  }
  useEffect(()=>{resizeFit.current=fit;});
  useEffect(()=>{
    if(!ready)return;let disposed=false;
    void import("leaflet").then(({default:L})=>{
      const m=map.current,group=layer.current;if(disposed||!m||!group)return;group.clearLayers();
      if(!to)places.filter(p=>p.id!==from.id).forEach(p=>{
        const marker=L.circleMarker([p.lat,p.lng],{radius:5,color:"#fff6df",fillColor:"#ddb690",fillOpacity:1,weight:1,bubblingMouseEvents:false});
        const title=document.createElement("span");title.textContent=p.name;
        marker.bindTooltip(title,{permanent:true,direction:"top",className:"atlas-place-tooltip",offset:[0,-7]}).on("click",()=>events.current.onPlace(p)).addTo(group);
      });
      for(const [point,target,index] of [[from,"from",0],[to,"to",1]] as const){
        if(!point)continue;
        const marker=L.marker([point.lat,point.lng],{draggable:true,autoPan:true,title:target === "from" ? text("Departure · drag to move","Эхлэх цэг · чирж өөрчлөх") : text("Destination · drag to move","Очих цэг · чирж өөрчлөх"),icon:L.divIcon({className:`atlas-map-marker${target===active?" is-active":""}`,html:`<span>${index===0?"A":"B"}</span>`,iconSize:[38,38],iconAnchor:[19,19]})});
        const title=document.createElement("span");title.textContent=point.id.startsWith("custom-")?text("Your selected point","Таны сонгосон цэг"):point.name;
        marker.bindTooltip(title,{permanent:true,direction:"bottom",className:"atlas-endpoint-tooltip",offset:[0,24]});
        marker.on("dragend",()=>{const p=marker.getLatLng().wrap();events.current.onMove(target,p.lat,p.lng);});marker.addTo(group);
      }
      if(to){const points=arc(from,to);L.polyline(points,{color:"#ffffff",weight:6,opacity:.15,interactive:false}).addTo(group);L.polyline(points,{color:"#f0c7a1",weight:2.5,opacity:1,className:"atlas-flight-path",dashArray:"6 9",interactive:false}).addTo(group);
        L.marker(points[32],{interactive:false,keyboard:false,alt:"",icon:L.divIcon({className:"atlas-route-aircraft",html:'<svg viewBox="0 0 32 32" fill="none"><path d="M4 12h24M16 5v5m-5 7c0-5 10-5 10 0v4H11zm5 4v6m-6 0h12M8 8h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',iconSize:[36,36],iconAnchor:[18,18]})}).addTo(group);
      }
      // Selecting a point frames the route; highlighting a target must not reset a user's map view.
    });return()=>{disposed=true;};
  },[from,to,active,ready,places,locale]);
  useEffect(()=>{if(ready)fit();},[from,to,ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==="Escape")setExpanded(false);};document.addEventListener("keydown",escape);return()=>document.removeEventListener("keydown",escape);},[]);
  return <div ref={wrapper} className={`atlas-map-shell atlas-map-shell--${theme}${expanded?" is-expanded":""}`}>
    <div ref={element} className="atlas-map" role="region" aria-label={label}/>
    <div className="atlas-map-shade" aria-hidden="true"/>
    <div className="atlas-map-controls"><div role="group" aria-label={text("Map style","Газрын зургийн төрөл")}><button type="button" aria-pressed={theme==="satellite"} onClick={()=>setTheme("satellite")}>{text("Satellite","Хиймэл дагуул")}</button><button type="button" aria-pressed={theme==="map"} onClick={()=>setTheme("map")}>{text("Map","Газрын зураг")}</button></div><button type="button" onClick={fit} aria-label={text("Fit journey to map","Чиглэлээ бүхэлд нь харах")} title={text("Fit journey to map","Чиглэлээ бүхэлд нь харах")}>⌖</button><button type="button" onClick={()=>setExpanded(!expanded)} aria-label={expanded?text("Close expanded map","Томруулсан зураг хаах"):text("Expand map","Зураг дэлгэх")} aria-pressed={expanded}>{expanded?"×":"⤢"}</button></div>
    <div className="atlas-map-instruction"><span className="atlas-map-target">{active==="from"?"A":"B"}</span><span>{text("Tap to place your","Зураг дээр дарж")} <b>{active==="from"?text("departure","эхлэх цэгээ"):text("destination","очих цэгээ")}</b>{mn?" сонгоорой":""}</span><small>{text("Drag pins to fine-tune","Цэгийг чирж өөрчилж болно")}</small></div>
    {!ready&&<p className="atlas-map-status" role="status">{failed?errorText:loading}</p>}
    {ready&&failed&&<p className="atlas-map-error" role="status">{errorText}</p>}
  </div>;
}
