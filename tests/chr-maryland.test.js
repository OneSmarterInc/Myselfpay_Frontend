import {it,expect} from 'vitest';
import {isMaryland,programCHRContext} from '../src/chr-location.js';
it('recognizes Maryland names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'MD'}},{entry:{states:'Maryland'}},{entry:{area:'Baltimore, MD'}},{entry:{states:'CA'},locations:[{state:'MD'}]}])expect(isMaryland(offer)).toBe(true);
 expect(isMaryland({entry:{states:'CA',area:'Baltimore, MD'}})).toBe(false);
 expect(isMaryland({entry:{states:'MD'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports Maryland search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'MD'});
 expect(isMaryland(scoped)).toBe(true);
});
