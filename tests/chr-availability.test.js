import {it,expect} from 'vitest';
import {chrAvailabilityQuery} from '../src/chr-availability.js';
import {programCHRContext} from '../src/chr-location.js';
import {originalUI} from '../src/original-ui.js';
it('builds the same state/price screening request and scopes programs',()=>{
 const offer={entry:{states:'NM',mri:'$500',ct:'$300'}};
 expect(chrAvailabilityQuery(offer)).toEqual({state:'NM',view:'hospitals',mri:'500',ct:'300'});
 const program={entry:{location_type:'program',states:'National',mri:'$265'}};
 expect(chrAvailabilityQuery(programCHRContext(program,{state:'KY'}))).toEqual({state:'KY',view:'hospitals',mri:'265',ct:''});
 expect(chrAvailabilityQuery({entry:{states:'ZZ'}})).toBeNull();
 expect(chrAvailabilityQuery({entry:{states:'OH',zip:'45219',mri:'$400'}})).toEqual({zip:'45219',mri:'400',ct:'0',view:'filtered'});
});
it('disables only no-match/checking buttons on desktop and native cards',()=>{
 const entry={name:'QA Center',booking_id:'qa',states:'NM',mri:'$500',entity:'Imaging center'};
 const offer={id:'qa',entry,type:'fixed',mod:'MRI',amount:500,region:'NM'};
 for(const nativeApp of [false,true])for(const [available,disabled] of [[false,true],['checking',true],[true,false],[null,false]]){
  const ui=originalUI({state:{nativeApp,searched:true,selected:[],location:'National',messages:[],chrAvailability:{qa:available}},DIRECTORY:[entry],offers:[offer],results:[offer]});
  const html=ui.search(),button=html.match(/<button[^>]*data-chr="qa"[^>]*>/)?.[0];
  expect(button).toBeTruthy();expect(/\sdisabled(?:\s|>)/.test(button)).toBe(disabled);
 }
});
