import {it,expect} from 'vitest';
import {ohioHospitalRows,ohioHospitalSummary} from '../src/ohio-ranges.js';
it('combines MRI and CT without losing either exam when count buttons are removed',()=>{
 const rows=ohioHospitalRows([{ccn:'one',prices:{MRI:{self_pay_min:500,self_pay_max:900,gross_min:600,gross_charge:1500,insured_min:400,insured_max:1200,codes_priced:12},CT:{self_pay_min:350,self_pay_max:700,gross_min:450,gross_charge:1000,insured_min:300,insured_max:800,codes_priced:8}}}]);
 expect(rows).toHaveLength(1);expect(rows[0].prices.Combined).toEqual({self_pay_min:350,self_pay_max:900,gross_min:450,gross_charge:1500,insured_min:300,insured_max:1200});expect(ohioHospitalSummary(rows)).toBe('1 hospital in Ohio have 20 source price records.');
});
it('does not invent source counts when none are supplied',()=>{
 const rows=ohioHospitalRows([{prices:{CT:{self_pay_min:350}}}]);expect(ohioHospitalSummary(rows)).not.toContain('source price records');expect(rows[0].prices.Combined.gross_min).toBeNull();
});
