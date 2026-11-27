import {it,expect} from 'vitest';
import {isArizona,programCHRContext} from '../src/chr-location.js';
it('recognizes Arizona names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'AZ'}},{entry:{states:'Arizona'}},{entry:{area:'Phoenix, AZ'}},{entry:{states:'CA'},locations:[{state:'AZ'}]}])expect(isArizona(offer)).toBe(true);
 expect(isArizona({entry:{states:'CA',area:'Phoenix, AZ'}})).toBe(false);
 expect(isArizona({entry:{states:'AZ'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports Arizona search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'AZ'});
 expect(isArizona(scoped)).toBe(true);
});
