const COOKIE_NAME = "mg_admin";
const SESSION_SECONDS = 12 * 60 * 60;
const CUSTOMER_COOKIE_NAME = "mg_customer";
const CUSTOMER_SESSION_SECONDS = 30 * 24 * 60 * 60;
const PASSWORD_ITERATIONS = 100000;

let productMetadataReady = false;

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders()
        });
      }

      // ==========================================
      // HEALTH CHECK
      // ==========================================

      if (path === "/" || path === "/health") {
        return json({
          ok: true,
          service: "MudduGumma Cloudflare API",

          database: !!env.DB,

          cloudinary: !!(
            env.CLOUDINARY_CLOUD_NAME &&
            env.CLOUDINARY_API_KEY &&
            env.CLOUDINARY_API_SECRET
          ),

          razorpay: !!(
            env.RAZORPAY_KEY_ID &&
            env.RAZORPAY_KEY_SECRET
          )
        });
      }

      // ==========================================
      // ADMIN LOGIN
      // ==========================================

      if (
        path === "/api/login" &&
        request.method === "POST"
      ) {
        const body = await readJson(request);

        const username =
          cleanText(body.username, 100);

        const password =
          String(body.password || "");

        if (
          !env.ADMIN_USERNAME ||
          !env.ADMIN_PASSWORD
        ) {
          return json(
            {
              ok: false,
              error:
                "Admin login is not configured yet."
            },
            503
          );
        }

        if (
          username !==
            String(env.ADMIN_USERNAME) ||
          password !==
            String(env.ADMIN_PASSWORD)
        ) {
          return json(
            {
              ok: false,
              error:
                "Invalid username or password"
            },
            401
          );
        }

        const expires =
          Math.floor(Date.now() / 1000) +
          SESSION_SECONDS;

        const signature =
          await hmacHex(
            "SHA-256",
            String(env.ADMIN_PASSWORD),
            `${username}|${expires}`
          );

        const token =
          `${expires}.${signature}`;

        return json(
          {
            ok: true
          },
          200,
          {
            "Set-Cookie":
              `${COOKIE_NAME}=${token}; ` +
              `Path=/; HttpOnly; Secure; ` +
              `SameSite=Lax; Max-Age=${SESSION_SECONDS}`
          }
        );
      }

      // ==========================================
      // LOGOUT
      // ==========================================

      if (
        path === "/api/logout" &&
        request.method === "POST"
      ) {
        return json(
          {
            ok: true
          },
          200,
          {
            "Set-Cookie":
              `${COOKIE_NAME}=; ` +
              `Path=/; HttpOnly; Secure; ` +
              `SameSite=Lax; Max-Age=0`
          }
        );
      }

      // ==========================================
      // CHECK ADMIN LOGIN
      // ==========================================

      if (
        path === "/api/me" &&
        request.method === "GET"
      ) {
        return json({
          authenticated:
            await isAuthed(
              request,
              env
            )
        });
      }

      // ==========================================
      // CUSTOMER REGISTER
      // ==========================================

      if (
        path === "/api/customer/register" &&
        request.method === "POST"
      ) {
        const body =
          await readJson(request);

        const name =
          cleanText(
            body.name,
            200
          );

        const email =
          cleanText(
            body.email,
            300
          )
          .toLowerCase();

        const phone =
          cleanText(
            body.phone || body.mobile,
            50
          );

        const password =
          String(
            body.password || ""
          );

        if (
          !name ||
          !email ||
          !phone ||
          !password
        ) {
          return json(
            {
              error:
                "Name, email, mobile number and password are required."
            },
            400
          );
        }

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email)
        ) {
          return json(
            {
              error:
                "Please enter a valid email address."
            },
            400
          );
        }

        if (
          !/^[0-9]{10}$/
            .test(phone)
        ) {
          return json(
            {
              error:
                "Please enter a valid 10-digit mobile number."
            },
            400
          );
        }

        if (
          password.length < 8
        ) {
          return json(
            {
              error:
                "Password must contain at least 8 characters."
            },
            400
          );
        }

        const existing =
          await env.DB
            .prepare(`
              SELECT id
              FROM customer_accounts
              WHERE email = ?
            `)
            .bind(email)
            .first();

        if (existing) {
          return json(
            {
              error:
                "An account already exists with this email."
            },
            409
          );
        }

        const salt =
          randomHex(16);

        const passwordHash =
          await hashCustomerPassword(
            password,
            salt
          );

        const now =
          new Date()
            .toISOString();

        const result =
          await env.DB
            .prepare(`
              INSERT INTO customer_accounts (
                name,
                email,
                phone,
                password_hash,
                password_salt,
                created_at,
                updated_at
              )

              VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              name,
              email,
              phone,
              passwordHash,
              salt,
              now,
              now
            )
            .run();

        const customerId =
          Number(
            result.meta.last_row_id
          );

        const sessionToken =
          randomHex(32);

        const tokenHash =
          await digestHex(
            "SHA-256",
            sessionToken
          );

        const expiresAt =
          new Date(
            Date.now() +
            CUSTOMER_SESSION_SECONDS * 1000
          )
          .toISOString();

        await env.DB
          .prepare(`
            INSERT INTO customer_sessions (
              token_hash,
              customer_id,
              expires_at,
              created_at
            )

            VALUES (?, ?, ?, ?)
          `)
          .bind(
            tokenHash,
            customerId,
            expiresAt,
            now
          )
          .run();

        return json(
          {
            ok: true,
            customer: {
              id:
                customerId,
              name,
              email,
              phone
            }
          },
          200,
          {
            "Set-Cookie":
              customerSessionCookie(
                sessionToken
              )
          }
        );
      }

      // ==========================================
      // CUSTOMER LOGIN
      // ==========================================

      if (
        path === "/api/customer/login" &&
        request.method === "POST"
      ) {
        const body =
          await readJson(request);

        const email =
          cleanText(
            body.email,
            300
          )
          .toLowerCase();

        const password =
          String(
            body.password || ""
          );

        if (
          !email ||
          !password
        ) {
          return json(
            {
              error:
                "Email and password are required."
            },
            400
          );
        }

        const account =
          await env.DB
            .prepare(`
              SELECT
                id,
                name,
                email,
                phone,
                password_hash,
                password_salt
              FROM customer_accounts
              WHERE email = ?
            `)
            .bind(email)
            .first();

        if (!account) {
          return json(
            {
              error:
                "Invalid email or password."
            },
            401
          );
        }

        const passwordHash =
          await hashCustomerPassword(
            password,
            account.password_salt
          );

        if (
          !safeEqualText(
            passwordHash,
            account.password_hash
          )
        ) {
          return json(
            {
              error:
                "Invalid email or password."
            },
            401
          );
        }

        const sessionToken =
          randomHex(32);

        const tokenHash =
          await digestHex(
            "SHA-256",
            sessionToken
          );

        const now =
          new Date()
            .toISOString();

        const expiresAt =
          new Date(
            Date.now() +
            CUSTOMER_SESSION_SECONDS * 1000
          )
          .toISOString();

        await env.DB
          .prepare(`
            INSERT INTO customer_sessions (
              token_hash,
              customer_id,
              expires_at,
              created_at
            )
            VALUES (?, ?, ?, ?)
          `)
          .bind(
            tokenHash,
            account.id,
            expiresAt,
            now
          )
          .run();

        return json(
          {
            ok: true,
            customer: {
              id:
                Number(account.id),
              name:
                account.name,
              email:
                account.email,
              phone:
                account.phone
            }
          },
          200,
          {
            "Set-Cookie":
              customerSessionCookie(
                sessionToken
              )
          }
        );
      }

      // ==========================================
      // CUSTOMER LOGIN STATUS
      // ==========================================

      if (
        path === "/api/customer/me" &&
        request.method === "GET"
      ) {
        const session =
          await getCustomerSession(
            request,
            env
          );

        if (!session) {
          return json({
            authenticated:
              false,
            customer:
              null
          });
        }

        return json({
          authenticated:
            true,
          customer:
            session.customer
        });
      }

      // ==========================================
      // CUSTOMER LOGOUT
      // ==========================================

      if (
        path === "/api/customer/logout" &&
        request.method === "POST"
      ) {
        const sessionToken =
          getCookie(
            request,
            CUSTOMER_COOKIE_NAME
          );

        if (sessionToken) {
          const tokenHash =
            await digestHex(
              "SHA-256",
              sessionToken
            );

          await env.DB
            .prepare(`
              DELETE FROM customer_sessions
              WHERE token_hash = ?
            `)
            .bind(tokenHash)
            .run();
        }

        return json(
          {
            ok: true
          },
          200,
          {
            "Set-Cookie":
              clearCustomerSessionCookie()
          }
        );
      }
      // ==========================================
      // CUSTOMER MY ORDERS
      // ==========================================

      if (
        path === "/api/customer/orders" &&
        request.method === "GET"
      ) {
        const session =
          await getCustomerSession(
            request,
            env
          );

        if (!session) {
          return json(
            {
              error:
                "Customer login required."
            },
            401
          );
        }

        const result =
          await env.DB
            .prepare(`
              SELECT
                id,
                amount,
                items,
                status,
                created_at,
                paid_at
              FROM orders
              WHERE customer_id = ?
              ORDER BY created_at DESC
            `)
            .bind(
              Number(
                session.customer.id
              )
            )
            .all();

        const orders =
          (result.results || [])
            .map(order => ({
              id:
                order.id,

              amount:
                Number(
                  order.amount || 0
                ),

              items:
               JSON.parse(order.items || "[]"),

              status:
                order.status,

              createdAt:
                order.created_at,

              paidAt:
                order.paid_at
            }));

        return json({
          orders
        });
      }
      // ==========================================
      // GET PRODUCTS
      // ==========================================

      if (
        path === "/api/products" &&
        request.method === "GET"
      ) {
        await ensureProductMetadataColumns(
          env
        );

        const result =
          await env.DB.prepare(`
            SELECT
              id,
              name,
              category,
              department,
              occasion,
              pattern,
              border_type,
              work_type,
              blouse_piece,
              featured,
              price,
              old_price,
              stock,
              sizes,
              colors,
              images,
              image,
              description,
              created_at,
              updated_at
            FROM products
            ORDER BY created_at DESC
          `).all();

        const products =
          (result.results || [])
            .map(productFromRow);

        return json(products);
      }

      // ==========================================
      // ADD / UPDATE PRODUCT
      // ==========================================

      if (
        path === "/api/products" &&
        request.method === "POST"
      ) {
        if (
          !(await isAuthed(
            request,
            env
          ))
        ) {
          return json(
            {
              error:
                "Login required"
            },
            401
          );
        }

        await ensureProductMetadataColumns(
          env
        );

        const body =
          await readJson(request);

        if (
          !body.name ||
          body.price === undefined ||
          body.price === null ||
          body.price === ""
        ) {
          return json(
            {
              error:
                "Product name and price are required"
            },
            400
          );
        }

        const images =
          Array.isArray(body.images)
            ? body.images
                .filter(Boolean)
                .map(String)
            : body.image
              ? [String(body.image)]
              : [];

        const requestedFabric =
          cleanText(
            body.fabric,
            150
          );

        const legacyCategory =
          cleanText(
            body.category,
            150
          );

        const department =
          requestedFabric
            ? (
                legacyCategory ||
                "Sarees"
              )
            : "Sarees";

        const fabric =
          requestedFabric ||
          legacyCategory ||
          "Other Sarees";

        const product = {
          id:
            cleanText(
              body.id,
              150
            ) ||
            `MG-${Date.now()}`,

          name:
            cleanText(
              body.name,
              300
            ),

          category:
            department,

          fabric,

          occasion:
            cleanText(
              body.occasion,
              100
            ),

          pattern:
            cleanText(
              body.pattern,
              100
            ),

          border:
            cleanText(
              body.border,
              100
            ),

          work:
            cleanText(
              body.work,
              100
            ),

          blouse:
            cleanText(
              body.blouse,
              100
            ),

          featured:
            Boolean(
              body.featured
            ),

          price:
            Math.max(
              0,
              Number(
                body.price
              ) || 0
            ),

          oldPrice:
            Math.max(
              0,
              Number(
                body.oldPrice
              ) || 0
            ),

          stock:
            Math.max(
              0,
              Math.floor(
                Number(
                  body.stock
                ) || 0
              )
            ),

          sizes:
            normalizeStringArray(
              body.sizes
            ),

          colors:
            normalizeStringArray(
              body.colors
            ),

          images,

          image:
            images[0] || "",

          description:
            cleanText(
              body.description,
              5000
            )
        };

        const now =
          new Date()
            .toISOString();

        await env.DB
          .prepare(`
            INSERT INTO products (
              id,
              name,
              category,
              department,
              price,
              old_price,
              stock,
              sizes,
              colors,
              images,
              image,
              description,
              occasion,
              pattern,
              border_type,
              work_type,
              blouse_piece,
              featured,
              created_at,
              updated_at
            )

            VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?
            )

            ON CONFLICT(id)
            DO UPDATE SET

              name =
                excluded.name,

              category =
                excluded.category,

              department =
                excluded.department,

              price =
                excluded.price,

              old_price =
                excluded.old_price,

              stock =
                excluded.stock,

              sizes =
                excluded.sizes,

              colors =
                excluded.colors,

              images =
                excluded.images,

              image =
                excluded.image,

              description =
                excluded.description,

              occasion =
                excluded.occasion,

              pattern =
                excluded.pattern,

              border_type =
                excluded.border_type,

              work_type =
                excluded.work_type,

              blouse_piece =
                excluded.blouse_piece,

              featured =
                excluded.featured,

              updated_at =
                excluded.updated_at
          `)
          .bind(
            product.id,
            product.name,
            product.fabric,
            product.category,
            product.price,
            product.oldPrice,
            product.stock,
            JSON.stringify(
              product.sizes
            ),
            JSON.stringify(
              product.colors
            ),
            JSON.stringify(
              product.images
            ),
            product.image,
            product.description,
            product.occasion,
            product.pattern,
            product.border,
            product.work,
            product.blouse,
            product.featured
              ? 1
              : 0,
            now,
            now
          )
          .run();

        return json(product);
      }

      // ==========================================
      // DELETE PRODUCT
      // ==========================================

      if (
        path.startsWith(
          "/api/products/"
        ) &&
        request.method === "DELETE"
      ) {
        if (
          !(await isAuthed(
            request,
            env
          ))
        ) {
          return json(
            {
              error:
                "Login required"
            },
            401
          );
        }

        const id =
          decodeURIComponent(
            path.slice(
              "/api/products/"
                .length
            )
          );

        await env.DB
          .prepare(
            `
            DELETE FROM products
            WHERE id = ?
            `
          )
          .bind(id)
          .run();

        return json({
          ok: true
        });
      }

      // ==========================================
      // CLOUDINARY IMAGE UPLOAD
      // ==========================================

      if (
        path === "/api/upload" &&
        request.method === "POST"
      ) {
        if (
          !(await isAuthed(
            request,
            env
          ))
        ) {
          return json(
            {
              error:
                "Login required"
            },
            401
          );
        }

        if (
          !env.CLOUDINARY_CLOUD_NAME ||
          !env.CLOUDINARY_API_KEY ||
          !env.CLOUDINARY_API_SECRET
        ) {
          return json(
            {
              error:
                "Cloudinary is not configured yet."
            },
            503
          );
        }

        const body =
          await readJson(request);

        const data =
          String(
            body.data || ""
          );

        if (
          !/^data:image\/(jpeg|png|webp|gif);base64,/i
            .test(data)
        ) {
          return json(
            {
              error:
                "Invalid image data."
            },
            400
          );
        }

        const timestamp =
          Math.floor(
            Date.now() / 1000
          );

        const folder =
          "muddugumma-products";

        const signatureSource =
          `folder=${folder}` +
          `&timestamp=${timestamp}` +
          `${env.CLOUDINARY_API_SECRET}`;

        const signature =
          await digestHex(
            "SHA-1",
            signatureSource
          );

        const form =
          new FormData();

        form.append(
          "file",
          data
        );

        form.append(
          "api_key",
          String(
            env.CLOUDINARY_API_KEY
          )
        );

        form.append(
          "timestamp",
          String(timestamp)
        );

        form.append(
          "folder",
          folder
        );

        form.append(
          "signature",
          signature
        );

        const uploadResponse =
          await fetch(
            `https://api.cloudinary.com/v1_1/` +
            `${encodeURIComponent(
              env.CLOUDINARY_CLOUD_NAME
            )}/image/upload`,
            {
              method: "POST",
              body: form
            }
          );

        const uploadData =
          await uploadResponse
            .json()
            .catch(
              () => ({})
            );

        if (
          !uploadResponse.ok
        ) {
          return json(
            {
              error:
                uploadData
                  ?.error
                  ?.message ||
                "Image upload failed."
            },
            502
          );
        }

        return json({
          url:
            uploadData.secure_url,

          publicId:
            uploadData.public_id,

          width:
            uploadData.width,

          height:
            uploadData.height
        });
      }

      // ==========================================
      // RAZORPAY CONFIG
      // ==========================================

      if (
        path ===
          "/api/payment-config" &&
        request.method === "GET"
      ) {
        return json({
          keyId:
            env.RAZORPAY_KEY_ID ||
            ""
        });
      }

      // ==========================================
      // CREATE RAZORPAY ORDER
      // ==========================================

      if (
        path ===
          "/api/create-order" &&
        request.method === "POST"
      ) {        
        const customerSession =
          await getCustomerSession(
            request,
            env
          );

        if (!customerSession) {
          return json(
            {
              error:
                "Customer login required."
            },
            401
          );
        }

        const loggedInCustomer =
          customerSession.customer;
        if (
          !env.RAZORPAY_KEY_ID ||
          !env.RAZORPAY_KEY_SECRET
        ) {
          return json(
            {
              error:
                "Online payment is not configured yet."
            },
            503
          );
        }

        const body =
          await readJson(request);

        if (
          !Array.isArray(
            body.items
          ) ||
          !body.items.length
        ) {
          return json(
            {
              error:
                "Cart is empty."
            },
            400
          );
        }

        const orderItems = [];

        let totalRupees = 0;

        for (
          const cartItem
          of body.items
        ) {
          const id =
            cleanText(
              cartItem.id,
              150
            );

          const row =
            await env.DB
              .prepare(`
                SELECT
                  id,
                  name,
                  price,
                  stock
                FROM products
                WHERE id = ?
              `)
              .bind(id)
              .first();

          if (!row) {
            return json(
              {
                error:
                  "A product in your cart is no longer available."
              },
              400
            );
          }

          const quantity =
            Math.max(
              1,
              Math.floor(
                Number(
                  cartItem.quantity
                ) || 1
              )
            );

          const stock =
            Math.max(
              0,
              Number(
                row.stock
              ) || 0
            );

          if (
            quantity > stock
          ) {
            return json(
              {
                error:
                  `${row.name} does not have enough stock.`
              },
              400
            );
          }

          const price =
            Math.max(
              0,
              Number(
                row.price
              ) || 0
            );

          totalRupees +=
            price * quantity;

          orderItems.push({
            id:
              row.id,

            name:
              row.name,

            price,

            quantity
          });
        }

        const amountPaise =
          Math.round(
            totalRupees *
            100
          );

        if (
          amountPaise < 100
        ) {
          return json(
            {
              error:
                "Order amount is invalid."
            },
            400
          );
        }

        const localOrderId =
          `MGORDER-${Date.now()}`;

        const razorpayResponse =
          await fetch(
            "https://api.razorpay.com/v1/orders",
            {
              method: "POST",

              headers: {
                "Authorization":
                  `Basic ${btoa(
                    `${env.RAZORPAY_KEY_ID}:` +
                    `${env.RAZORPAY_KEY_SECRET}`
                  )}`,

                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  amount:
                    amountPaise,

                  currency:
                    "INR",

                  receipt:
                    localOrderId
                })
            }
          );

        const razorpayOrder =
          await razorpayResponse
            .json()
            .catch(
              () => ({})
            );

        if (
          !razorpayResponse.ok
        ) {
          return json(
            {
              error:
                razorpayOrder
                  ?.error
                  ?.description ||
                "Could not create Razorpay order."
            },
            502
          );
        }

        const customer =
          sanitizeCustomer(
            body.customer || {}
          );

        const now =
          new Date()
            .toISOString();

        await env.DB
          .prepare(`
            INSERT INTO orders (
              id,
              customer_id,
              razorpay_order_id,
              razorpay_payment_id,
              amount,
              items,
              customer,
              status,
              created_at,
              paid_at
            )

            VALUES (
              ?,
              ?,
              ?,
              NULL,
              ?,
              ?,
              ?,
              'created',
              ?,
              NULL
            )
          `)
          .bind(
            localOrderId,
            Number(loggedInCustomer.id),
            razorpayOrder.id,
            totalRupees,
            JSON.stringify(
              orderItems
            ),
            JSON.stringify(
              customer
            ),
            now
          )
          .run();

        if (
          customer.name ||
          customer.email ||
          customer.phone
        ) {
          await env.DB
            .prepare(`
              INSERT INTO customers (
                name,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                created_at
              )

              VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?
              )
            `)
            .bind(
              customer.name,
              customer.email,
              customer.phone,
              customer.address,
              customer.city,
              customer.state,
              customer.pincode,
              now
            )
            .run();
        }

        return json({
          keyId:
            env.RAZORPAY_KEY_ID,

          amount:
            razorpayOrder.amount,

          currency:
            razorpayOrder.currency,

          razorpayOrderId:
            razorpayOrder.id,

          localOrderId
        });
      }

      // ==========================================
      // VERIFY RAZORPAY PAYMENT
      // ==========================================

      if (
        path ===
          "/api/verify-payment" &&
        request.method === "POST"
      ) {
        if (
          !env.RAZORPAY_KEY_SECRET
        ) {
          return json(
            {
              error:
                "Payment verification is not configured."
            },
            503
          );
        }

        const body =
          await readJson(request);

        const orderId =
          cleanText(
            body.razorpay_order_id,
            200
          );

        const paymentId =
          cleanText(
            body.razorpay_payment_id,
            200
          );

        const signature =
          cleanText(
            body.razorpay_signature,
            300
          )
          .toLowerCase();

        if (
          !orderId ||
          !paymentId ||
          !signature
        ) {
          return json(
            {
              error:
                "Missing payment verification details."
            },
            400
          );
        }

        const expected =
          await hmacHex(
            "SHA-256",

            String(
              env.RAZORPAY_KEY_SECRET
            ),

            `${orderId}|${paymentId}`
          );

        if (
          expected
            .toLowerCase() !==
          signature
        ) {
          return json(
            {
              error:
                "Invalid payment signature."
            },
            400
          );
        }

        const order =
          await env.DB
            .prepare(`
              SELECT
                id,
                items,
                customer,
                amount,
                status
              FROM orders
              WHERE razorpay_order_id = ?
            `)
            .bind(orderId)
            .first();

        if (!order) {
          return json(
            {
              error:
                "Order not found."
            },
            404
          );
        }

        if (
          order.status ===
          "paid"
        ) {
          return json({
            ok: true,
            orderId:
              order.id
          });
        }

        const items =
          safeJsonArray(
            order.items
          );

        const paidAt =
          new Date()
            .toISOString();

        const statements = [
          env.DB
            .prepare(`
              UPDATE orders

              SET
                status = 'paid',
                razorpay_payment_id = ?,
                paid_at = ?

              WHERE
                id = ?
                AND
                status != 'paid'
            `)
            .bind(
              paymentId,
              paidAt,
              order.id
            )
        ];

        for (
          const item
          of items
        ) {
          statements.push(

            env.DB
              .prepare(`
                UPDATE products

                SET
                  stock =
                    MAX(
                      stock - ?,
                      0
                    ),

                  updated_at = ?

                WHERE id = ?
              `)
              .bind(
                Math.max(
                  1,
                  Math.floor(
                    Number(
                      item.quantity
                    ) || 1
                  )
                ),

                paidAt,

                String(
                  item.id
                )
              )
          );
        }

        await env.DB
          .batch(
            statements
          );

        // ==========================================
        // SEND ORDER EMAIL NOTIFICATION
        // ==========================================

        if (env.RESEND_API_KEY) {
          try {
            let customer = {};

            try {
              customer =
                JSON.parse(
                  order.customer || "{}"
                );
            } catch {
              customer = {};
            }

            const itemLines =
              items
                .map(
                  item =>
                    `${item.name} - Qty: ${item.quantity} - ₹${item.price}`
                )
                .join("\n");

            const emailText =
`New MudduGumma Order

Order ID: ${order.id}
Payment ID: ${paymentId}
Payment Status: PAID
Amount: ₹${order.amount}

CUSTOMER DETAILS
Name: ${customer.name || "-"}
Email: ${customer.email || "-"}
Phone: ${customer.phone || "-"}

DELIVERY ADDRESS
Address: ${customer.address || "-"}
City: ${customer.city || "-"}
State: ${customer.state || "-"}
Pincode: ${customer.pincode || "-"}

ORDER ITEMS
${itemLines}

Payment received successfully through Razorpay.`;

            const emailResponse =
              await fetch(
                "https://api.resend.com/emails",
                {
                  method: "POST",

                  headers: {
                    "Authorization":
                      `Bearer ${env.RESEND_API_KEY}`,

                    "Content-Type":
                      "application/json"
                  },

                  body:
                    JSON.stringify({
                      from:
                        "MudduGumma Orders <onboarding@resend.dev>",

                      to: [
                        "muddugummasarees@gmail.com"
                      ],

                      subject:
                        `New Paid Order - ${order.id}`,

                      text:
                        emailText
                    })
                }
              );

            if (!emailResponse.ok) {
              const emailError =
                await emailResponse
                  .text();

              console.error(
                "Order email failed:",
                emailError
              );
            }

          } catch (emailError) {

            console.error(
              "Order email error:",
              emailError
            );
          }
        }
        return json({
          ok: true,

          orderId:
            order.id
        });
      }

      // ==========================================
      // NOT FOUND
      // ==========================================

      return json(
        {
          error:
            "Not found"
        },
        404
      );

    } catch (error) {

      console.error(error);

      return json(
        {
          error:
            "Server error",

          message:
            error instanceof Error
              ? error.message
              : String(error)
        },
        500
      );
    }
  }
};


