# Furnifor

An online furniture shop with five warehouses around Indonesia. Customers browse, add things to their cart, pick a courier and pay by bank transfer. Every order ships from the warehouse closest to the customer. If that warehouse is short of something, another one sends it over first, so the order never gets split.

Behind the shop there's an admin panel. Warehouse admins check payment receipts, ship orders and keep their stock up to date. The super admin sees every warehouse and also manages the catalog, the warehouses and the other admins.

This started in 2023 as a team final project at the Purwadhika bootcamp. In 2026 I rebuilt most of it. The list of changes is further down.

The front end is React (Vite + Tailwind) and the back end is Express with MySQL through Sequelize. Both live in this repo.

## What it does

**Customers can**

- browse by room, search, filter by price and sort
- save things to a wishlist and keep a cart, both stored on their account
- sign up with email (and confirm it by email) or with Google
- save several delivery addresses
- see delivery prices for JNE, POS and TIKI at checkout
- pay by bank transfer and upload a photo of the receipt
- follow each order from payment to delivery, cancel it before it's paid, and confirm when it arrives

**Warehouse admins can**

- accept or reject payment receipts, ship orders and cancel them
- add or remove stock, with a note for each change
- send stock to another warehouse, and approve stock coming in
- see the stock history and a sales report for their own warehouse

**The super admin can also**

- add, edit and hide products (up to 6 photos each) and categories
- add warehouses and warehouse admins
- see every warehouse at once, on the dashboard and in the reports

**How an order moves**

| Status | What happens next |
| --- | --- |
| Waiting for payment | The customer has 24 hours to transfer and upload the receipt, or the order is cancelled automatically |
| Checking payment | A warehouse admin accepts or rejects the receipt |
| Payment rejected | The customer sees the reason and can upload a new receipt |
| Being prepared | Stock has been taken from the shelf. If the warehouse didn't have enough, the nearest other warehouse sent the rest automatically. The admin ships it. |
| On the way | The customer gets a tracking number. They confirm when it arrives, or it's marked as delivered after 7 days. |
| Delivered / Cancelled | Done. Cancelling puts any reserved stock back. |

Stock that belongs to an open order is "reserved", so it can't be sold twice or sent to another warehouse.

## Quick start with Docker

You only need [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or OrbStack). Make sure it's running, then:

```bash
docker compose up --build
```

The first run takes a few minutes. When the logs settle down, open:

| What | Address |
| --- | --- |
| The shop | http://localhost:3200 |
| The admin panel | http://localhost:3200/admin |
| The API | http://localhost:8200/api |
| Test inbox (emails the app sends) | http://localhost:8027 |
| MySQL | `localhost:3309`, user `furnifor`, password `furnifor` |

These ports are different from the Online Library and Attendance projects, so all three can run at the same time.

You don't need a `.env` file for this, and you don't need any API keys. The defaults are already in `docker-compose.yml`.

### Demo accounts

On first start the database gets a demo shop: 5 warehouses, 40 products in 8 rooms, a few customers and about seven months of orders. All demo accounts use the password **`Password123!`**

**Shop** (log in with the email or the username)

| Email | Who | What's already set up |
| --- | --- | --- |
| `rani@example.com` | Rani | one order waiting for payment, one waiting for the admin to check, plenty of past orders |
| `dimas@example.com` | Dimas | an order being prepared |
| `sekar@example.com` | Sekar | a rejected payment to re-upload |
| `yoga@example.com` | Yoga | an order on the way, ready to confirm |
| `nina@example.com` | Nina | hasn't confirmed her email, so she can't check out yet |

**Admin panel** (log in with the username)

| Username | Who |
| --- | --- |
| `superadmin` | super admin, sees everything |
| `admin.jaktim` | Furnifor Jakarta Timur |
| `admin.bsd` | Furnifor BSD |
| `admin.surabaya` | Furnifor Surabaya |
| `admin.medan` | Furnifor Medan |
| `admin.makassar` | Furnifor Makassar |

All names, products, prices and stores are made up. The login pages have a button that fills in a demo account for you.

**Things worth trying**

