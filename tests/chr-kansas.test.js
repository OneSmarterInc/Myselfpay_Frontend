import {it,expect} from 'vitest';
import {isKansas,programCHRContext} from '../src/chr-location.js';
it('recognizes Kansas names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'KS'}},{entry:{states:'Kansas'}},{entry:{area:'Wichita, KS'}},{entry:{states:'CA'},locations:[{state:'KS'}]}])expect(isKansas(offer)).toBe(true);
 expect(isKansas({entry:{states:'CA',area:'Wichita, KS'}})).toBe(false);
 expect(isKansas({entry:{states:'KS'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports Kansas search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'KS'});
 expect(isKansas(scoped)).toBe(true);
});

it('does not mistake Arkansas for Kansas',()=>{expect(isKansas({entry:{states:'AR'}})).toBe(false);expect(isKansas({entry:{states:'Arkansas'}})).toBe(false);});
