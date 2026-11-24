// Keep the synthetic Gitesh listing together without merging unrelated branches.
export function centerCardOffers(offers = []) {
  const result = [], groups = new Map();
  for (const offer of offers) {
    const entry = offer.entry || {};
    const target = entry.booking_id === 'portal-gitesh-email-test-center'
      || (entry.is_test_center && /^gitesh imaging center$/i.test(entry.name || ''));
    if (!target) { result.push(offer); continue; }
    const key = entry.booking_id || entry.name;
    let group = groups.get(key);
    if (!group) { group = {...offer, card_prices: []}; groups.set(key, group); result.push(group); }
    const label = [offer.mod, {without:'without contrast',with:'with contrast',both:'without and with contrast'}[offer.contrast]].filter(Boolean).join(' ');
    const value = offer.amount == null || ['quote','conflict'].includes(offer.type) ? 'Ask for a price' : `${offer.type === 'starting' ? 'From ' : ''}$${offer.amount}${offer.type === 'range' ? `–$${offer.max}` : ''}`;
    const text = `${label || 'Imaging'}: ${value}`;
    if (!group.card_prices.includes(text)) group.card_prices.push(text);
  }
  return result;
}