- Log in as `admin.jaktim` and accept Rani's payment. Her order has a sideboard that only Surabaya stocks, so an automatic transfer shows up under Transfers and in the stock history.
- Log in as `admin.medan` and approve the pending transfer of armchairs from BSD.
- Order something as a customer, then open the test inbox to see the emails.
- Look at "Raja Ampat Hanging Chair" (out of stock) and "Bromo 3-Door Wardrobe" (only a few left).

To stop the app, press `Ctrl+C`, or run `docker compose down`. To wipe the database and uploaded photos and start over:

```bash
docker compose down -v
docker compose up --build
```

## Changing settings

All settings live in one `.env` file at the root of the project. Make your own copy first:

```bash
cp .env.example .env
```

Then change what you need and run `docker compose up --build` again. The ones you're most likely to touch:

| Setting | Default | What it's for |
| --- | --- | --- |
| `CLIENT_PORT` | `3200` | where the shop opens |
| `API_PORT` | `8200` | where the API listens |
| `DB_PORT` | `3309` | MySQL port on your machine |
| `JWT_SECRET` | dev value | secret used to sign login tokens. Use something long and random (`openssl rand -hex 32`). |
| `PAYMENT_WINDOW_HOURS` | `24` | how long customers have to pay before the order is cancelled |
| `AUTO_COMPLETE_DAYS` | `7` | days after shipping before an order counts as delivered |
| `BANK_ACCOUNT` | a made-up BCA account | shown on the payment page |
| `DOCKER_APP_URL` | `http://localhost:3200` | the address used in email links. Change it if you change `CLIENT_PORT`. |
| `SEED_DEMO_DATA` | `true` | set to `false` to start with only the super admin and the list of provinces and cities |

Seeders only run once per database. If you change `SEED_DEMO_DATA` after the first start, wipe the database (`docker compose down -v`) for it to take effect.

### Optional API keys

The app works fine with none of these. Each key just swaps a simple built-in version for the real service.

