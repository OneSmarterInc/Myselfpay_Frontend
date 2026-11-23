import {describe,it,expect,vi,afterEach} from 'vitest';
import {dollars,chartCeiling,hospitalRanges,initialZip,normalizeHospitals,positive,rangeLabel,sourceUrl,validZip,imagingGet} from '../src/imaging-prices.js';
afterEach(()=>vi.unstubAllGlobals());
describe('hospital price comparisons',()=>{
 it('preserves cents while keeping whole-dollar prices compact',()=>{expect(dollars(1505)).toBe('$1,505');expect(dollars(94012.4)).toBe('$94,012.40');});
 it('accepts only five-digit ZIP codes and preserves leading zeros',()=>{expect(validZip('00501')).toBe(true);expect(validZip('1234')).toBe(false);expect(validZip('12345-1234')).toBe(false);});
 it('uses explicit search ZIP, then saved ZIP, then facility ZIP',()=>{const entry={locations:[{zip:'43081'}]};expect(initialZip(entry,{location:'00501'},{zip_code:'45459'})).toBe('00501');expect(initialZip(entry,{}, {zip_code:'45459'})).toBe('45459');expect(initialZip(entry)).toBe('43081');});
 it('never treats zero, null or a negative amount as a posted price',()=>{for(const value of [0,null,-1,undefined,NaN])expect(positive(value)).toBeNull();expect(rangeLabel([null,0,-1])).toBe('Not posted');});
 it('keeps gross and cash separate and retains published insurer ranges',()=>{const ranges=hospitalRanges([{self_pay_median:400,gross_charge:1505,insured_min:86.95,insured_max:94012.4}]);expect(ranges[0].values).toEqual([400]);expect(ranges[1].values).toEqual([1505]);expect(ranges[2].values).toEqual([86.95,94012.4]);expect(chartCeiling(ranges,450)).toBeGreaterThanOrEqual(94012.4);});
 it('uses posted cash minimum when the median is unavailable',()=>expect(hospitalRanges([{self_pay_median:null,self_pay_min:300}])[0].values).toEqual([300]));
 it('deduplicates by hospital CCN, filters ZIP and excludes unpriced rows',()=>{const row={ccn:'1',zip5:'43081',hospital_name:'Test',gross_charge:900};expect(normalizeHospitals([row,row,{...row,ccn:'2',zip5:'00501'},{ccn:'3',zip5:'43081'}],'43081')).toHaveLength(1);});
 it('does not invent a price-file URL or accept unsafe links',()=>{expect(sourceUrl({source_url:'javascript:alert(1)'},'70450','43081').label).toBe('API record');expect(sourceUrl({price_file_url:'https://example.test/prices'},'70450','43081').label).toBe('Price file');});
 it('formats an actual posted range',()=>expect(rangeLabel([400,500])).toBe('$400 to $500'));
 it('fetches without patient cookies and caches successful responses',async()=>{const fetch=vi.fn().mockResolvedValue({status:200,json:async()=>[{code:'test-cache'}]});vi.stubGlobal('fetch',fetch);await imagingGet('/test-cache');await imagingGet('/test-cache');expect(fetch).toHaveBeenCalledTimes(1);expect(fetch.mock.calls[0][1].credentials).toBe('omit');});
 it('rejects HTTP failures and never caches them',async()=>{const fetch=vi.fn().mockResolvedValue({status:503});vi.stubGlobal('fetch',fetch);await expect(imagingGet('/test-failure')).rejects.toThrow('temporarily unavailable');await expect(imagingGet('/test-failure')).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(2);});
 it('rejects a non-array JSON response',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({status:200,json:async()=>({error:'bad'})}));await expect(imagingGet('/test-malformed')).rejects.toThrow('unexpected response');});
});
