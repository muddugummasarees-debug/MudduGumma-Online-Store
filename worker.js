const COOKIE_NAME = "mg_admin";
const SESSION_SECONDS = 12 * 60 * 60;

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
      // GET PRODUCTS
      // ==========================================

      if (
        path === "/api/products" &&
        request.method === "GET"
      ) {
        const result =
          await env.DB.prepare(`
            SELECT
              id,
              name,
              category,
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
            cleanText(
              body.category,
              150
            ) ||
            "New Arrivals",

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
            )

            VALUES (
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?
            )

            ON CONFLICT(id)
            DO UPDATE SET

              name =
                excluded.name,

              category =
                excluded.category,

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

              updated_at =
                excluded.updated_at
          `)
          .bind(
            product.id,
            product.name,
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
      row.category,

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
        value.phone,
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
