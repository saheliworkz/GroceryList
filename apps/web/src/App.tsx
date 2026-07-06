import { useEffect, useMemo, useState } from "react";

type StoreId = "bigbasket" | "amazon-fresh" | "instamart" | "blinkit" | "zepto";
type Item = { id: string; category: string; name: string; minimumOrder: string | null };
type Offer = {
  itemId: string; productName: string; brand: string; imageUrl: string; pack: string;
  price: number; productUrl: string;
};
type Plan = {
  storeId: StoreId; displayName: string; items: Offer[]; subtotal: number;
  deliveryFee: number; couponDiscount: number; total: number; cartUrl: string;
};
type Result = {
  stores: Plan[]; singleStoreOptions: Plan[]; unavailableItemIds: string[]; grandTotal: number;
  singleStoreBest: Plan | null; savingsVsSingleStore: number; mode: "demo" | "manual" | "live"; pincode: string;
};
type CartTask = {
  storeId: string; displayName: string; method: "partner-api" | "browser-assisted";
  cartUrl: string; items: Array<{ itemId: string; productName: string; brand: string; imageUrl: string; productUrl: string }>;
};
type DraftOffer = {
  status: "unverified" | "available" | "unavailable";
  brand: string; pack: string; price: string; productUrl: string; imageUrl: string;
};
type StoreDraft = { deliveryFee: string; couponDiscount: string };

