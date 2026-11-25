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
  expect(search).toContain(encodeURIComponent('Synthetic Center, Daytonn'));
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
