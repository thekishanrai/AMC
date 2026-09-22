import UtilityFormPage, { type UtilityFormConfig } from "@/components/UtilityFormPage";
const config: UtilityFormConfig = {slug:"request-location",number:"01",title:"REQUEST A LOCATION",intro:"Put a missing escape on our map. Give us enough to find it and check it.",submitLabel:"REQUEST THIS PLACE ↗",fields:[
{name:"place",label:"PLACE NAME",placeholder:"e.g. a hidden waterfall near Karjat",required:true},
{name:"map",label:"MAP LINK OR AREA",placeholder:"paste a pin or describe where",required:true},
{name:"type",label:"WHAT KIND OF PLACE?",type:"choices",required:true,options:[{value:"trek",label:"trek"},{value:"waterfall",label:"waterfall"},{value:"camping",label:"camping"},{value:"activity",label:"activity"}]},
{name:"why",label:"WHY SHOULD WE ADD IT?",type:"textarea",placeholder:"what makes it worth the weekend?",required:true},
{name:"source",label:"PHOTO OR SOURCE",type:"file",placeholder:"add a useful photo",accept:"image/*"},
{name:"contact",label:"YOUR CONTACT",placeholder:"email or phone",required:true}]};
export default function Page(){return <UtilityFormPage config={config}/>}
