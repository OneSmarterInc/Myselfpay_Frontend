import {lazy, Suspense, useEffect, useState} from 'react';
const PublicApp=lazy(()=>import('./App.jsx'));
const CenterApp=lazy(()=>import('./center-pro/App.jsx'));
export function isCenterRoute(pathname,hash){
 const path=pathname.replace(/\/+$/,'');
 let route;
 try{route=decodeURIComponent(hash.slice(1));}catch{route=hash.slice(1);}
 if(route)return route==='center'||route==='center-login'||route==='center-pro'||route.startsWith('center-pro/');
 return path==='/center-login'||path==='/center-portal';
}
export default function AppRouter(){
 const [center,setCenter]=useState(()=>isCenterRoute(location.pathname,location.hash));
 useEffect(()=>{const update=()=>setCenter(isCenterRoute(location.pathname,location.hash));window.addEventListener('hashchange',update);window.addEventListener('popstate',update);return()=>{window.removeEventListener('hashchange',update);window.removeEventListener('popstate',update)}},[]);
 return <Suspense fallback={<p role="status" style={{padding:24}}>Loading workspace...</p>}>{center?<CenterApp/>:<PublicApp/>}</Suspense>;
}
