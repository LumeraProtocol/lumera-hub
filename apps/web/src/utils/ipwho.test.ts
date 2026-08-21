import { describe, expect, it } from 'vitest';

import { mapIpWhoLocation } from './ipwho';

describe('mapIpWhoLocation', () => {
  it('maps an ipwho.is payload to the marker location shape', () => {
    expect(mapIpWhoLocation({
      latitude: 49.42,
      longitude: 11.07,
      capital: 'Berlin',
      city: 'Nuremberg',
      country: 'Germany',
      continent: 'Europe',
      country_code: 'DE',
    })).toEqual({
      latitude: 49.42,
      longitude: 11.07,
      subdivision: 'Berlin',
      city: 'Nuremberg',
      country: 'Germany',
      continent: 'Europe',
      country_code: 'DE',
    });
  });

  it('nulls missing fields but keeps zero coordinates', () => {
    expect(mapIpWhoLocation({ latitude: 0, longitude: 0 })).toEqual({
      latitude: 0,
      longitude: 0,
      subdivision: null,
      city: null,
      country: null,
      continent: null,
      country_code: null,
    });
  });
});
