export const storeIds = ["bigbasket", "amazon-fresh", "instamart", "blinkit", "zepto"] as const;
export type StoreId = (typeof storeIds)[number];

export type GroceryItem = {
  id: string;
  category: string;
  name: string;
  minimumOrder: string | null;
};

export type Offer = {
  itemId: string;
  storeId: StoreId;
  productName: string;
  brand: string;
  imageUrl: string;
  pack: string;
  price: number;
  available: boolean;
  productUrl: string;
};

export type Coupon = {
  code: string;
  minimumSubtotal: number;
  discount: number;
};

export type StoreQuote = {
  storeId: StoreId;
  displayName: string;
  deliveryFee: number;
  coupon: Coupon | null;
  offers: Offer[];
  live: boolean;
};

export type StorePlan = {
  storeId: StoreId;
  displayName: string;
  items: Offer[];
  subtotal: number;
  deliveryFee: number;
  couponDiscount: number;
  total: number;
  cartUrl: string;
};

export type OptimizationResult = {
  stores: StorePlan[];
  singleStoreOptions: StorePlan[];
  pincode: string;
  unavailableItemIds: string[];
  grandTotal: number;
  singleStoreBest: StorePlan | null;
  savingsVsSingleStore: number;
  mode: "demo" | "manual" | "live";
};
