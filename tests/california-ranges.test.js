import {describe,it,expect} from 'vitest';
import {californiaRanges,californiaPriceRange,californiaReference,californiaRangeLabel} from '../src/california-ranges.js';
describe('California hospital ranges',()=>{
 it('uses real grouped bounds and keeps missing values unavailable',()=>{
  const ranges=californiaRanges([{cash_min:'1.234',cash_max:'400',gross_min:null,gross_max:null,insured_min:'10',insured_max:'30'}]);
  expect(ranges[0].values).toEqual([1.234,400]);expect(ranges[1].values).toEqual([]);expect(ranges[2].values).toEqual([10,30]);
  expect(californiaPriceRange(null,null)).toBe('Not supplied');expect(californiaPriceRange('1.234','400')).toBe('$1.234 to $400.00');
 });
 it('preserves a real zero and rejects invalid bounds',()=>{
  expect(californiaPriceRange('0','0')).toBe('$0.00');expect(californiaPriceRange('bad',undefined)).toBe('Not supplied');
 });
});

it('accepts saved center price strings as reference markers',()=>{
 expect(californiaReference('150')).toBe(150);expect(californiaReference('175.25')).toBe(175.25);
 for(const value of ['',null,undefined,'NaN',true,'0'])expect(californiaReference(value)).toBeNull();
});

it('includes genuine zeroes and original decimals in chart labels',()=>{
 expect(californiaRangeLabel([0,1.234])).toBe('$0.00 to $1.234');expect(californiaRangeLabel([])).toBe('Not supplied');
});
