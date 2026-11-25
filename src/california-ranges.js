const numbers=values=>values.filter(value=>value!==null&&value!==undefined&&value!=='').map(Number).filter(value=>Number.isFinite(value)&&value>=0);
export function californiaRanges(rows){
 return [
  {key:'cash',label:'Hospital cash price',values:rows.flatMap(row=>numbers([row.cash_min,row.cash_max]))},
  {key:'gross',label:'Gross charge',values:rows.flatMap(row=>numbers([row.gross_min,row.gross_max]))},
  {key:'insured',label:'Insurer negotiated rates',values:rows.flatMap(row=>numbers([row.insured_min,row.insured_max]))},
 ];
}
export function californiaPriceRange(low,high){
 const values=numbers([low,high]);
 if(!values.length)return 'Not supplied';
 const dollars=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:6}).format(value);
 const min=Math.min(...values),max=Math.max(...values);
 return min===max?dollars(min):`${dollars(min)} to ${dollars(max)}`;
}

export function californiaReference(value){
 if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
 const number=Number(value);
 return Number.isFinite(number)&&number>0?number:null;
}

export function californiaRangeLabel(values){
 const valid=numbers(values);
 return valid.length?californiaPriceRange(Math.min(...valid),Math.max(...valid)):'Not supplied';
}