const stores: Array<{ id: StoreId; name: string; search: (query: string) => string }> = [
  { id: "bigbasket", name: "BigBasket", search: (q) => `https://www.bigbasket.com/ps/?q=${encodeURIComponent(q)}` },
  { id: "amazon-fresh", name: "Amazon Fresh", search: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
  { id: "instamart", name: "Swiggy Instamart", search: (q) => `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(q)}` },
  { id: "blinkit", name: "Blinkit", search: (q) => `https://blinkit.com/s/?q=${encodeURIComponent(q)}` },
  { id: "zepto", name: "Zepto", search: (q) => `https://www.zeptonow.com/search?query=${encodeURIComponent(q)}` }
];
const storeHomeUrls: Record<StoreId, string> = {
  "bigbasket": "https://www.bigbasket.com/",
  "amazon-fresh": "https://www.amazon.in/fresh",
  "instamart": "https://www.swiggy.com/instamart",
  "blinkit": "https://blinkit.com/",
  "zepto": "https://www.zeptonow.com/"
};
const emptyOffer = (): DraftOffer => ({ status: "unverified", brand: "", pack: "", price: "", productUrl: "", imageUrl: "" });
const initialStoreDrafts = () => Object.fromEntries(stores.map((store) => [store.id, { deliveryFee: "0", couponDiscount: "0" }])) as Record<StoreId, StoreDraft>;
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const draftKey = "basketwise-manual-verification-v1";
const getDraftSafe = (drafts: Record<string, DraftOffer>, storeId: StoreId, itemId: string) =>
  drafts[`${storeId}:${itemId}`] ?? emptyOffer();

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [pincode, setPincode] = useState("700048");
  const [phase, setPhase] = useState<"select" | "verify" | "results">("select");
  const [activeStore, setActiveStore] = useState<StoreId>("bigbasket");
  const [drafts, setDrafts] = useState<Record<string, DraftOffer>>(() => {
    try { return JSON.parse(localStorage.getItem(draftKey) ?? "{}"); } catch { return {}; }
  });
  const [storeDrafts] = useState<Record<StoreId, StoreDraft>>(() => {
    try { return { ...initialStoreDrafts(), ...JSON.parse(localStorage.getItem(`${draftKey}-stores`) ?? "{}") }; }
    catch { return initialStoreDrafts(); }
  });
  const [assignedStores, setAssignedStores] = useState<Record<string, StoreId>>(() => {
    try { return JSON.parse(localStorage.getItem(`${draftKey}-assignments`) ?? "{}"); }
    catch { return {}; }
  });
  const [showShopLists, setShowShopLists] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [strategy, setStrategy] = useState<"single" | "split">("single");
  const [cartTasks, setCartTasks] = useState<CartTask[]>([]);

  useEffect(() => { fetch("/api/items").then((r) => r.json()).then((data) => setItems(data.items)); }, []);
  useEffect(() => { localStorage.setItem(draftKey, JSON.stringify(drafts)); }, [drafts]);
  useEffect(() => { localStorage.setItem(`${draftKey}-stores`, JSON.stringify(storeDrafts)); }, [storeDrafts]);
  useEffect(() => { localStorage.setItem(`${draftKey}-assignments`, JSON.stringify(assignedStores)); }, [assignedStores]);

  const selectedItems = useMemo(() => items.filter((item) => selected.has(item.id)), [items, selected]);
  const categories = useMemo(() => {
    const visible = items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
    return visible.reduce<Record<string, Item[]>>((grouped, item) => {
      (grouped[item.category] ??= []).push(item);
      return grouped;
    }, {});
  }, [items, query]);
  const verifiedCount = useMemo(() => stores.reduce((total, store) =>
    total + selectedItems.filter((item) => (drafts[`${store.id}:${item.id}`]?.status ?? "unverified") !== "unverified").length, 0
  ), [drafts, selectedItems]);
  const requiredCount = selectedItems.length * stores.length;
  const assignedCount = selectedItems.filter((item) => assignedStores[item.id]).length;
  const allAssignedToActiveStore = selectedItems.length > 0 &&
    selectedItems.every((item) => assignedStores[item.id] === activeStore);
  const assignedLists = stores.map((store) => ({
    store,
    items: selectedItems.filter((item) => assignedStores[item.id] === store.id).map((item) => ({
      item,
      offer: getDraftSafe(drafts, store.id, item.id)
    }))
  })).filter((group) => group.items.length);

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    setResult(null); setConfirmed(false); setCartTasks([]); setError("");
    return next;
  });
  const getDraft = (storeId: StoreId, itemId: string) => drafts[`${storeId}:${itemId}`] ?? emptyOffer();
  const updateDraft = (storeId: StoreId, itemId: string, patch: Partial<DraftOffer>) =>
    setDrafts((current) => ({ ...current, [`${storeId}:${itemId}`]: { ...(current[`${storeId}:${itemId}`] ?? emptyOffer()), ...patch } }));
  const setAvailability = (storeId: StoreId, itemId: string, status: DraftOffer["status"]) => {
    updateDraft(storeId, itemId, { status });
    if (status !== "available" && assignedStores[itemId] === storeId) {
      setAssignedStores((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
    }
    setShowShopLists(false);
  };

  const compareVerified = async () => {
    setError("");
    if (verifiedCount !== requiredCount) {
      setError(`Verify every selected item in all five stores first (${verifiedCount}/${requiredCount} completed).`);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        itemIds: selectedItems.map((item) => item.id),
        pincode,
        stores: stores.map((store) => ({
          storeId: store.id,
          displayName: store.name,
          deliveryFee: Number(storeDrafts[store.id].deliveryFee) || 0,
          couponDiscount: Number(storeDrafts[store.id].couponDiscount) || 0,
          offers: selectedItems.flatMap((item) => {
            const draft = getDraft(store.id, item.id);
            return draft.status !== "available" ? [] : [{
              itemId: item.id,
              productName: item.name,
              brand: draft.brand.trim() || "Unspecified",
              pack: draft.pack.trim() || "Standard",
              price: Number(draft.price) > 0 ? Number(draft.price) : 0.01,
              available: true,
              productUrl: store.search(item.name),
              imageUrl: ""
            }];
          })
        }))
      };
      const response = await fetch("/api/cart-sessions/manual", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error("Some verified items are invalid.");
      setResult(data.result);
      setStrategy(data.result.singleStoreBest ? "single" : "split");
      sessionStorage.setItem("cartSessionId", data.id);
      setPhase("results");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Comparison failed."); }
    finally { setLoading(false); }
  };

  const stageCarts = async () => {
    const id = sessionStorage.getItem("cartSessionId");
    if (!id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/cart-sessions/${id}/stage`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ strategy })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not prepare links.");
      setCartTasks(data.carts);
    } finally { setLoading(false); }
  };
  const confirm = async () => {
    const id = sessionStorage.getItem("cartSessionId");
    if (!id) return;
    const response = await fetch(`/api/cart-sessions/${id}/confirm`, { method: "POST" });
    if (response.ok) setConfirmed(true);
  };

  const displayedPlans = !result ? [] : strategy === "single" ? (result.singleStoreBest ? [result.singleStoreBest] : []) : result.stores;
  const displayedTotal = displayedPlans.reduce((sum, plan) => sum + plan.total, 0);

  return <main>
    <header className="hero">
      <div><span className="eyebrow">MANUALLY VERIFIED SHOPPING</span><h1>BasketWise</h1></div>
      <div className="count"><strong>{selected.size}</strong><span>selected</span></div>
      <p>Compare only the exact brands, packs, prices, and availability you verify at each retailer.</p>
    </header>

    {phase === "select" && <>
      <section className="toolbar">
        <input aria-label="Search groceries" placeholder="Search your grocery list…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="pincode-field"><span>Deliver to</span><input aria-label="Delivery pincode" inputMode="numeric" maxLength={6}
          value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
        <button className="ghost" onClick={() => setSelected(new Set(items.map((item) => item.id)))}>Select all</button>
        <button className="ghost" onClick={() => setSelected(new Set())}>Clear</button>
      </section>
      <section className="categories">{Object.entries(categories).map(([category, entries]) => <details key={category} open>
        <summary><span>{category}</span><small>{entries.length} items</small></summary>
        <div className="item-grid">{entries.map((item) => <label className={selected.has(item.id) ? "item checked" : "item"} key={item.id}>
          <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
          <span><strong>{item.name}</strong><small>{item.minimumOrder ?? "Choose exact pack"}</small></span>
        </label>)}</div>
      </details>)}</section>
      <div className="action-bar"><span>{selected.size ? `${selected.size} items ready` : "Choose at least one item"}</span>
        <button disabled={!selected.size || !/^[1-9][0-9]{5}$/.test(pincode)} onClick={() => setPhase("verify")}>Verify store prices</button></div>
    </>}

    {phase === "verify" && <section className="verification">
      <div className="verify-head"><div><span className="eyebrow">PINCODE {pincode}</span><h2>Verify each retailer</h2>
        <p>Open the retailer search, select the exact product for this location, then copy its current details.</p></div>
        <strong>{verifiedCount}/{requiredCount}</strong></div>
      <div className="store-tabs">{stores.map((store) => <button className={activeStore === store.id ? "active" : ""} key={store.id} onClick={() => setActiveStore(store.id)}>{store.name}</button>)}</div>
      {stores.filter((store) => store.id === activeStore).map((store) => <div key={store.id}>
        <div className="store-actions">
          <button className="ghost" onClick={() => {
            setDrafts((current) => {
              const next = { ...current };
              selectedItems.forEach((item) => {
                const key = `${store.id}:${item.id}`;
                next[key] = {
                  ...(next[key] ?? emptyOffer()),
                  status: allAssignedToActiveStore ? "unverified" : "available"
                };
              });
              return next;
            });
            setAssignedStores((current) => {
              const next = { ...current };
              selectedItems.forEach((item) => {
                if (allAssignedToActiveStore) delete next[item.id];
                else next[item.id] = store.id;
              });
              return next;
            });
            setShowShopLists(false);
          }}>{allAssignedToActiveStore ? `Unselect all for ${store.name}` : `Select all for ${store.name}`}</button>
        </div>
        <div className="verify-list">{selectedItems.map((item) => {
          const draft = getDraft(store.id, item.id);
          const searchQuery = `${item.name} ${item.minimumOrder ?? ""}`.trim();
          return <article className={`verify-card ${draft.status}`} key={item.id}>
            <div className="verify-title"><span><strong>{item.name}</strong></span>
              <a href={store.search(searchQuery)} target="_blank" rel="noreferrer">Search {store.name} ↗</a></div>
            <div className="status-buttons">
              <button className={assignedStores[item.id] === store.id ? "assigned" : ""}
                onClick={() => {
                  if (assignedStores[item.id] === store.id) {
                    updateDraft(store.id, item.id, { status: "unverified" });
                    setAssignedStores((current) => {
                      const next = { ...current };
                      delete next[item.id];
                      return next;
                    });
                  } else {
                    setAvailability(store.id, item.id, "available");
                    setAssignedStores((current) => ({ ...current, [item.id]: store.id }));
                  }
                  setShowShopLists(false);
                }}>
                {assignedStores[item.id] === store.id ? `Selected for ${store.name} ✓` : "Use this shop"}
              </button>
            </div>
          </article>;
        })}</div>
      </div>)}
      {error && <p className="form-error">{error}</p>}
      <div className="verify-actions"><button className="ghost" onClick={() => setPhase("select")}>Back to items</button>
        <button className="shop-list-button" disabled={assignedCount !== selectedItems.length}
          onClick={() => setShowShopLists(true)}>Generate shop lists ({assignedCount}/{selectedItems.length})</button>
        <button className="confirm" disabled={loading || verifiedCount !== requiredCount} onClick={compareVerified}>{loading ? "Comparing…" : "Compare verified offers"}</button></div>
      {showShopLists && <section className="assigned-shop-lists">
        <div className="assigned-head"><div><span className="eyebrow">YOUR FINAL ASSIGNMENT</span><h2>Shopping list by store</h2></div></div>
        <div className="assigned-grid">{assignedLists.map(({ store, items: assignedItems }) => <article key={store.id}>
          <h3>{store.name}</h3>
          <ul>{assignedItems.map(({ item }) => <li key={item.id}>
            <span><strong>{item.name}</strong></span>
          </li>)}</ul>
          <a href={storeHomeUrls[store.id]} target="_blank" rel="noreferrer">Open {store.name} ↗</a>
        </article>)}</div>
      </section>}
    </section>}

    {phase === "results" && result && <section className="results">
      <button className="back-link" onClick={() => setPhase("verify")}>← Edit verified offers</button>
      <div className="result-head"><div><span className="eyebrow">MANUALLY VERIFIED · PIN {result.pincode}</span><h2>Choose how to shop</h2></div>
        <div className="grand"><small>Selected plan total</small><strong>{money.format(displayedTotal)}</strong></div></div>
      <p className="notice">These results use only the values you entered. Recheck each retailer before purchasing because prices and stock can change.</p>
      <div className="strategy-picker">
        <label className={strategy === "single" ? "strategy active" : "strategy"}><input type="radio" checked={strategy === "single"} disabled={!result.singleStoreBest}
          onChange={() => { setStrategy("single"); setCartTasks([]); }} /><span><strong>Buy everything from one store</strong>
          <small>{result.singleStoreBest ? `${result.singleStoreBest.displayName} · ${money.format(result.singleStoreBest.total)}` : "No verified store has every item"}</small></span></label>
        <label className={strategy === "split" ? "strategy active" : "strategy"}><input type="radio" checked={strategy === "split"}
          onChange={() => { setStrategy("split"); setCartTasks([]); }} /><span><strong>Split for the lowest total</strong>
          <small>{result.stores.length} store(s) · {money.format(result.grandTotal)}</small></span></label>
      </div>
      <div className="plans">{displayedPlans.map((plan) => <article className="plan" key={plan.storeId}>
        <div className="plan-title"><h3>{plan.displayName}</h3><strong>{money.format(plan.total)}</strong></div>
        <ul>{plan.items.map((offer) => <li className="offer-row" key={offer.itemId}>
          <a href={offer.productUrl} target="_blank" rel="noreferrer"><strong>{offer.productName}</strong><small>{offer.brand} · {offer.pack}</small></a>
          <a className="offer-price" href={offer.productUrl} target="_blank" rel="noreferrer">
            {offer.imageUrl && <img src={offer.imageUrl} alt="" loading="lazy" />}
            <span><strong>{money.format(offer.price)}</strong><small>Open item ↗</small></span></a>
        </li>)}</ul>
        <div className="math"><span>Items {money.format(plan.subtotal)}</span><span>Delivery {money.format(plan.deliveryFee)}</span><span>Coupon −{money.format(plan.couponDiscount)}</span></div>
      </article>)}</div>
      {!!result.unavailableItemIds.length && <p className="warning">{result.unavailableItemIds.length} item(s) were not verified as available at any store.</p>}
      <div className="all-stores"><h3>Complete-basket store comparison</h3><p>Only stores where every selected item was verified as available appear here.</p>
        <div>{result.singleStoreOptions.map((plan, index) => <article className={index === 0 ? "store-option best" : "store-option"} key={plan.storeId}>
          <span><strong>{plan.displayName}</strong><small>{index === 0 ? "Lowest single-store total" : `${plan.items.length} items`}</small></span><strong>{money.format(plan.total)}</strong>
        </article>)}</div></div>
      <button className="confirm" onClick={stageCarts} disabled={loading}>{loading ? "Preparing…" : "Show verified product links"}</button>
      {!!cartTasks.length && <div className="cart-tasks"><h3>Open your verified products</h3>{cartTasks.map((task) => <article key={task.storeId}>
        <div><strong>{task.displayName}</strong></div><ul>{task.items.map((item) => <li key={item.itemId}><a href={item.productUrl} target="_blank" rel="noreferrer">{item.productName} · {item.brand}</a></li>)}</ul>
      </article>)}<button className="confirm" onClick={confirm} disabled={confirmed}>{confirmed ? "Purchase plan confirmed ✓" : "Confirm after reviewing retailer carts"}</button></div>}
    </section>}
  </main>;
}
