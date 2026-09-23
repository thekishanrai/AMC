import UtilityFormPage, { type UtilityFormConfig } from "@/components/UtilityFormPage";
const config: UtilityFormConfig = {slug:"report-bug",number:"03",title:"REPORT A BUG",intro:"Show us what Monday broke. Details help us reproduce it and fix it faster.",submitLabel:"REPORT THE BUG ↗",fields:[
{name:"area",label:"WHAT BROKE?",type:"choices",required:true,options:[{value:"map",label:"map"},{value:"drawer",label:"drawer"},{value:"detail",label:"location page"},{value:"share",label:"share"},{value:"other",label:"other"}]},
{name:"actual",label:"WHAT HAPPENED?",type:"textarea",placeholder:"describe what you saw",required:true},
{name:"expected",label:"WHAT SHOULD HAVE HAPPENED?",type:"textarea",placeholder:"tell us the expected result"},
{name:"screenshot",label:"SCREENSHOT",type:"file",placeholder:"upload a screenshot or screen recording",accept:"image/*,video/*"},
{name:"device",label:"DEVICE / BROWSER",placeholder:"e.g. iPhone 15 · Safari"},
{name:"contact",label:"YOUR CONTACT",placeholder:"optional, if we need to follow up"}]};
export default function Page(){return <UtilityFormPage config={config}/>}
