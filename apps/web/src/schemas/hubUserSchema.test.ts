import { describe, expect, it } from 'vitest';

import { hubUserSchema } from './hubUserSchema';

const VALID_ADDRESS = 'lumera1563uuzljqvpanh79w2tvymqsly73v9nwygda73';
const VALID_REFERRAL = 'lumera160ykrfmz8y99zvcf4750mhye69upa38rl4ykqz';

describe('hubUserSchema', () => {
  it('accepts a valid payload with a referral code', () => {
    const result = hubUserSchema.safeParse({
      address: VALID_ADDRESS,
      acquisitionSource: 'referralCode',
      referralCode: VALID_REFERRAL,
    });

    expect(result.success).toBe(true);
    expect(result.data?.referralCode).toBe(VALID_REFERRAL);
  });

  it('nullifies a too-short referral code instead of rejecting the payload', () => {
    const result = hubUserSchema.safeParse({
      address: VALID_ADDRESS,
      acquisitionSource: 'referralCode',
      referralCode: 'abc',
    });

    expect(result.success).toBe(true);
    expect(result.data?.referralCode).toBeNull();
  });

  it('nullifies a too-long referral code instead of rejecting the payload', () => {
    const result = hubUserSchema.safeParse({
      address: VALID_ADDRESS,
      acquisitionSource: 'referralCode',
      referralCode: 'x'.repeat(60),
    });

    expect(result.success).toBe(true);
    expect(result.data?.referralCode).toBeNull();
  });

  it('keeps a null referral code', () => {
    const result = hubUserSchema.safeParse({
      address: VALID_ADDRESS,
      acquisitionSource: 'Direct',
      referralCode: null,
    });

    expect(result.success).toBe(true);
    expect(result.data?.referralCode).toBeNull();
  });

  it('truncates an over-long acquisition source instead of rejecting the payload', () => {
    const result = hubUserSchema.safeParse({
      address: VALID_ADDRESS,
      acquisitionSource: 'https://www.google.com/',
      referralCode: null,
    });

    expect(result.success).toBe(true);
    expect(result.data?.acquisitionSource).toBe('https://www.google.com/'.slice(0, 20));
  });

  it('defaults a missing acquisition source to an empty string', () => {
    const result = hubUserSchema.safeParse({ address: VALID_ADDRESS });

    expect(result.success).toBe(true);
    expect(result.data?.acquisitionSource).toBe('');
  });

  it('still rejects an invalid address', () => {
    const result = hubUserSchema.safeParse({
      address: 'short',
      acquisitionSource: 'Direct',
    });

    expect(result.success).toBe(false);
  });

  it('canonicalizes EVM addresses before persistence', () => {
    const result = hubUserSchema.safeParse({
      address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
    });

    expect(result.success).toBe(true);
    expect(result.data?.address).toBe(
      '0xabcdef1234567890abcdef1234567890abcdef12',
    );
  });
});
