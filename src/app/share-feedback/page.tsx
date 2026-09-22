import UtilityFormPage, { type UtilityFormConfig } from "@/components/UtilityFormPage";
const config: UtilityFormConfig = {number:"02",title:"SHARE FEEDBACK",intro:"Tell us what works, what feels confusing, and what would make your next escape easier.",submitLabel:"SEND FEEDBACK ↗",fields:[
{name:"surface",label:"WHAT ARE YOU REVIEWING?",type:"choices",required:true,options:[{value:"map",label:"map"},{value:"cards",label:"location cards"},{value:"detail",label:"detail page"},{value:"more",label:"More"}]},
{name:"feeling",label:"HOW DID IT FEEL?",type:"choices",required:true,options:[{value:"great",label:"great"},{value:"okay",label:"okay"},{value:"frustrating",label:"frustrating"}]},
{name:"feedback",label:"YOUR FEEDBACK",type:"textarea",placeholder:"tell us what you liked or what should change",required:true},
{name:"page",label:"PAGE LINK",type:"url",placeholder:"optional - paste the page you were on"},
{name:"contact",label:"YOUR CONTACT",placeholder:"optional, if you want a reply"}]};
export default function Page(){return <UtilityFormPage config={config}/>}
