// Present Ohio's exam groups as one hospital range, matching other state cards.
export function ohioHospitalRows(hospitals = []) {
  const number=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;
  return hospitals.map(row=>{
    const prices=Object.values(row.prices||{});
    const bound=(key,choose)=>{const values=prices.map(p=>number(p[key])).filter(v=>v!==null);return values.length?choose(...values):null;};
    return {...row,source_records:prices.reduce((sum,p)=>sum+(Number.isInteger(p.codes_priced)&&p.codes_priced>0?p.codes_priced:0),0),prices:{Combined:{self_pay_min:bound('self_pay_min',Math.min),self_pay_max:bound('self_pay_max',Math.max),gross_min:bound('gross_min',Math.min),gross_charge:bound('gross_charge',Math.max),insured_min:bound('insured_min',Math.min),insured_max:bound('insured_max',Math.max)}}};
  }).filter(row=>row.prices.Combined.self_pay_min!==null);
}
export function ohioHospitalSummary(rows) {
  const count=rows.reduce((sum,row)=>sum+row.source_records,0);
  return `${rows.length} hospital${rows.length===1?'':'s'} in Ohio ${count?`have ${count.toLocaleString('en-US')} source price records`:'publish hospital prices'}.`;
}
