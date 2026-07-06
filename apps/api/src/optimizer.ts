import { cartUrlFor } from "./providers.js";
import type { Offer, OptimizationResult, StorePlan, StoreQuote } from "./types.js";

const round = (value: number) => Math.round(value * 100) / 100;

function buildPlan(quote: StoreQuote, items: Offer[]): StorePlan {
  const subtotal = round(items.reduce((sum, item) => sum + item.price, 0));
  const couponDiscount = quote.coupon && subtotal >= quote.coupon.minimumSubtotal ? quote.coupon.discount : 0;
  return {
    storeId: quote.storeId,
    displayName: quote.displayName,
    items,
    subtotal,
    deliveryFee: items.length ? quote.deliveryFee : 0,
    couponDiscount,
    total: round(subtotal + (items.length ? quote.deliveryFee : 0) - couponDiscount),
    cartUrl: cartUrlFor(quote.storeId)
  };
}

export function optimize(
  itemIds: string[],
  quotes: StoreQuote[],
  pincode = "700048",
  mode?: OptimizationResult["mode"]
): OptimizationResult {
  const uniqueIds = [...new Set(itemIds)];
  let bestPlans: StorePlan[] = [];
  let bestTotal = Number.POSITIVE_INFINITY;
  let bestUnavailable: string[] = uniqueIds;

  for (let mask = 1; mask < 1 << quotes.length; mask++) {
    const active = quotes.filter((_, index) => mask & (1 << index));
    const assigned = new Map<string, Offer[]>();
    const unavailable: string[] = [];

    for (const itemId of uniqueIds) {
      const candidates = active
        .flatMap((quote) => quote.offers)
        .filter((offer) => offer.itemId === itemId && offer.available)
        .sort((a, b) => a.price - b.price);
      if (!candidates.length) unavailable.push(itemId);
      else assigned.set(candidates[0].storeId, [...(assigned.get(candidates[0].storeId) ?? []), candidates[0]]);
    }

    const plans = active
      .map((quote) => buildPlan(quote, assigned.get(quote.storeId) ?? []))
      .filter((plan) => plan.items.length);
    const total = round(plans.reduce((sum, plan) => sum + plan.total, 0));
    if (unavailable.length < bestUnavailable.length || (unavailable.length === bestUnavailable.length && total < bestTotal)) {
      bestPlans = plans;
      bestTotal = total;
      bestUnavailable = unavailable;
    }
  }

  const singleCandidates = quotes
    .map((quote) => {
      const offers = uniqueIds.map((id) => quote.offers.find((offer) => offer.itemId === id && offer.available));
      return offers.every(Boolean) ? buildPlan(quote, offers as Offer[]) : null;
    })
    .filter((plan): plan is StorePlan => Boolean(plan))
    .sort((a, b) => a.total - b.total);
  const singleStoreBest = singleCandidates[0] ?? null;

  return {
    stores: bestPlans,
    singleStoreOptions: singleCandidates,
    pincode,
    unavailableItemIds: bestUnavailable,
    grandTotal: Number.isFinite(bestTotal) ? bestTotal : 0,
    singleStoreBest,
    savingsVsSingleStore: singleStoreBest ? round(singleStoreBest.total - bestTotal) : 0,
    mode: mode ?? (quotes.every((quote) => quote.live) ? "live" : "demo")
  };
}
