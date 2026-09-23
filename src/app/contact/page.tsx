import UtilityFormPage, { type UtilityFormConfig } from "@/components/UtilityFormPage";
const config: UtilityFormConfig = {slug:"contact",number:"04",title:"CONTACT US",intro:"A straight line to the club for partnerships, press, questions and everything else.",submitLabel:"SEND MESSAGE ↗",fields:[
{name:"reason",label:"I'M WRITING ABOUT",type:"choices",required:true,options:[{value:"partnership",label:"partnership"},{value:"press",label:"press"},{value:"question",label:"question"},{value:"other",label:"other"}]},
{name:"name",label:"YOUR NAME",placeholder:"what should we call you?",required:true},
{name:"contact",label:"EMAIL OR PHONE",placeholder:"where can we reply?",required:true},
{name:"subject",label:"SUBJECT",placeholder:"the short version",required:true},
{name:"message",label:"MESSAGE",type:"textarea",placeholder:"the full story",required:true}]};
export default function Page(){return <UtilityFormPage config={config}/>}
