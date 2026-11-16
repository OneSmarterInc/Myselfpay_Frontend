import { expect, it } from 'vitest';
import { cardPriceSummary, directoryOffer } from '../src/directory-offer.js';
for (const branch of ['Columbus South','Beachwood']) {
  it(`shows all six confirmed prices on ${branch} card`, () => {
    const entry = {name:`Advantage Diagnostics — ${branch}`};
    for (const offer of [directoryOffer(entry), {entry, type:'quote',amount:null}]) {
      expect(cardPriceSummary(offer)).toBe('MRI without contrast: $400\nMRI with contrast: $500\nCT without contrast: $300\nCT with contrast: $400\nUltrasound: $300\nX-ray: $100');
    }
  });
}
