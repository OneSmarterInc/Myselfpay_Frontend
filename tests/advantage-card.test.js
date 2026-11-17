import { expect, it } from 'vitest';
import { cardPriceSummary, directoryOffer } from '../src/directory-offer.js';
import { presentListing } from '../src/directory-policy.js';

for (const branch of ['Columbus South', 'Beachwood']) {
  it(`shows no typed-in price for ${branch}; prices come from directory data only`, () => {
    const bare = { name: `Advantage Diagnostics — ${branch}` };
    expect(directoryOffer(bare).published_prices || []).toEqual([]);
    expect(cardPriceSummary(directoryOffer(bare))).toBeNull();
    expect(presentListing(bare)).toEqual(bare);
    const priced = { ...bare, mri: '$123 without contrast' };
    expect(directoryOffer(priced, { mod: 'MRI' }).published_prices[0].text).toBe('$123 without contrast');
    expect(presentListing(priced).mri).toBe('$123 without contrast');
  });
}
