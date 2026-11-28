import {it,expect} from 'vitest';
import {isNorthCarolina,programCHRContext} from '../src/chr-location.js';
it('recognizes North Carolina names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'NC'}},{entry:{states:'North Carolina'}},{entry:{area:'Charlotte, NC'}},{entry:{states:'CA'},locations:[{state:'NC'}]}])expect(isNorthCarolina(offer)).toBe(true);
 expect(isNorthCarolina({entry:{states:'CA',area:'Charlotte, NC'}})).toBe(false);
 expect(isNorthCarolina({entry:{states:'NC'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports North Carolina search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'NC'});
 expect(isNorthCarolina(scoped)).toBe(true);
});

it('does not mistake South Carolina for North Carolina',()=>{expect(isNorthCarolina({entry:{states:'SC'}})).toBe(false);expect(isNorthCarolina({entry:{states:'South Carolina'}})).toBe(false);});
