import {it,expect} from 'vitest';
import {arrangeZipResults,searchZip} from '../src/zip-results.js';
it('puts exact ZIP centers before priced nearby centers, then orders by distance',()=>{
 const rows=[{id:'priced',entry:{locations:[{zip:'45420'}]},amount:400,distance_miles:7},{id:'exact',entry:{locations:[{zip:'45432'}]},distance_miles:0},{id:'near',entry:{coverage:'Dayton OH 45431'},distance_miles:2}];
 const result=arrangeZipResults(rows,'45432, OH');
 expect(result.offers.map(o=>o.id)).toEqual(['exact','near','priced']);expect(result.exact).toBe(true);
});
it('keeps nearest first when no matching ZIP exists and preserves unknown distances last',()=>{
 const rows=[{id:'unknown',entry:{}},{id:'far',entry:{},distance_miles:15},{id:'near',entry:{},distance_miles:3}];
 const r=arrangeZipResults(rows,'45432');expect(r.exact).toBe(false);expect(r.offers.map(o=>o.id)).toEqual(['near','far','unknown']);
 expect(searchZip('Cincinnati, OH')).toBe('');expect(arrangeZipResults(rows,'Ohio').offers).toBe(rows);
});
