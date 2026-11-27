import {it,expect} from 'vitest';
import {isMinnesota,programCHRContext} from '../src/chr-location.js';
it('recognizes Minnesota names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'MN'}},{entry:{states:'Minnesota'}},{entry:{area:'Minneapolis, MN'}},{entry:{states:'CA'},locations:[{state:'MN'}]}])expect(isMinnesota(offer)).toBe(true);
 expect(isMinnesota({entry:{states:'CA',area:'Minneapolis, MN'}})).toBe(false);
 expect(isMinnesota({entry:{states:'MN'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports Minnesota search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'MN'});
 expect(isMinnesota(scoped)).toBe(true);
});