// ==========================================
// CORS
// ==========================================

function corsHeaders() {

  return {
    "Access-Control-Allow-Origin":
      "*",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",

    "Access-Control-Allow-Methods":
      "GET, POST, DELETE, OPTIONS"
  };
}


// ==========================================
// JSON RESPONSE
// ==========================================

function json(
  data,
  status = 200,
  extraHeaders = {}
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",

        ...corsHeaders(),

        ...extraHeaders
      }
    }
  );
}


// ==========================================
// READ JSON
// ==========================================

async function readJson(
  request
) {

  try {

    return await request.json();

  } catch {

    return {};
  }
}


// ==========================================
// CLEAN TEXT
// ==========================================

function cleanText(
  value,
  max = 300
) {

  return String(
    value || ""
  )
  .trim()
  .slice(
    0,
    max
  );
}


// ==========================================
// ARRAYS
// ==========================================

function normalizeStringArray(
  value
) {

  if (
    Array.isArray(value)
  ) {

    return value
      .map(
        value =>
          cleanText(
            value,
            100
          )
      )
      .filter(Boolean);
  }

  if (
    typeof value ===
    "string"
  ) {

    return value
      .split(",")
      .map(
        value =>
          cleanText(
            value,
            100
          )
      )
      .filter(Boolean);
  }

  return [];
}


