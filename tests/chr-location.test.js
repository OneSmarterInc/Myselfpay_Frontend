import {describe,it,expect} from 'vitest';
import {chrLocation,isCalifornia,isDelaware,delawareLocation} from '../src/chr-location.js';
describe('CHR Ohio center location',()=>{
 it('uses Ohio coordinates in a multi-state listing',()=>{
  const result=chrLocation({entry:{states:'OH; IN',area:'Cincinnati, OH; Richmond, IN',locations:[{state:'IN',city:'Richmond',latitude:39.8,longitude:-84.8},{state:'OH',city:'Cincinnati',latitude:39.14,longitude:-84.5}]}});
  expect(result).toEqual({ohio:true,city:'Cincinnati',latitude:39.14,longitude:-84.5});
 });
 it('does not enable fallback for Kentucky',()=>expect(chrLocation({entry:{states:'KY',area:'Hebron'}}).ohio).toBe(false));
 it('uses city when no coordinates exist',()=>expect(chrLocation({entry:{states:'Ohio',area:'Cincinnati, OH'}})).toEqual({ohio:true,city:'Cincinnati',latitude:undefined,longitude:undefined}));
 it('respects a scoped non-Ohio location without inventing coordinates',()=>expect(chrLocation({entry:{states:'IN',area:'Richmond'},locations:[{state:'IN',city:'Richmond'}]}).ohio).toBe(false));
});

describe('California CHR availability',()=>{
 it('supports California names, abbreviations and saved locations',()=>{
  expect(isCalifornia({entry:{states:'CA'}})).toBe(true);
  expect(isCalifornia({entry:{states:'California'}})).toBe(true);
  expect(isCalifornia({entry:{locations:[{state:'CA'}]}})).toBe(true);
  expect(isCalifornia({entry:{states:'OH'}})).toBe(false);
 });
 it('respects an offer scoped to another state',()=>expect(isCalifornia({entry:{states:'CA; NV'},locations:[{state:'NV'}]})).toBe(false));
});

describe('California public card fallback',()=>{
 it('retains the saved CA state for incomplete scoped locations',()=>{
  expect(isCalifornia({entry:{states:'CA'},locations:[{city:'Anaheim'}]})).toBe(true);
  expect(isCalifornia({entry:{state:'California'},locations:[{latitude:33.8,longitude:-117.9}]})).toBe(true);
 });
 it('recognizes state labels and legacy city/state fields',()=>{
  expect(isCalifornia({entry:{states:'CA (California)'}})).toBe(true);
  expect(isCalifornia({entry:{},region:'Anaheim, CA'})).toBe(true);
  expect(isCalifornia({entry:{area:'California'}})).toBe(true);
 });
 it('keeps explicit out-of-state cards unavailable rather than using the search state',()=>{
  expect(isCalifornia({entry:{states:'NV'},region:'California'})).toBe(false);
  expect(isCalifornia({entry:{states:'CA'},locations:[{state:'NV'}]})).toBe(false);
  expect(isCalifornia({entry:{area:'California Street, NY'}})).toBe(false);
 });
});

describe('Delaware CHR routing',()=>{
 it('supports Delaware records including incomplete scoped state fields',()=>{
  expect(isDelaware({entry:{states:'DE'},locations:[{city:'Dover'}]})).toBe(true);
  expect(isDelaware({entry:{state:'Delaware'}})).toBe(true);
  expect(isDelaware({entry:{states:'OH'}})).toBe(false);
  expect(isDelaware({entry:{states:'DE'},locations:[{state:'NJ'}]})).toBe(false);
 });
 it('uses the Delaware location rather than an Ohio branch',()=>{
  const location=delawareLocation({entry:{states:'OH; DE',locations:[{state:'OH',city:'Cincinnati',latitude:39,longitude:-84},{state:'DE',city:'Dover',latitude:39.15,longitude:-75.5}]}});
  expect(location.city).toBe('Dover');expect(location.latitude).toBe(39.15);
 });
});


it('scopes program CHR to the searched state without changing facility locations', async()=>{
 const {programCHRContext,isLouisiana}=await import('../src/chr-location.js');
 const program={entry:{location_type:'program',states:'National',zip:'99999'}};
 const scoped=programCHRContext(program,{state:'LA',zip:'70112'});
 expect(isLouisiana(scoped)).toBe(true);
 expect(scoped.entry.zip).toBe('70112');
 expect(program.entry.zip).toBe('99999');
 const center={entry:{location_type:'facility',states:'OH'}};
 expect(programCHRContext(center,{state:'LA'})).toBe(center);
 expect(programCHRContext(program,null)).toBe(program);
});

it('keeps Washington state separate from Washington DC',async()=>{
 const {isWashington}=await import('../src/chr-location.js');
 expect(isWashington({entry:{states:'WA'}})).toBe(true);
 expect(isWashington({entry:{states:'Washington'}})).toBe(true);
 expect(isWashington({entry:{area:'Seattle, WA'}})).toBe(true);
 expect(isWashington({entry:{area:'Washington, DC'}})).toBe(false);
 expect(isWashington({entry:{area:'Washington, District of Columbia'}})).toBe(false);
});
