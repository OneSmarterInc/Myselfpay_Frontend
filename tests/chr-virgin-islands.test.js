import {it,expect} from 'vitest';
import {isVirginIslands,programCHRContext} from '../src/chr-location.js';
it('recognizes US Virgin Islands names, abbreviations and qualified legacy locations',()=>{
 for(const offer of [{entry:{states:'VI'}},{entry:{states:'US Virgin Islands'}},{entry:{area:'Charlotte Amalie, VI'}},{entry:{states:'CA'},locations:[{state:'VI'}]}])expect(isVirginIslands(offer)).toBe(true);
 expect(isVirginIslands({entry:{states:'CA',area:'Charlotte Amalie, VI'}})).toBe(false);
 expect(isVirginIslands({entry:{states:'VI'},locations:[{state:'CA'}]})).toBe(false);
});
it('supports US Virgin Islands search context for nationwide programs',()=>{
 const scoped=programCHRContext({entry:{states:'National',location_type:'program',coverage:'Nationwide participating sites'}},{state:'VI'});
 expect(isVirginIslands(scoped)).toBe(true);
});

it('accepts territory aliases without matching Virginia',()=>{for(const name of ['Virgin Islands','U.S. Virgin Islands','United States Virgin Islands'])expect(isVirginIslands({entry:{states:name}})).toBe(true);expect(isVirginIslands({entry:{states:'VA'}})).toBe(false);});
