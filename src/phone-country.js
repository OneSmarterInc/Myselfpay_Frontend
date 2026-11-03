import rows from "./data/calling-codes.json";
const names = new Intl.DisplayNames(["en"], {type:"region"});
export const CALLING_CODES = rows.map(row=>({...row,name:names.of(row.country)||row.country})).sort((a,b)=>a.name.localeCompare(b.name));
const byCountry = new Map(rows.map(row=>[row.country,row]));
export function dialCode(country) { return byCountry.get(country)?.dial || "1"; }
export function phoneInput(country, input) {
 const digits=String(input||"").replace(/[^0-9]/g,"");
 let selected=country;
 let national=digits;
 if (String(input||"").trim().startsWith("+")) {
  const matches=rows.filter(row=>digits.startsWith(row.dial)).sort((a,b)=>b.dial.length-a.dial.length);
  const longest=matches[0]?.dial.length;
  const match=matches.find(row=>row.country===country&&row.dial.length===longest)||matches.find(row=>row.country==="US"&&row.dial.length===longest)||matches[0];
  if(match){selected=match.country;national=digits.slice(match.dial.length);}
  else return {country:selected,national:digits,phone:""};
 }
 const dial=dialCode(selected);
 national=national.slice(0,15-dial.length);
 return {country:selected,national,phone:national?"+"+dial+national:""};
}
