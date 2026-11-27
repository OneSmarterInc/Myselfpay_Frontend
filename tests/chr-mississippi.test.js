import {it,expect} from 'vitest';
import {isMississippi,programCHRContext} from '../src/chr-location.js';
it('recognizes Mississippi names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'MS'}},{entry:{states:'Mississippi'}},{entry:{area:'Jackson, MS'}},{entry:{states:'CA'},locations:[{state:'MS'}]}])expect(isMississippi(offer)).toBe(true);
 expect(isMississippi({entry:{states:'CA',area:'Jackson, MS'}})).toBe(false);
 expect(isMississippi({entry:{states:'MS'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports Mississippi search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'MS'});
 expect(isMississippi(scoped)).toBe(true);
});
