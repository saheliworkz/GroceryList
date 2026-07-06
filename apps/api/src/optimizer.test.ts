import assert from "node:assert/strict";
import test from "node:test";
import { optimize } from "./optimizer.js";
import type { StoreQuote } from "./types.js";

test("includes delivery fees when choosing a split", () => {
  const quotes: StoreQuote[] = [
    { storeId: "bigbasket", displayName: "A", deliveryFee: 0, coupon: null, live: false, offers: [
      { itemId: "x", storeId: "bigbasket", productName: "x", brand: "A", imageUrl: "#", pack: "1", price: 10, available: true, productUrl: "#" },
      { itemId: "y", storeId: "bigbasket", productName: "y", brand: "A", imageUrl: "#", pack: "1", price: 10, available: true, productUrl: "#" }
    ]},
    { storeId: "zepto", displayName: "B", deliveryFee: 20, coupon: null, live: false, offers: [
      { itemId: "x", storeId: "zepto", productName: "x", brand: "B", imageUrl: "#", pack: "1", price: 1, available: true, productUrl: "#" },
      { itemId: "y", storeId: "zepto", productName: "y", brand: "B", imageUrl: "#", pack: "1", price: 10, available: true, productUrl: "#" }
    ]}
  ];
  const result = optimize(["x", "y"], quotes);
  assert.equal(result.grandTotal, 20);
  assert.equal(result.stores.length, 1);
  assert.equal(result.stores[0].storeId, "bigbasket");
});
