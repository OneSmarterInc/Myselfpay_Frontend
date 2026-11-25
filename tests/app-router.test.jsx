import {describe,it,expect} from 'vitest';
import {isCenterRoute} from '../src/AppRouter.jsx';
describe('isolated workspace startup',()=>{
 it('loads the center bundle for direct login and all workspace routes',()=>{
  for(const [path,hash] of [['/center-login',''],['/center-portal/',''],['/','#center-login'],['/','#center-pro/previous-scans'],['/','#center-pro/request/1'],['/','#center-pro/admin-login'],['/','#center']])expect(isCenterRoute(path,hash)).toBe(true);
 });
 it('loads public pages when navigating away from center login',()=>{
  for(const hash of ['#search','#home','#facility/123','#login'])expect(isCenterRoute('/center-login',hash)).toBe(false);
  expect(isCenterRoute('/','')).toBe(false);
 });
});
