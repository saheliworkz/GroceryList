import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { z } from "zod";
import { groceries } from "./groceries.js";
import { optimize } from "./optimizer.js";
import { getQuotes } from "./providers.js";
import { storeIds, type OptimizationResult, type StorePlan, type StoreQuote } from "./types.js";

const app = express();
const port = Number(process.env.PORT ?? 8080);
const sessions = new Map<string, {
  createdAt: string;
  status: "review" | "staged" | "confirmed";
  strategy?: "split" | "single";
  result: OptimizationResult;
}>();
const defaultPincode = process.env.DEFAULT_PINCODE ?? "700048";
const itemIdsSchema = z.object({
  itemIds: z.array(z.string()).min(1).max(75),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid six-digit Indian pincode.").default(defaultPincode)
});
const strategySchema = z.object({ strategy: z.enum(["split", "single"]) });
const manualSessionSchema = itemIdsSchema.extend({
  stores: z.array(z.object({
    storeId: z.enum(storeIds),
    displayName: z.string().min(1).max(80),
    deliveryFee: z.number().min(0).max(10000),
    couponDiscount: z.number().min(0).max(100000),
    offers: z.array(z.object({
      itemId: z.string(),
      productName: z.string().min(1).max(300),
      brand: z.string().min(1).max(120),
      pack: z.string().min(1).max(80),
      price: z.number().positive().max(1000000),
      available: z.boolean(),
      productUrl: z.string().url(),
      imageUrl: z.union([z.string().url(), z.literal("")])
    })).max(75)
  })).length(storeIds.length)
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/items", (_req, res) => res.json({ items: groceries }));

app.post("/api/compare", async (req, res) => {
  const parsed = itemIdsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const selected = groceries.filter((item) => parsed.data.itemIds.includes(item.id));
  const result = optimize(parsed.data.itemIds, await getQuotes(selected, parsed.data.pincode), parsed.data.pincode);
  res.json(result);
});

app.post("/api/cart-sessions", async (req, res) => {
  const parsed = itemIdsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const selected = groceries.filter((item) => parsed.data.itemIds.includes(item.id));
  const result = optimize(parsed.data.itemIds, await getQuotes(selected, parsed.data.pincode), parsed.data.pincode);
  const id = crypto.randomUUID();
  sessions.set(id, { createdAt: new Date().toISOString(), status: "review", result });
  res.status(201).json({ id, status: "review", result });
});

app.post("/api/cart-sessions/manual", (req, res) => {
  const parsed = manualSessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const requestedIds = new Set(parsed.data.itemIds);
  const quotes: StoreQuote[] = parsed.data.stores.map((store) => ({
    storeId: store.storeId,
    displayName: store.displayName,
    deliveryFee: store.deliveryFee,
    coupon: store.couponDiscount > 0
      ? { code: "MANUALLY_VERIFIED", minimumSubtotal: 0, discount: store.couponDiscount }
      : null,
    live: false,
    offers: store.offers
      .filter((offer) => requestedIds.has(offer.itemId))
      .map((offer) => ({ ...offer, storeId: store.storeId }))
  }));
  const result = optimize(parsed.data.itemIds, quotes, parsed.data.pincode, "manual");
  const id = crypto.randomUUID();
  sessions.set(id, { createdAt: new Date().toISOString(), status: "review", result });
  res.status(201).json({ id, status: "review", result });
});

app.post("/api/cart-sessions/:id/stage", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Review session not found." });
  const parsed = strategySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const plans: StorePlan[] = parsed.data.strategy === "single"
    ? (session.result.singleStoreBest ? [session.result.singleStoreBest] : [])
    : session.result.stores;
  if (!plans.length) return res.status(409).json({ error: "No complete cart plan is available for that option." });

  session.strategy = parsed.data.strategy;
  session.status = "staged";
  res.json({
    id: req.params.id,
    status: session.status,
    strategy: session.strategy,
    carts: plans.map((plan) => ({
      storeId: plan.storeId,
      displayName: plan.displayName,
      method: session.result.mode === "live" ? "partner-api" : "browser-assisted",
      cartUrl: plan.cartUrl,
      items: plan.items.map((item) => ({
        itemId: item.itemId,
        productName: item.productName,
        brand: item.brand,
        imageUrl: item.imageUrl,
        productUrl: item.productUrl
      }))
    }))
  });
});

app.post("/api/cart-sessions/:id/confirm", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Review session not found." });
  session.status = "confirmed";
  // Confirmation records intent only. Payment/order placement must occur through an approved retailer API
  // or the retailer's own checkout page; the app never stores payment credentials.
  res.json({ id: req.params.id, status: session.status, result: session.result });
});

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(moduleDirectory, "../../web/dist");
app.use(express.static(webDist));
app.get("*splat", (_req, res) => res.sendFile(path.join(webDist, "index.html")));

app.listen(port, "0.0.0.0", () => console.log(`Grocery agent listening on :${port}`));
