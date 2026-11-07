import {it,expect} from 'vitest';
import{presentListing,visibleDirectoryData}from'../src/directory-policy.js';
import{directoryOffer}from'../src/directory-offer.js';
import{originalUI}from'../src/original-ui.js';
const linked={name:'Advanced Radiology — Fleet Street',booking_id:'mdsave-fleet',states:'MD',area:'Baltimore',entity:'Outpatient center / prepaid MDsave offer',mri:'$659 without contrast; prepaid through MDsave.',source:'https://www.mdsave.com/p/example'};
it('keeps listings, price, conditions and working identities while removing display branding',()=>{
 const safe=presentListing(linked);
 expect(safe.name).toBe(linked.name);expect(safe.booking_id).toBe(linked.booking_id);expect(safe.source).toBe(linked.source);
 expect(safe.entity).toBe('Outpatient center / prepaid marketplace offer');expect(safe.mri).toContain('$659');expect(safe.mri).toContain('prepaid');expect(safe.entity).not.toMatch(/mdsave/i);
 const data={entries:[linked],offers:[directoryOffer(linked)],nearby_unpriced:[linked]};
 const clean=visibleDirectoryData(data);expect(clean.entries).toHaveLength(1);expect(clean.offers).toHaveLength(1);expect(clean.nearby_unpriced).toHaveLength(1);expect(data.entries[0].entity).toContain('MDsave');
});
it('shows Fleet Street in cards, directory, comparison and details without the brand wording',()=>{
 const offer=directoryOffer(linked);
 const ui=originalUI({state:{searched:true,selected:[offer.id],location:'Maryland',mod:'',messages:[]},DIRECTORY:[linked],offers:[offer],results:[offer]});
 for(const html of[ui.search(),ui.compare(),ui.directoryRows([linked]),ui.detail(offer.id)]){
 expect(html).toContain('Fleet Street');expect(html).toContain('$659');expect(html).not.toContain('prepaid MDsave');
 }
 expect(ui.search()).toContain('data-appointment="mdsave-fleet"');
 expect(ui.directoryRows([linked])).toContain('https://www.mdsave.com/p/example');
});
