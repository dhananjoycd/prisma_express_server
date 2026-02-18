# FoodHub Server API

Backend API for **FoodHub** meal ordering platform with role-based access:
- `CUSTOMER`
- `PROVIDER`
- `ADMIN`

This server supports authentication, meal browsing, cart, ordering, reviews, provider discovery, and admin controls.

## Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Better Auth (email/password + Google OAuth start flow)
- **Validation:** Zod
- **Security:** Role-based route guards + account status checks

## Core Features

- Auth: register, login, logout, current user, Google sign-in start
- Users: profile read/update, admin user list and suspend/activate
- Categories: CRUD (admin write, public read)
- Meals: public browse/details + provider/admin meal management
- Providers: public provider list and provider details with menu
- Cart: customer add/update/remove/list
- Orders:
  - customer create + own orders
  - provider incoming orders
  - admin all orders
  - order details by id with access control
  - guarded status transitions + customer pending cancel
- Reviews: customer review (only after delivered order), public meal reviews

## Project Structure

```txt
src/
  app.ts
  server.ts
  routes/
  modules/
    auth/
    user/
    provider/
    category/
    meal/
    cart/
    order/
    review/
  middlewares/
  lib/
prisma/
  schema/
docs/
  api-test-data.md
  postman/
```

## Environment Variables

Use `.env.example` as reference:

```env
PORT=5000
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/foodhub?schema=public
BETTER_AUTH_SECRET=change_me
BETTER_AUTH_URL=http://localhost:5000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Installation & Run

```bash
npm install
npm run prisma:migrate
npm run prisma:generate
npm run dev
```

Build for production:

```bash
npm run build
npm start
```

## API Base URL

`http://localhost:5000/api/v1`

## How It Works

1. **Authentication**
   - Register/login through Better Auth APIs wrapped by custom controllers.
   - On successful login, you receive a bearer token for protected routes.

2. **Authorization**
   - Custom `auth(...)` middleware reads session/user and enforces role checks.
   - Suspended users are blocked automatically.

3. **Business Rules**
   - Only providers/admin can manage meals.
   - Only customers can manage cart and create reviews.
   - Reviews allowed only when a delivered order contains that meal.
   - Order status transitions are validated to prevent illegal jumps.
   - Customers can only cancel pending orders.

## Example Requests

### Register Customer

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "Customer One",
  "email": "customer1@test.com",
  "password": "Test@1234",
  "role": "CUSTOMER"
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "customer1@test.com",
  "password": "Test@1234"
}
```

### Create Meal (Provider)

```http
POST /api/v1/meals
Authorization: Bearer <PROVIDER_SESSION_TOKEN>
Content-Type: application/json

{
  "categoryId": "<CATEGORY_ID>",
  "title": "Chicken Burger",
  "price": 8.99
}
```

### Update Order Status (Provider/Admin/Customer rules apply)

```http
PATCH /api/v1/orders/<ORDER_ID>/status
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "status": "PREPARING"
}
```

## Testing

Use included Postman files:

- `docs/postman/FoodHub-Assignment.postman_collection.json`
- `docs/postman/FoodHub-Assignment.postman_environment.json`

Also see:

- `docs/api-test-data.md`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run prisma:migrate
npm run prisma:generate
npm run prisma:validate
```

## Admin Setup Note

Self-registration as admin is disabled. Promote a user manually in DB:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'customer1@test.com';
```

