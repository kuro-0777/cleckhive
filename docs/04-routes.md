# 04 — Routes

Defined in `routes/api.php`. All routes are under `/api/`.

## Public routes (no token required)

| Method | URL                                              | Controller                         |
|--------|--------------------------------------------------|------------------------------------|
| POST   | `/oracle-login`                                  | `AuthController@login`             |
| POST   | `/send-welcome-email`                            | inline closure                     |
| GET    | `/shops`                                         | `ShopController@index`             |
| GET    | `/shops/{id}`                                    | `ShopController@show`              |
| GET    | `/shops/{shopId}/products`                       | `ProductController@byShop`         |
| GET    | `/categories`                                    | `CategoryController@index`         |
| GET    | `/categories/{id}`                               | `CategoryController@show`          |
| GET    | `/categories/{categoryId}/products`              | `ProductController@byCategory`     |
| GET    | `/products`                                      | `ProductController@index`          |
| GET    | `/products/{id}`                                 | `ProductController@show`           |
| GET    | `/collection-slots`                              | `CollectionSlotController@index`   |
| GET    | `/collection-slots/available`                    | `CollectionSlotController@available`|
| GET    | `/reviews`                                       | `ReviewController@index`           |
| POST   | `/contact`                                       | `ContactController@store`          |
| GET    | `/apex/token`                                    | `ApexController@token`             |
| GET    | `/apex/{path}`                                   | `ApexController@proxy`             |
| GET    | `/oracle-users`                                  | inline closure                     |

## Authenticated routes (`auth:sanctum`)

| Method | URL                          | Controller                          |
|--------|------------------------------|-------------------------------------|
| POST   | `/logout`                    | `AuthController@logout`             |
| GET    | `/me`                        | `AuthController@me`                 |
| PATCH  | `/me`                        | `AuthController@updateMe`           |
| POST   | `/oracle-cart/add`           | inline closure                      |

### Customer-only (`role:customer`)

| Method | URL                                    | Controller                              |
|--------|----------------------------------------|-----------------------------------------|
| GET    | `/cart`                                | `CartController@index`                  |
| POST   | `/cart/items`                          | `CartController@addItem`                |
| PUT    | `/cart/items/{id}`                     | `CartController@updateItem`             |
| DELETE | `/cart/items/{id}`                     | `CartController@removeItem`             |
| DELETE | `/cart`                                | `CartController@clear`                  |
| POST   | `/orders`                              | `OrderController@store`                 |
| GET    | `/orders`                              | `OrderController@index`                 |
| GET    | `/orders/{id}`                         | `OrderController@show`                  |
| PATCH  | `/orders/{id}/cancel`                  | `OrderController@cancel`                |
| POST   | `/paypal/create-order`                 | `PaymentController@createPayPalOrder`   |
| POST   | `/paypal/capture`                      | `PaymentController@captureAndComplete`  |
| POST   | `/collection-slots/{id}/reserve`       | `CollectionSlotController@reserve`      |
| POST   | `/reviews`                             | `ReviewController@store`                |

### Trader-only (`role:trader`)

| Method | URL                                    | Controller                              |
|--------|----------------------------------------|-----------------------------------------|
| POST   | `/products`                            | `ProductController@store`               |
| PUT    | `/products/{id}`                       | `ProductController@update`              |
| POST   | `/products/{id}`                       | `ProductController@update` (file upload)|
| DELETE | `/products/{id}`                       | `ProductController@destroy`             |
| POST   | `/products/{id}/discount`              | `ProductController@setDiscount`         |
| DELETE | `/products/{id}/discount`              | `ProductController@removeDiscount`      |
| PATCH  | `/orders/{id}/status`                  | `OrderController@updateStatus`          |
| GET    | `/trader/orders`                       | `OrderController@traderOrders`          |
| GET    | `/trader/stats`                        | `TraderController@stats`                |

### Admin-only (`role:admin`)

| Method | URL                          | Controller                              |
|--------|------------------------------|-----------------------------------------|
| POST   | `/shops`                     | `ShopController@store`                  |
| PUT    | `/shops/{id}`                | `ShopController@update`                 |
| DELETE | `/shops/{id}`                | `ShopController@destroy`                |
| POST   | `/categories`                | `CategoryController@store`              |
| PUT    | `/categories/{id}`           | `CategoryController@update`             |
| DELETE | `/categories/{id}`           | `CategoryController@destroy`            |
| POST   | `/collection-slots`          | `CollectionSlotController@store`        |
| GET    | `/admin/stats`               | `AdminController@stats`                 |
| GET    | `/admin/users`               | `AdminController@users`                 |

## ORDS routes (NOT Laravel)

Some pages skip Laravel and call ORDS directly at `http://localhost:8080/ords/teamproject/`:

- `products/`, `reviews/`, `shops/`, `orders/`, `traders/`
- `user_table/`, `collection_slot/`, `cart_table/`
- `product_favorite/`, `product_cart/`, `product_order/`
- `payment_table/`, `category_table/`, `discount_table/`, `customer_table/`, `favorite_table/`

See `10 — Direct ORDS Calls`.
