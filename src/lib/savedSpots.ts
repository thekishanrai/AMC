const SAVED_KEY="amc-saved-spots", REJECTED_KEY="amc-rejected-spots";
function load(key:string):string[]{if(typeof window==="undefined")return[];try{return JSON.parse(localStorage.getItem(key)??"[]")}catch{return[]}}
export const loadSavedSpotIds=()=>load(SAVED_KEY);export const saveSpotIds=(ids:string[])=>localStorage.setItem(SAVED_KEY,JSON.stringify(ids));export const loadRejectedSpotIds=()=>load(REJECTED_KEY);export const saveRejectedSpotIds=(ids:string[])=>localStorage.setItem(REJECTED_KEY,JSON.stringify(ids));
