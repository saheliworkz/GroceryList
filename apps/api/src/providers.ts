import type { GroceryItem, Offer, StoreId, StoreQuote } from "./types.js";

const stores: Array<{
  id: StoreId; name: string; delivery: number; coupon: StoreQuote["coupon"]; url: string;
}> = [
  { id: "bigbasket", name: "BigBasket", delivery: 35, coupon: { code: "BBDEMO", minimumSubtotal: 1000, discount: 100 }, url: "https://www.bigbasket.com/ps/?q=" },
  { id: "amazon-fresh", name: "Amazon Fresh", delivery: 0, coupon: null, url: "https://www.amazon.in/s?k=" },
  { id: "instamart", name: "Swiggy Instamart", delivery: 29, coupon: { code: "INSTAMARTDEMO", minimumSubtotal: 699, discount: 75 }, url: "https://www.swiggy.com/instamart/search?query=" },
  { id: "blinkit", name: "Blinkit", delivery: 25, coupon: null, url: "https://blinkit.com/s/?q=" },
  { id: "zepto", name: "Zepto", delivery: 30, coupon: { code: "ZEPTODEMO", minimumSubtotal: 799, discount: 80 }, url: "https://www.zeptonow.com/search?query=" }
];

const hash = (text: string) => [...text].reduce((value, char) => ((value * 31 + char.charCodeAt(0)) >>> 0), 7);
const brands = ["Tata Sampann", "Fortune", "Aashirvaad", "24 Mantra", "Amazon Brand", "Organic Tattva"];
const demoImage = (name: string, storeIndex: number) => {
  const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const colors = ["#E9D8A6", "#B7D7C2", "#F1C7B5", "#C9D8EE", "#E2C6E8"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="18" fill="${colors[storeIndex]}"/><circle cx="48" cy="38" r="23" fill="#fff" opacity=".7"/><text x="48" y="46" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#173225">${initials}</text><path d="M22 75h52" stroke="#173225" stroke-width="5" stroke-linecap="round" opacity=".4"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export function demoQuotes(items: GroceryItem[], pincode = "700048"): StoreQuote[] {
  return stores.map((store, storeIndex) => ({
    storeId: store.id,
    displayName: store.name,
    deliveryFee: store.delivery,
    coupon: store.coupon,
    live: false,
    offers: items.map((item): Offer => {
      const seed = hash(`${store.id}:${pincode}:${item.id}`);
      const grams = Number(item.minimumOrder?.match(/\d+/)?.[0] ?? 1);
      const base = item.minimumOrder?.toLowerCase().includes("kg") ? 70 + grams * 18 :
        item.minimumOrder?.toLowerCase().includes("ltr") ? 115 + grams * 55 : 38 + grams * 0.19;
      return {
        itemId: item.id,
        storeId: store.id,
        productName: `${item.name} (${item.minimumOrder ?? "standard pack"})`,
        brand: brands[(seed + storeIndex) % brands.length],
        imageUrl: demoImage(item.name, storeIndex),
        pack: item.minimumOrder ?? "standard pack",
        price: Math.round((base * (0.88 + ((seed + storeIndex) % 31) / 100)) * 100) / 100,
        // Demo mode keeps the full workbook catalog available so every store can
        // demonstrate a complete-basket comparison. Live adapters return real availability.
        available: true,
        productUrl: `${store.url}${encodeURIComponent(item.name)}`
      };
    })
  }));
}

export async function getQuotes(items: GroceryItem[], pincode: string): Promise<StoreQuote[]> {
  // Retailer implementations belong behind this boundary. Never scrape or replay private app APIs.
  // Demo mode is deliberately explicit until partner credentials are configured.
  return demoQuotes(items, pincode);
}

export const cartUrlFor = (storeId: StoreId) =>
  stores.find((store) => store.id === storeId)?.url.split("?")[0] ?? "#";
