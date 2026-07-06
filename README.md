# BasketWise

A mobile-first grocery comparison and basket-splitting app seeded from `GroceryList.xlsx` (75 items). Users select items, compare retailer offers, review the least-cost split, open retailer checkouts, and explicitly confirm their purchase plan.

## Important integration boundary

The included provider returns clearly labeled demo quotes. Do **not** scrape retailer sites or call undocumented mobile APIs. Connect only partner-approved integrations inside `apps/api/src/providers.ts`. Swiggy publishes an Instamart MCP/API program; production access is still subject to its onboarding. BigBasket, Amazon Fresh India, Blinkit, and Zepto adapters remain disabled until you obtain written API/partner access.

The app does not store passwords or payment details, and confirmation never charges a user. Where transactional APIs are unavailable, it opens retailer-owned product/search or checkout pages.

## Run locally

```bash
cp .env.example .env
corepack enable
pnpm install
pnpm dev
```

The web app runs at `http://localhost:5173`; its API proxy targets port 8080.

## Test and build

```bash
pnpm test
pnpm build
docker compose up --build
```

Open `http://localhost` from a computer or Android phone on the same network. The Vite PWA manifest makes the production site installable from Chrome's “Add to Home screen” flow.

## Optimizer

For five stores, the optimizer evaluates every non-empty store subset (31 possibilities). For each subset it picks the cheapest available item offers, applies store delivery fees and eligible coupon discounts, then compares totals. It also calculates the best store that can fulfill the entire selected basket.

## GitHub

```bash
git init
git add .
git commit -m "Build BasketWise grocery optimizer"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

## AWS EC2

1. Launch an Amazon Linux 2023 instance (an ARM or x86 `t3.small`/`t4g.small` is a practical starting point).
2. Allow inbound SSH only from your IP and HTTP/HTTPS from the internet.
3. Paste `deploy/ec2-user-data.sh` into user data.
4. Clone the repository to `/opt/basketwise`, create `.env`, and run `docker compose up -d --build`.
5. Point a domain to the Elastic IP and put HTTPS in front using an Application Load Balancer + ACM, or a reverse proxy such as Caddy.

For production, use AWS Secrets Manager or SSM Parameter Store for credentials, CloudWatch for logs, and a CI/CD role using GitHub OIDC instead of long-lived AWS keys.