// ==========================================
// SAFE JSON ARRAY
// ==========================================

function safeJsonArray(
  value
) {

  try {

    const parsed =
      JSON.parse(
        value || "[]"
      );

    return Array.isArray(
      parsed
    )
      ? parsed
      : [];

  } catch {

    return [];
  }
}


// ==========================================
// PRODUCT FILTER METADATA SCHEMA
// ==========================================

async function ensureProductMetadataColumns(
  env
) {
  if (productMetadataReady) {
    return;
  }

  const definitions = [
    [
      "department",
      "department TEXT NOT NULL DEFAULT 'Sarees'"
    ],
    [
      "occasion",
      "occasion TEXT NOT NULL DEFAULT ''"
    ],
    [
      "pattern",
      "pattern TEXT NOT NULL DEFAULT ''"
    ],
    [
      "border_type",
      "border_type TEXT NOT NULL DEFAULT ''"
    ],
    [
      "work_type",
      "work_type TEXT NOT NULL DEFAULT ''"
    ],
    [
      "blouse_piece",
      "blouse_piece TEXT NOT NULL DEFAULT ''"
    ],
    [
      "featured",
      "featured INTEGER NOT NULL DEFAULT 0"
    ]
  ];

  const schema =
    await env.DB
      .prepare(
        "PRAGMA table_info(products)"
      )
      .all();

  const columns =
    new Set(
      (schema.results || [])
        .map(column =>
          String(column.name)
        )
    );

  for (
    const [name, definition]
    of definitions
  ) {
    if (columns.has(name)) {
      continue;
    }

    try {
      await env.DB
        .prepare(
          `ALTER TABLE products ADD COLUMN ${definition}`
        )
        .run();

    } catch (error) {
      const updatedSchema =
        await env.DB
          .prepare(
            "PRAGMA table_info(products)"
          )
          .all();

      const nowExists =
        (updatedSchema.results || [])
          .some(column =>
            String(column.name) ===
            name
          );

      if (!nowExists) {
        throw error;
      }
    }

    columns.add(name);
  }

  productMetadataReady = true;
}


