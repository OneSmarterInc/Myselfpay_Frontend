import {it,expect} from 'vitest';
import {isNevada,programCHRContext} from '../src/chr-location.js';
it('recognizes Nevada names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'NV'}},{entry:{states:'Nevada'}},{entry:{area:'Las Vegas, NV'}},{entry:{states:'CA'},locations:[{state:'NV'}]}])expect(isNevada(offer)).toBe(true);
 expect(isNevada({entry:{states:'CA',area:'Las Vegas, NV'}})).toBe(false);
 expect(isNevada({entry:{states:'NV'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports Nevada search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'NV'});
 expect(isNevada(scoped)).toBe(true);
});
