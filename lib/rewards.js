export const DEFAULT_REWARDS = Object.freeze({
  joinPoints: 10,
  pointsPerDollar: 1,
  ratingPoints: 5,
  writtenReviewPoints: 5,
  approvedPhotoPoints: 5,
  stepPoints: 100,
  stepCents: 500,
  minPoints: 100,
  maxDiscountCents: null,
  allowFullCover: false,
  expiryDays: null,
});

export function purchasePoints(subtotalCents, discountCents, config = DEFAULT_REWARDS) {
  if (!Number.isSafeInteger(subtotalCents) || !Number.isSafeInteger(discountCents) || subtotalCents < discountCents || discountCents < 0) throw new Error('Invalid order amount.');
  return Math.floor((subtotalCents - discountCents) / 100) * config.pointsPerDollar;
}

export function rewardDiscount(points, balance, productCents, config = DEFAULT_REWARDS) {
  if (![points, balance, productCents].every(Number.isSafeInteger) || points < 0 || balance < 0 || productCents < 0) throw new Error('Invalid reward amount.');
  if (points === 0) return 0;
  if (points < config.minPoints || points % config.stepPoints || points > balance) throw new Error('Reward is not available.');
  const cents = points / config.stepPoints * config.stepCents;
  if (config.maxDiscountCents !== null && cents > config.maxDiscountCents) throw new Error('Reward exceeds the order limit.');
  if (cents > productCents - (config.allowFullCover ? 0 : 100)) throw new Error('Reward exceeds the eligible order amount.');
  return cents;
}
