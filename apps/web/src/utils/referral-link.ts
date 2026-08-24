export const buildReferralLink = (
  origin: string,
  referralCode: string,
): string =>
  origin.replace(/\/+$/, '') +
  '/?referral_code=' +
  encodeURIComponent(referralCode)
