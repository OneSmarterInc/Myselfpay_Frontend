import {it,expect} from 'vitest';
import{excludedListing,visibleDirectoryData}from'../src/directory-policy.js';
import{directoryOffer}from'../src/directory-offer.js';
import{originalUI}from'../src/original-ui.js';
const linked={name:'Advanced Radiology — Fleet Street',booking_id:'fleet',states:'MD',area:'Baltimore',entity:'Outpatient center / prepaid MDsave offer',mri:'$659'};
const direct={name:'Independent Maryland center',booking_id:'direct',states:'MD',area:'Baltimore',mri:'$400'};
it('excludes nested marketplace references while retaining Maryland providers',()=>{
 expect(excludedListing(linked)).toBe(true);expect(excludedListing(direct)).toBe(false);
 expect(excludedListing({source:'https://www.mdsave.com/p/example'})).toBe(true);
 expect(excludedListing({entity:'MD Save offer'})).toBe(true);
 expect(excludedListing({entity:'MD-save offer'})).toBe(true);
 const data={entries:[linked,direct],offers:[directoryOffer(linked),directoryOffer(direct)],nearby_unpriced:[linked],program_entries:[linked],programs:[directoryOffer(linked)]};
 const safe=visibleDirectoryData(data);
 expect(safe.entries).toEqual([direct]);expect(safe.offers).toHaveLength(1);expect(safe.nearby_unpriced).toEqual([]);expect(safe.program_entries).toEqual([]);expect(safe.programs).toEqual([]);expect(data.entries).toHaveLength(2);
});
it('hides Fleet Street in cards, directory, comparison and direct details from old responses',()=>{
 const offers=[directoryOffer(linked),directoryOffer(direct)];
 const ui=originalUI({state:{searched:true,selected:offers.map(o=>o.id),location:'Maryland',mod:'',messages:[],nearbyUnpriced:[linked],programEntries:[linked],programs:[offers[0]]},DIRECTORY:[linked,direct],offers,results:offers});
 for(const html of[ui.search(),ui.compare(),ui.directoryRows([linked,direct])]){expect(html).not.toContain('Fleet Street');expect(html).not.toContain('MDsave');expect(html).toContain('Independent Maryland center');}
 expect(ui.detail(offers[0].id)).toContain('unavailable');
});
