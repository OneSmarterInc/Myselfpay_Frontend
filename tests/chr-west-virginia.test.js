import {it,expect} from 'vitest';
import {isWestVirginia,programCHRContext} from '../src/chr-location.js';
it('recognizes West Virginia names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'WV'}},{entry:{states:'West Virginia'}},{entry:{area:'Charleston, WV'}},{entry:{states:'CA'},locations:[{state:'WV'}]}])expect(isWestVirginia(offer)).toBe(true);
 expect(isWestVirginia({entry:{states:'CA',area:'Charleston, WV'}})).toBe(false);
 expect(isWestVirginia({entry:{states:'WV'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports West Virginia search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'WV'});
 expect(isWestVirginia(scoped)).toBe(true);
});

it('does not treat Virginia as West Virginia',()=>{expect(isWestVirginia({entry:{states:'VA'}})).toBe(false);expect(isWestVirginia({entry:{states:'Virginia'}})).toBe(false);});
