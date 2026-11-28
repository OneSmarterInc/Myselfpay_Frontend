import {it,expect} from 'vitest';
import {isWyoming,programCHRContext} from '../src/chr-location.js';
it('recognizes Wyoming names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'WY'}},{entry:{states:'Wyoming'}},{entry:{area:'Cheyenne, WY'}},{entry:{states:'CA'},locations:[{state:'WY'}]}])expect(isWyoming(offer)).toBe(true);
 expect(isWyoming({entry:{states:'CA',area:'Cheyenne, WY'}})).toBe(false);
 expect(isWyoming({entry:{states:'WY'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports Wyoming search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'WY'});
 expect(isWyoming(scoped)).toBe(true);
});