// ==========================================
// PRODUCT FROM DATABASE
// ==========================================

function productFromRow(
  row
) {

  const images =
    safeJsonArray(
      row.images
    );

  return {

    id:
      row.id,

    name:
      row.name,

    category:
      row.department ||
      "Sarees",

    fabric:
      row.category ||
      "",

    occasion:
      row.occasion ||
      "",

    pattern:
      row.pattern ||
      "",

    border:
      row.border_type ||
      "",

    work:
      row.work_type ||
      "",

    blouse:
      row.blouse_piece ||
      "",

    featured:
      Boolean(
        row.featured
      ),

    price:
      Number(
        row.price
      ) || 0,

    oldPrice:
      Number(
        row.old_price
      ) || 0,

    stock:
      Number(
        row.stock
      ) || 0,

    sizes:
      safeJsonArray(
        row.sizes
      ),

    colors:
      safeJsonArray(
        row.colors
      ),

    images,

    image:
      row.image ||
      images[0] ||
      "",

    description:
      row.description ||
      "",

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at
  };
}


// ==========================================
// CUSTOMER
// ==========================================

function sanitizeCustomer(
  value
) {

  return {

    name:
      cleanText(
        value.name,
        200
      ),

    email:
      cleanText(
        value.email,
        300
      ),

    phone:
      cleanText(
        value.phone || value.mobile,
        50
      ),

    address:
      cleanText(
        value.address,
        500
      ),

    city:
      cleanText(
        value.city,
        150
      ),

    state:
      cleanText(
        value.state,
        150
      ),

    pincode:
      cleanText(
        value.pincode,
        30
      )
  };
}


