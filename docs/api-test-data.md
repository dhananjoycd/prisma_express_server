# FoodHub API Test Data

Base URL:
`http://localhost:5000/api/v1`

## 1) Register Users

### Register Customer
POST `/auth/register`
```json
{
  "name": "Customer One",
  "email": "customer1@test.com",
  "password": "Test@1234",
  "role": "CUSTOMER"
}
```

### Register Provider
POST `/auth/register`
```json
{
  "name": "Provider One",
  "email": "provider1@test.com",
  "password": "Test@1234",
  "role": "PROVIDER"
}
```

## 2) Login

### Customer Login
POST `/auth/login`
```json
{
  "email": "customer1@test.com",
  "password": "Test@1234"
}
```

### Provider Login
POST `/auth/login`
```json
{
  "email": "provider1@test.com",
  "password": "Test@1234"
}
```

Save returned tokens:
- `CUSTOMER_SESSION_TOKEN`
- `PROVIDER_SESSION_TOKEN`

## 2.2) Google Login

POST `/auth/google-login`
```json
{
  "callbackURL": "http://localhost:3000/auth/callback"
}
```

Response returns Google OAuth URL. Redirect browser to that URL to complete login.

## 3) Create Admin (one-time, for admin routes)

You cannot self-register as ADMIN from API.

Option A: after creating `customer1@test.com`, update role in DB:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'customer1@test.com';
```
Then login again and use token as `ADMIN_SESSION_TOKEN`.

## 4) Category APIs (ADMIN token)

### Create Category
POST `/categories`
Headers: `Authorization: Bearer ADMIN_SESSION_TOKEN`
```json
{
  "name": "Fast Food",
  "description": "Quick and tasty meals"
}
```

### Create Category 2
POST `/categories`
Headers: `Authorization: Bearer ADMIN_SESSION_TOKEN`
```json
{
  "name": "Healthy",
  "description": "Low calorie options"
}
```

### List Categories
GET `/categories`

Keep one `categoryId` for meal creation.

## 5) Meal APIs (PROVIDER token)

### Create Meal
POST `/meals`
Headers: `Authorization: Bearer PROVIDER_SESSION_TOKEN`
```json
{
  "categoryId": "<CATEGORY_ID>",
  "title": "Chicken Burger",
  "description": "Grilled chicken burger",
  "price": 8.99,
  "imageUrl": "https://example.com/burger.jpg",
  "isAvailable": true
}
```

### List Meals
GET `/meals`

Keep one `mealId`.

### Public Providers
GET `/providers`

### Provider Details
GET `/providers/<PROVIDER_ID>`

## 6) Cart APIs (CUSTOMER token)

### Add To Cart
POST `/cart`
Headers: `Authorization: Bearer CUSTOMER_SESSION_TOKEN`
```json
{
  "mealId": "<MEAL_ID>",
  "quantity": 2
}
```

### Get Cart
GET `/cart`
Headers: `Authorization: Bearer CUSTOMER_SESSION_TOKEN`

## 7) Order APIs

### Place Order (CUSTOMER)
POST `/orders`
Headers: `Authorization: Bearer CUSTOMER_SESSION_TOKEN`
```json
{
  "deliveryAddress": "123 Main St, City",
  "note": "Call me before delivery"
}
```

### Customer Orders
GET `/orders/my`
Headers: `Authorization: Bearer CUSTOMER_SESSION_TOKEN`

### Order Details
GET `/orders/<ORDER_ID>`
Headers: `Authorization: Bearer CUSTOMER_SESSION_TOKEN`

### Provider Incoming Orders
GET `/orders/incoming`
Headers: `Authorization: Bearer PROVIDER_SESSION_TOKEN`

From incoming orders copy `orderId`.

### Update Order Status (PROVIDER)
PATCH `/orders/<ORDER_ID>/status`
Headers: `Authorization: Bearer PROVIDER_SESSION_TOKEN`
```json
{
  "status": "DELIVERED"
}
```

### Cancel Pending Order (CUSTOMER)
PATCH `/orders/<ORDER_ID>/status`
Headers: `Authorization: Bearer CUSTOMER_SESSION_TOKEN`
```json
{
  "status": "CANCELED"
}
```

## 8) Review APIs (CUSTOMER token)

Review works only after order status is `DELIVERED`.

### Create Review
POST `/reviews`
Headers: `Authorization: Bearer CUSTOMER_SESSION_TOKEN`
```json
{
  "mealId": "<MEAL_ID>",
  "rating": 5,
  "comment": "Great taste and fast delivery"
}
```

### Meal Reviews
GET `/reviews/meal/<MEAL_ID>`

## 9) User/Admin APIs

### My Profile
GET `/users/me`
Headers: `Authorization: Bearer CUSTOMER_SESSION_TOKEN`

### List Users (ADMIN)
GET `/users`
Headers: `Authorization: Bearer ADMIN_SESSION_TOKEN`

### Suspend/Activate User (ADMIN)
PATCH `/users/<USER_ID>/status`
Headers: `Authorization: Bearer ADMIN_SESSION_TOKEN`
```json
{
  "status": "SUSPENDED"
}
```
