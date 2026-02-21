# FoodHub Frontend

Client application for FoodHub. This app lets customers browse meals, manage cart, checkout orders, and track order status with a responsive UI.

## Tech Stack

- Framework: [React / Next.js]
- Language: [TypeScript / JavaScript]
- Styling: [Tailwind / CSS Modules / etc.]
- State/Data: [React Query / Redux / Context]
- Auth Handling: [JWT cookies / token storage strategy]
- API: `http://localhost:5000/api/v1`

Replace bracketed values with your exact frontend stack.

## Features

- Auth screens (register/login/logout)
- Meal catalog with filters/search
- Meal details page
- Cart add/update/remove
- Checkout flow (Stripe redirect)
- Order history and order details
- Role-aware UI (customer/provider/admin if applicable)
- Error/loading/empty states

## Folder Structure

```txt
src/
  app/ or pages/
  components/
  modules/
  hooks/
  services/
  utils/
  types/
```

## Environment Variables

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

If Stripe is handled on frontend, add publishable key:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Key Pages

- `/` Home
- `/meals` Meal listing
- `/meals/[id]` Meal details
- `/cart` Cart
- `/checkout` Checkout
- `/orders` My orders
- `/login` Login
- `/register` Register

## API Integration Notes

- Use Bearer token or secure cookie based on backend auth setup.
- Always attach credentials when required by backend CORS/auth policy.
- Handle 401/403 globally and redirect to login when session expires.

## Demo Credentials (Optional)

- Customer: `customer1@test.com / Test@1234`
- Provider: `provider1@test.com / Test@1234`
- Admin: set manually in DB (backend note)

## Deployment

- Frontend: [Vercel / Netlify]
- Backend: [Render / Railway / VPS]
- Set production env vars in deployment dashboard.
- Ensure `APP_URL` and CORS origin match deployed frontend domain.