// ==========================================
// COOKIE
// ==========================================

function getCookie(
  request,
  name
) {

  const cookie =
    request.headers
      .get("Cookie") ||
    "";

  for (
    const part
    of cookie.split(";")
  ) {

    const [
      key,
      ...rest
    ] =
      part
        .trim()
        .split("=");

    if (
      key === name
    ) {

      return rest.join("=");
    }
  }

  return "";
}


// ==========================================
// CUSTOMER AUTH HELPERS
// ==========================================

function randomHex(
  byteLength
) {
  const bytes =
    new Uint8Array(
      byteLength
    );

  crypto.getRandomValues(
    bytes
  );

  return bytesToHex(
    bytes
  );
}


async function hashCustomerPassword(
  password,
  salt
) {
  const encoder =
    new TextEncoder();

  const key =
    await crypto.subtle
      .importKey(
        "raw",
        encoder.encode(
          String(password)
        ),
        "PBKDF2",
        false,
        ["deriveBits"]
      );

  const bits =
    await crypto.subtle
      .deriveBits(
        {
          name:
            "PBKDF2",
          hash:
            "SHA-256",
          salt:
            encoder.encode(
              String(salt)
            ),
          iterations:
            PASSWORD_ITERATIONS
        },
        key,
        256
      );

  return bytesToHex(
    new Uint8Array(
      bits
    )
  );
}


