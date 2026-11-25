import {describe,it,expect} from 'vitest';
import {chrLocation,isCalifornia} from '../src/chr-location.js';
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
