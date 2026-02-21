# [FoodHub Server API](https://foodhub-server-api-sigma.vercel.app/)

Production-oriented backend for the FoodHub meal-ordering platform. This API supports customer ordering, provider meal management, admin controls, and Stripe checkout.

## Roles

- `CUSTOMER`
- `PROVIDER`
- `ADMIN`

## Tech Stack

- Runtime: Node.js
- Language: TypeScript
- Framework: Express.js
- Database: PostgreSQL
- ORM: Prisma
- Auth: Better Auth + JWT/session flow
- Validation: Zod
- Payments: Stripe Checkout

## Features

- Authentication
  - Register/login/logout
  - Current user profile
  - Google login entrypoint
- User Management
  - `GET/PATCH /users/me`
  - Admin user list and account status update
- Categories
  - Public list
  - Admin CRUD
- Meals
  - Public list/details/reviews
  - Provider/Admin CRUD
- Providers
  - Public provider list and details
- Cart
  - Customer cart add/update/remove/list
- Orders
  - Customer order creation + own orders
  - Provider incoming orders
  - Admin all orders
  - Role-aware order detail and status update
- Payments
  - Stripe checkout session create
  - Stripe session confirmation and paid-order finalize
- Reviews
  - Customer review submission
  - Public meal review list

## Project Structure

```txt
src/
  app.ts
  server.ts
  routes/
  modules/
    auth/
    user/
    category/
    meal/
    provider/
    cart/
    order/
    payment/
    review/
  middlewares/
  lib/
  utils/
prisma/
  schema/
  migrations/
docs/
  api-test-data.md
  postman/
```

## Environment Variables

Copy `.env.example` to `.env` and set values:

```env
PORT=5000
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/foodhub?schema=public
JWT_SECRET=change_me
BETTER_AUTH_SECRET=change_me
BETTER_AUTH_URL=http://localhost:5000
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_SUCCESS_URL=http://localhost:3000/payment-success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:3000/cart
```

## Getting Started

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

API base URL:

```txt
http://localhost:5000/api/v1
```

Production API base URL:

```txt
https://foodhub-server-api-sigma.vercel.app/
```

## Production Build

```bash
npm run build
npm start
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:migrate
npm run prisma:validate
npm run seed:test-users
npm run seed:test-meals
npm run seed:test-cart-orders
```

## Main Routes (Summary)

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google-login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET/PATCH /users/me`
- `GET /users` (admin)
- `PATCH /users/:id/status` (admin)
- `GET /categories`
- `POST/PATCH/DELETE /categories` (admin)
- `GET /meals`
- `GET /meals/:id`
- `POST/PATCH/DELETE /meals` (provider/admin)
- `GET /providers`
- `GET /providers/:id`
- `GET/POST /cart` (customer)
- `PATCH/DELETE /cart/:id` (customer)
- `POST /orders` (customer)
- `GET /orders/my` (customer)
- `GET /orders/incoming` (provider)
- `GET /orders` (admin)
- `GET /orders/:id`
- `PATCH /orders/:id/status`
- `POST /payments/stripe/checkout-session` (customer)
- `POST /payments/stripe/confirm-session` (customer)
- `POST /reviews` (customer)
- `GET /reviews/meal/:mealId`

## Testing

Use included Postman assets:

- `docs/postman/FoodHub-Assignment.postman_collection.json`
- `docs/postman/FoodHub-Assignment.postman_environment.json`
- `docs/api-test-data.md`

## Admin Promotion Note

Self-registration as `ADMIN` is disabled. Promote through DB manually:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your_admin_email@example.com';
```