function safeEqualText(
  first,
  second
) {
  first =
    String(first || "");

  second =
    String(second || "");

  if (
    first.length !==
    second.length
  ) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index < first.length;
    index++
  ) {
    difference |=
      first.charCodeAt(index) ^
      second.charCodeAt(index);
  }

  return difference === 0;
}


function customerSessionCookie(
  token
) {
  return (
    `${CUSTOMER_COOKIE_NAME}=${token}; ` +
    `Path=/; HttpOnly; Secure; ` +
    `SameSite=Lax; ` +
    `Max-Age=${CUSTOMER_SESSION_SECONDS}`
  );
}


function clearCustomerSessionCookie() {
  return (
    `${CUSTOMER_COOKIE_NAME}=; ` +
    `Path=/; HttpOnly; Secure; ` +
    `SameSite=Lax; Max-Age=0`
  );
}


async function getCustomerSession(
  request,
  env
) {
  const sessionToken =
    getCookie(
      request,
      CUSTOMER_COOKIE_NAME
    );

  if (!sessionToken) {
    return null;
  }

  const tokenHash =
    await digestHex(
      "SHA-256",
      sessionToken
    );

  const row =
    await env.DB
      .prepare(`
        SELECT
          s.token_hash,
          s.expires_at,
          a.id,
          a.name,
          a.email,
          a.phone
        FROM customer_sessions s
        JOIN customer_accounts a
          ON a.id = s.customer_id
        WHERE s.token_hash = ?
      `)
      .bind(tokenHash)
      .first();

  if (!row) {
    return null;
  }

  const expiresTime =
    Date.parse(
      row.expires_at
    );

  if (
    !expiresTime ||
    expiresTime <= Date.now()
  ) {
    await env.DB
      .prepare(`
        DELETE FROM customer_sessions
        WHERE token_hash = ?
      `)
      .bind(tokenHash)
      .run();

    return null;
  }

  return {
    tokenHash,
    customer: {
      id:
        Number(row.id),
      name:
        row.name,
      email:
        row.email,
      phone:
        row.phone
    }
  };
}


