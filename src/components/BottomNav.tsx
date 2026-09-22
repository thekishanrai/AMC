"use client";
import { IconMap2, IconSparkles, IconUserCircle } from "@tabler/icons-react";
export type AppSection = "explore" | "surprise" | "account";
export default function BottomNav({active,onChange}:{active:AppSection;onChange:(s:AppSection)=>void}) {
 const items=[{key:"explore" as const,label:"Explore",icon:IconMap2},{key:"surprise" as const,label:"Surprise me",icon:IconSparkles},{key:"account" as const,label:"More",icon:IconUserCircle}];
 return <div className="amc-nav-dock"><nav className="amc-bottom-nav" aria-label="Main navigation">{items.map(({key,label,icon:Icon})=><button key={key} type="button" onClick={()=>onChange(key)} className={active===key?"is-active":""}><span className="amc-nav-icon"><Icon size={19} stroke={2.2}/></span><span className="amc-nav-label">{label}</span></button>)}</nav></div>;
}
