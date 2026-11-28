import {it,expect} from 'vitest';
import {isUtah,programCHRContext} from '../src/chr-location.js';
it('recognizes Utah names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'UT'}},{entry:{states:'Utah'}},{entry:{area:'Salt Lake City, UT'}},{entry:{states:'CA'},locations:[{state:'UT'}]}])expect(isUtah(offer)).toBe(true);
 expect(isUtah({entry:{states:'CA',area:'Salt Lake City, UT'}})).toBe(false);
 expect(isUtah({entry:{states:'UT'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports Utah search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'UT'});
 expect(isUtah(scoped)).toBe(true);
});
