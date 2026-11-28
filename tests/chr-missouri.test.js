import {it,expect} from 'vitest';
import {isMissouri,programCHRContext} from '../src/chr-location.js';
it('recognizes Missouri names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'MO'}},{entry:{states:'Missouri'}},{entry:{area:'St. Louis, MO'}},{entry:{states:'CA'},locations:[{state:'MO'}]}])expect(isMissouri(offer)).toBe(true);
 expect(isMissouri({entry:{states:'CA',area:'St. Louis, MO'}})).toBe(false);
 expect(isMissouri({entry:{states:'MO'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports Missouri search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'MO'});
 expect(isMissouri(scoped)).toBe(true);
});
