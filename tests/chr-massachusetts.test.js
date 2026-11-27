import {it,expect} from 'vitest';
import {isMassachusetts,programCHRContext} from '../src/chr-location.js';
it('recognizes Massachusetts names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'MA'}},{entry:{states:'Massachusetts'}},{entry:{area:'Boston, MA'}},{entry:{states:'CA'},locations:[{state:'MA'}]}])expect(isMassachusetts(offer)).toBe(true);
 expect(isMassachusetts({entry:{states:'CA',area:'Boston, MA'}})).toBe(false);
 expect(isMassachusetts({entry:{states:'MA'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports Massachusetts search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'MA'});
 expect(isMassachusetts(scoped)).toBe(true);
});
