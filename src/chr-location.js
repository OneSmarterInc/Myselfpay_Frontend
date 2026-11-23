// Resolve a saved center location, including multi-state directory entries.
export function chrLocation(offer) {
  const entry=offer.entry||{};
  const locations=offer.locations?.length?offer.locations:(entry.locations||[]);
  const isOhio=value=>/^(OH|OHIO)$/i.test(String(value||'').trim());
  const ohioLocation=locations.find(item=>isOhio(item.state));
  const states=String(entry.states||'').split(/[;,|/]/).map(value=>value.trim());
  const ohio=Boolean(ohioLocation)||states.some(isOhio);
  const location=ohioLocation||locations[0];
  const latitude=Number(location?.latitude),longitude=Number(location?.longitude);
  const hasCoordinates=location?.latitude!=null&&location?.longitude!=null&&Number.isFinite(latitude)&&Number.isFinite(longitude);
  return {ohio,city:String(location?.city||entry.area||'').split(/[;,]/)[0].trim(),
    latitude:hasCoordinates?latitude:undefined,longitude:hasCoordinates?longitude:undefined};
}
