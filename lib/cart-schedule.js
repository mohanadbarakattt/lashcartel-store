const delays = [2, 24, 72];
export function dueStage(cart, now = Date.now()) {
  if (!cart.consent || cart.purchased_at || cart.unsubscribed_at || cart.reminders_sent >= 3) return -1;
  const stage = cart.reminders_sent;
  return now - new Date(cart.updated_at).getTime() >= delays[stage] * 3600000 ? stage : -1;
}