| Key | Without it | With it |
| --- | --- | --- |
| `RAJAONGKIR_API_KEY` | delivery prices are estimated from the distance and the weight | real JNE, POS and TIKI prices from [RajaOngkir by Komerce](https://collaborator.komerce.id) |
| `OPENCAGE_API_KEY` | addresses are placed at the centre of their city | exact positions from [OpenCage](https://opencagedata.com), so "nearest warehouse" is more precise |
| `GOOGLE_CLIENT_ID` | the Google button is hidden | customers can sign up and log in with Google |

For Google, create an OAuth client of type "Web application" in the [Google Cloud console](https://console.cloud.google.com/apis/credentials) and add `http://localhost:3200` and `http://localhost:5175` as authorised JavaScript origins. Only the client ID is needed, there's no secret to keep. The server checks every Google login with Google itself before trusting it.

If RajaOngkir is down or the key runs out of quota, checkout quietly falls back to the estimated prices.

### Email

Emails (confirm your email, reset password, order updates) go to [Mailpit](http://localhost:8027) by default, so you can read them without setting anything up. If sending fails, the app keeps working.

To send real email, fill in the SMTP settings in `.env`. For Gmail, `SMTP_USER` is your full Gmail address and `SMTP_PASSWORD` is an [App Password](https://support.google.com/accounts/answer/185833), not your normal password.

## Running without Docker (for development)

This gives you hot reload on both sides. You'll need Node.js 22 or newer. MySQL still runs in Docker because that's the easiest way to get it:

```bash
cp .env.example .env
npm run setup
npm run db
npm run db:setup
npm run dev
```

The commands, in order:

1. `npm run setup` installs packages for the root, server and client.
2. `npm run db` starts MySQL and Mailpit in Docker. Wait until `docker compose ps` shows `db` as `healthy` before the next step.
3. `npm run db:setup` creates the tables and adds the demo data.
4. `npm run dev` starts the API and the React dev server.

Then open http://localhost:5175. The dev server forwards `/api` and `/uploads` to the API on port 8200.

If you'd rather use a MySQL you already have, create an empty database and set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` in `.env` before `npm run db:setup`.

| Command | What it does |
| --- | --- |
| `npm run db:reset` | undoes every migration, then runs them and the seeders again |
| `npm run build` | builds the React app into `client/dist` |
| `npm start` | runs the API. If `client/dist` exists it serves the shop too, all on port 8200. |

## Project layout

```
.
├── docker-compose.yml     MySQL, Mailpit, API and shop
├── .env.example           every setting, with comments
├── client/                React app (Vite)
│   ├── src/pages/         shop/, auth/, account/ and admin/ screens
│   ├── src/components/    layouts, forms, and the furniture drawings
│   ├── src/auth/          who's logged in, for the shop and for the admin panel
│   ├── src/lib/api.js     axios setup, adds the login token to every request
│   └── nginx.conf         serves the built app and forwards /api in Docker
└── server/                Express API
    ├── src/routes/        every endpoint, in one file
    ├── src/controllers/   what each endpoint does (admin/ for the panel)
    ├── src/services/      stock and transfers, shipping prices, orders, Google login
    ├── src/schedule/      cancels unpaid orders and completes delivered ones
    ├── src/middleware/    login checks, uploads, input checks
    ├── src/migrations/    database changes, run in order
    ├── src/seeders/       roles, provinces and cities, the super admin, the demo shop
    └── src/data/          the province/city list and the demo catalog
```

## API

Every endpoint is under `/api`. Endpoints that need a login expect an `Authorization: Bearer <token>` header. Customers and admins have separate logins and separate tokens.

**Shop**

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/config` | which optional services are switched on, couriers, payment window |
| GET | `/categories` | rooms with product counts |
| GET | `/products` | query: `q`, `category`, `min`, `max`, `in_stock`, `sort` (`newest`, `popular`, `price_asc`, `price_desc`, `name`), `page`, `size` |
| GET | `/products/suggest?q=` | a few names for the search box |
| GET | `/products/:id` | one product and a few related ones |
| GET | `/regions/provinces`, `/regions/cities?province=` | for address forms |
| GET | `/stores` | the warehouses |
| POST | `/auth/register`, `/auth/login`, `/auth/google` | returns a token and the user. Login takes `{ identifier, password }`, where identifier is an email or username. |
| POST | `/auth/verify`, `/auth/resend-verification` | confirm an email |
| POST | `/auth/forgot-password`, `/auth/reset-password` | reset a password |
| GET | `/auth/me` | the logged-in customer |
| PATCH | `/account/profile`, `/account/password` | profile (multipart, optional `avatar`) and password |
| GET, POST, PATCH, DELETE | `/account/addresses[/:id]` | addresses. `PATCH /account/addresses/:id/primary` sets the main one. |
| GET, POST, PATCH, DELETE | `/cart[/:productId]` | the cart |
| GET, POST, DELETE | `/wishlist[/:productId]` | the wishlist |
| POST | `/checkout/quote` | `{ address_id }`, returns the warehouse it ships from and the delivery options |
| POST | `/orders` | `{ address_id, courier, service }`. Prices are worked out on the server. |
| GET | `/orders`, `/orders/:invoice` | the customer's orders |
| POST | `/orders/:invoice/payment` | upload the receipt (multipart field `proof`) |
| POST | `/orders/:invoice/cancel`, `/orders/:invoice/received` | cancel before paying, or confirm delivery |

**Admin panel** (under `/api/admin`, admin token)

| Method | Path | What it does |
| --- | --- | --- |
| POST | `/auth/login` | `{ username, password }` |
| GET | `/dashboard`, `/reports/sales` | numbers for the dashboard and the sales report |
| GET | `/orders`, `/orders/:id` | orders, with counts per status |
| POST | `/orders/:id/accept`, `/reject`, `/ship`, `/cancel` | move an order along. Reject and cancel take an optional `{ reason }`. |
| GET, POST, PATCH, DELETE | `/products`, `/categories`, `/warehouses` | catalog and warehouses. Changes are super admin only. |
| GET, POST, PATCH, DELETE | `/stocks` | stock per warehouse. `PATCH` takes `{ change, note }`, like `{ "change": -2, "note": "Damaged" }`. |
| GET, POST | `/transfers`, `/transfers/:id/approve`, `/transfers/:id/reject` | stock transfers between warehouses |
| GET | `/stock-history` | every stock change |
| GET, POST, PATCH, DELETE | `/admins` | warehouse admins (super admin only) |
| GET | `/users` | customers |
| GET | `/health` | (at `/api/health`) returns ok if the API can reach the database |

Warehouse admins only ever see and change their own warehouse. Errors always come back as `{ "message": "..." }`, written so it can be shown straight to the user.

## What changed in the 2026 update

The update covers:

- **Repo:** Lerna, the bootcamp's pm2 config and its GitHub deploy workflow are gone. The app now lives in plain `server/` and `client/` folders.
- **Client:** moved from Create React App to Vite. Upgraded to React 19, React Router 7, Tailwind 4 and axios 1. Redux, Formik, Yup, MUI, Flowbite, Chart.js, Recharts, Firebase, moment and three carousel libraries are gone. The client went from 39 dependencies to 10.
- **UI:** full redesign of both the shop and the admin panel. It works on a phone.
- **Product photos:** the old product photos looked like they came from IKEA's website, so I removed all of them (over 400 images). Products without photos now show a simple drawing of the piece instead. Admins can still upload real photos.
- **Server:** upgraded to Express 5, multer 2, nodemailer 7 and bcryptjs, and added helmet and request logging.
- **Security fixes:**
  - Google login used to trust whatever the browser sent, so anyone could log in as any Google user. The server now checks the login with Google.
  - The order total and delivery price came from the browser, so a customer could set their own price. The server now works them out.
  - Customers could change their own order status (for example to "completed") through the API.
  - Email confirmation and password reset tokens were sent back in API responses. They now only go by email, and they expire.
  - Warehouse admins could see and change other warehouses' orders and stock.
- **Bug fixes:**
  - Provinces and cities were never seeded, so nobody could add an address on a fresh install. They now come from an up-to-date list (38 provinces, 514 cities).
  - The address table's province column pointed at the cities table.
  - Order lines didn't keep the price, so changing a product's price changed old orders too.
  - When accepting an order needed stock from another warehouse, that transfer ran outside the order's database transaction, so a failure could leave things half done. It now all happens in one transaction, with a transfer and a history entry for every unit moved.
  - Unpaid orders waited 7 days before being cancelled, holding their stock the whole time. It's now 24 hours, and you can change it.
  - Shipped orders stayed "shipped" forever if the customer never confirmed. They now complete on their own after 7 days.
  - Several packages the code used weren't in `package.json`.
- **Shipping:** RajaOngkir moved to a new API run by Komerce, and the old one the app used no longer works. The app now uses the new one, and falls back to estimated prices when there's no key.
- **Setup:** Docker Compose for everything, one `.env` file, Mailpit for test emails, and demo data that tells a story (orders in every status, transfers, low stock).

**If you still have a database from the old version:** start fresh. The old one has no provinces or cities, and the old seeders weren't tracked.

## Credits

The province and city list comes from [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) (MIT licence), based on Kepmendagri 2025.

## Troubleshooting

**`Cannot connect to the Docker daemon`.** Docker Desktop isn't running. Open it (`open -a Docker` on a Mac), wait for it to start, and try again.

**"Port is already allocated".** Something else is using that port. Change `CLIENT_PORT`, `API_PORT` or `DB_PORT` in `.env`.

**The shop says it can't reach the server.** The API is probably still starting, or it couldn't connect to MySQL. Check `docker compose logs server`.

**"Place order" is greyed out.** The customer hasn't confirmed their email. The confirmation link is in the test inbox at http://localhost:8027.

**Delivery prices look rounded.** That's the built-in estimate. Add a `RAJAONGKIR_API_KEY` for real prices.

**The Google button doesn't show up.** `GOOGLE_CLIENT_ID` is empty, or the address you opened isn't in the OAuth client's authorised origins.

**The link in an email goes to the wrong address.** Set `DOCKER_APP_URL` (Docker) or `APP_URL` (`npm run dev`) to the address you open the site at.