// ==========================================
// ADMIN AUTH
// ==========================================

async function isAuthed(
  request,
  env
) {

  if (
    !env.ADMIN_USERNAME ||
    !env.ADMIN_PASSWORD
  ) {

    return false;
  }

  const token =
    getCookie(
      request,
      COOKIE_NAME
    );

  if (!token) {

    return false;
  }

  const [
    expiresText,
    signature
  ] =
    token.split(".");

  const expires =
    Number(
      expiresText
    );

  if (
    !expires ||
    !signature
  ) {

    return false;
  }

  if (
    expires <
    Math.floor(
      Date.now() / 1000
    )
  ) {

    return false;
  }

  const expected =
    await hmacHex(
      "SHA-256",

      String(
        env.ADMIN_PASSWORD
      ),

      `${env.ADMIN_USERNAME}|${expires}`
    );

  return (
    expected ===
    signature
  );
}


// ==========================================
// HMAC
// ==========================================

async function hmacHex(
  algorithm,
  secret,
  message
) {

  const encoder =
    new TextEncoder();

  const key =
    await crypto.subtle
      .importKey(
        "raw",

        encoder.encode(
          secret
        ),

        {
          name:
            "HMAC",

          hash:
            algorithm
        },

        false,

        ["sign"]
      );

  const signature =
    await crypto.subtle
      .sign(
        "HMAC",

        key,

        encoder.encode(
          message
        )
      );

  return bytesToHex(
    new Uint8Array(
      signature
    )
  );
}


// ==========================================
// HASH
// ==========================================

async function digestHex(
  algorithm,
  message
) {

  const bytes =
    new TextEncoder()
      .encode(
        message
      );

  const digest =
    await crypto.subtle
      .digest(
        algorithm,
        bytes
      );

  return bytesToHex(
    new Uint8Array(
      digest
    )
  );
}


// ==========================================
// HEX
// ==========================================

function bytesToHex(
  bytes
) {

  return Array
    .from(bytes)
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(
            2,
            "0"
          )
    )
    .join("");
}
