import {useEffect,useState} from 'react';
import {api} from './api.js';
import {useResource} from './useResource.js';
import {Alert,Pagination} from './components.jsx';

export default function ManageStaff({center}) {
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(1),[refresh,setRefresh]=useState(0);
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[removing,setRemoving]=useState(null);
 useEffect(()=>{const timer=setTimeout(()=>{setQuery(search);setPage(1)},250);return()=>clearTimeout(timer)},[search]);
 const resource=useResource(center.role==='owner'?`/centers/${center.id}/staff?${new URLSearchParams({search:query,page:String(page),page_size:'10'})}`:null,refresh);
 if(center.role!=='owner')return <Alert error>Only center owners can manage staff access.</Alert>;
 async function add(event){
  event.preventDefault();if(busy)return;
  setBusy(true);setError('');setMessage('');
  try{
   await api(`/centers/${center.id}/staff`,{method:'POST',body:{name:name.trim(),email:email.trim()}});
   setName('');setEmail('');setSearch('');setQuery('');setPage(1);setRefresh(value=>value+1);
   setMessage('Staff access added. They can request a secure sign-in link at Center login using this email.');
  }catch(error){setError(error.message)}finally{setBusy(false)}
 }
 async function remove(){
  if(busy||!removing)return;
  setBusy(true);setError('');setMessage('');
  try{
   await api(`/centers/${center.id}/staff/${removing.id}/revoke`,{method:'POST'});
   setRemoving(null);if(page>1&&resource.data?.results.length===1)setPage(value=>value-1);
   setRefresh(value=>value+1);setMessage('Staff access removed from this center.');
  }catch(error){setError(error.message)}finally{setBusy(false)}
 }
 return <>
  <div className="page-heading"><h1>Manage staff</h1><p>Give your team staff access to {center.name}.</p></div>
  {error&&<Alert error>{error}</Alert>}{message&&<Alert>{message}</Alert>}
  <section className="panel staff-add-panel"><h2>Add staff</h2><form onSubmit={add}>
   <div className="form-grid"><label className="field">Staff name<input required maxLength={120} autoComplete="name" value={name} onChange={event=>setName(event.target.value)} disabled={busy}/></label><label className="field">Work email<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} disabled={busy}/></label></div>
   <div className="actions"><button className="primary" disabled={busy}>{busy?'Saving...':'Add staff access'}</button></div>
  </form><p className="source-note">Staff sign in with a secure email link. Access applies to this center.</p></section>
  {removing&&<section className="panel staff-remove-panel" aria-labelledby="remove-staff-title"><h2 id="remove-staff-title">Remove staff access?</h2><p><strong>{removing.name}</strong> ({removing.email}) will lose access to {center.name}.</p><div className="actions"><button className="primary" onClick={remove} disabled={busy}>Confirm removal</button><button onClick={()=>setRemoving(null)} disabled={busy}>Cancel</button></div></section>}
  <section className="panel data-panel staff-access-panel" aria-label="Staff access"><div className="filters"><label>Search staff<input type="search" placeholder="Name or email" value={search} onChange={event=>setSearch(event.target.value)}/></label></div>
  {resource.loading?<p className="table-state" role="status">Loading staff...</p>:resource.error?<div className="table-state"><Alert error>{resource.error}</Alert><button onClick={()=>setRefresh(value=>value+1)}>Retry</button></div>:!resource.data?.count?<p className="table-state">{query?'No staff match your search.':'No staff have access yet. Add your first staff member above.'}</p>:<table><thead><tr><th>Name</th><th>Work email</th><th>Account</th><th>Access</th></tr></thead><tbody>{resource.data.results.map(member=><tr key={member.id}><td data-label="Name"><strong>{member.name}</strong><span className="cell-note">Staff</span></td><td data-label="Work email">{member.email}</td><td data-label="Account">{member.active?'Active':'Inactive'}</td><td data-label="Access"><button disabled={busy} aria-label={`Remove access for ${member.name}`} onClick={()=>{setRemoving(member);setError('');setMessage('')}}>Remove access</button></td></tr>)}</tbody></table>}
  {resource.data&&<Pagination count={resource.data.count} page={page} size={10} onPage={setPage}/>}</section>
 </>;
}
