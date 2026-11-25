import {describe,it,expect} from 'vitest';
import {activityLabel,activityCategory,activityDetails} from '../../src/center-pro/activity.js';
describe('center activity descriptions',()=>{
 it('describes default access and approved profile changes',()=>{
  expect(activityLabel('access.directory_owner')).toBe('Default owner access granted');
  expect(activityLabel('profile.approved')).toBe('Profile change approved');
  expect(activityCategory('profile.submitted')).toBe('Center profile');
  expect(activityDetails({action:'profile.approved',field:'zip',old_value:'45123',new_value:'44122'})).toEqual(['Previous zip code: 45123','Updated zip code: 44122']);
 });
 it('keeps rejected proposals distinct from published changes',()=>{
  expect(activityDetails({action:'profile.rejected',field:'address',old_value:'Old address',new_value:'Requested address'})[1]).toBe('Requested address: Requested address');
  expect(activityDetails({action:'price.approved',field:'MRI',new_value:'40000'})).toEqual(['MRI: $400.00']);
  expect(activityDetails({action:'access.assigned'})).toEqual([]);
 });
});
