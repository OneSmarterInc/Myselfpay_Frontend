import {it,expect} from 'vitest';
import {isGuam,programCHRContext} from '../src/chr-location.js';
it('recognizes Guam names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'GU'}},{entry:{states:'Guam'}},{entry:{area:'Tamuning, GU'}},{entry:{states:'CA'},locations:[{state:'GU'}]}])expect(isGuam(offer)).toBe(true);
 expect(isGuam({entry:{states:'CA',area:'Tamuning, GU'}})).toBe(false);
 expect(isGuam({entry:{states:'GU'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports Guam search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'GU'});
 expect(isGuam(scoped)).toBe(true);
});
