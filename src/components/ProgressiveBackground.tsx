"use client";
import{useEffect,useState}from"react";
export default function ProgressiveBackground({src,className="",children}:{src:string|null;className?:string;children?:React.ReactNode}){const[loadedSrc,setLoadedSrc]=useState<string|null>(null);useEffect(()=>{if(!src)return;const img=new Image();img.onload=()=>setLoadedSrc(src);img.src=src;return()=>{img.onload=null}},[src]);const loaded=!!src&&loadedSrc===src;return <div className={`${className} progressive-photo ${loaded?"is-loaded":"is-loading"}`} style={loaded?{backgroundImage:`url("${src}")`}:undefined}>{children}</div>}
