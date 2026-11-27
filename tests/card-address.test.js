import {describe,it,expect} from 'vitest';
import {cardAddress} from '../src/card-location.js';
import {directoryOffer} from '../src/directory-offer.js';
import {originalUI} from '../src/original-ui.js';
function render(entry,nativeApp=false){
 const offer=directoryOffer(entry);
 const ui=originalUI({state:{nativeApp,searched:true,selected:[],location:'National',mod:'',messages:[],nearbyUnpriced:[entry]},DIRECTORY:[entry],offers:[offer],results:[]});
 return {search:ui.search(),detail:ui.detail(offer.id)};
}
describe('approved center address display',()=>{
 it('uses the saved address on public cards, detail pages and directions',()=>{
  const entry={name:'Synthetic Center',booking_id:'synthetic',area:'Dayton',states:'OH',zip:'45256',address:'Daytonn',coverage:'100 Old Road, Dayton, OH',mri:'$400',source:'https://example.test'};
  const {search,detail}=render(entry);
  expect(search).toContain('Address: Daytonn');
  expect(search).toContain('(45256)');
  expect(search).not.toContain('100 Old Road');
  expect(search).not.toContain('>Directions</a>');
  expect(detail).toContain(encodeURIComponent('Synthetic Center, Daytonn'));
  expect(detail).toContain('Daytonn');
  expect(detail).not.toContain('100 Old Road');
  expect(render(entry,true).search).toContain('Address: Daytonn');
 });
 it('escapes addresses and preserves legacy street-address fallback',()=>{
  expect(cardAddress({coverage:'100 Main St, Dayton, OH.'})).toBe('100 Main St, Dayton, OH');
  expect(cardAddress({coverage:'Serving Ohio'})).toBe('');
  const {search}=render({name:'Synthetic',booking_id:'safe',address:'10 Main <script>bad</script>',mri:'$400'});
  expect(search).toContain('Address: 10 Main &lt;script&gt;bad&lt;/script&gt;');
  expect(search).not.toContain('<script>bad</script>');
 });
});


it('keeps workbook email off public cards and preserves prices and network ZIPs',()=>{
 const entry={name:'Network',booking_id:'net',area:'AL; GA; SC',states:'AL; GA; SC',workbook_prices:true,price_verification:'unverified',email:'info@example.test',email_scope:'Scheduling',zip_codes:'29169; 30092; 35242',mri:'Without contrast $499; with contrast $599',source:'https://example.test',locations:[{zip:'29169',state:'SC'},{zip:'30092',state:'GA'}]};
 const {search,detail}=render(entry);
 expect(search).toContain('Unverified source prices');expect(search).not.toContain('mailto:info@example.test');expect(search).not.toContain('<strong>Email</strong>');expect(search).toContain('MRI $499 without contrast');expect(search).not.toContain('MRI $599 with contrast');expect(detail).toContain('with contrast $599');expect(search).not.toContain('(29169)');expect(detail).toContain('29169; 30092; 35242');
});


it('uses compact styling for a single price while keeping ask-for-price styling',()=>{
 const priced=render({name:'Priced',booking_id:'priced',workbook_prices:true,mri:'From $350'}).search;
 expect(priced).toContain('class="price compact-service-prices published-prices"');expect(priced).toContain('MRI from $350');
 const missing=render({name:'Missing',booking_id:'missing',workbook_prices:true}).search;
 expect(missing).toContain('Ask for a price');expect(missing).not.toContain('class="price compact-service-prices');
});
