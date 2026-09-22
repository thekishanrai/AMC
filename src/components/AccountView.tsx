"use client";
import { IconMapPinPlus, IconMessage, IconBug, IconFileDescription, IconInfoCircle, IconMail } from "@tabler/icons-react";
import type { Spot } from "@/types";
export default function AccountView(_props: { spots:Spot[];saved:Set<string>;distanceFor:(s:Spot)=>number;onOpen:(s:Spot)=>void;slugFor:(s:Spot)=>string|undefined;onFocus:(s:Spot)=>void }) {
 const menu=[{label:"Request a location",sub:"Tell us where AMC should go next",icon:IconMapPinPlus},{label:"Share feedback",sub:"Help shape the next version",icon:IconMessage},{label:"Report a bug",sub:"Something not working?",icon:IconBug},{label:"Terms & conditions",sub:"The useful legal bits",icon:IconFileDescription},{label:"About us",sub:"Why Anti Monday Club exists",icon:IconInfoCircle},{label:"Contact us",sub:"Get in touch with the club",icon:IconMail}];
 void _props;
 return <section className="amc-account-view"><div className="amc-account-intro"><p>ANTI MONDAY CLUB</p><h1>How can we help?</h1></div><div className="amc-account-menu">{menu.map(({label,sub,icon:Icon})=><button type="button" key={label}><span className="amc-menu-icon"><Icon size={19}/></span><span><strong>{label}</strong><small>{sub}</small></span><b>›</b></button>)}</div></section>;
}
