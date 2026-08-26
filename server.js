const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;

const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const UPLOADS = path.join(ROOT, "uploads");

const PRODUCTS = path.join(DATA, "products.json");
const USERS = path.join(DATA, "users.json");
const ORDERS = path.join(DATA, "orders.json");

const RAZORPAY_KEY_ID =
  process.env.RAZORPAY_KEY_ID || "";

const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || "";

const SESSIONS = new Map();

fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });

function readJSON(file, fallback) {
  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch (e) {
    return fallback;
  }
}

function writeJSON(file, value) {
  fs.writeFileSync(
    file,
    JSON.stringify(value, null, 2)
  );
}

function sha256(s) {
  return crypto
    .createHash("sha256")
    .update(s)
    .digest("hex");
}

if (!fs.existsSync(PRODUCTS)) {
  writeJSON(PRODUCTS, []);
}

if (!fs.existsSync(ORDERS)) {
  writeJSON(ORDERS, []);
}

if (!fs.existsSync(USERS)) {
  writeJSON(USERS, [
    {
      username: "admin",
      passwordHash: sha256("admin123")
    }
  ]);
}

function parseCookies(req) {
  const out = {};

  (req.headers.cookie || "")
    .split(";")
    .forEach(x => {
      const i = x.indexOf("=");

      if (i > 0) {
        out[x.slice(0, i).trim()] =
          decodeURIComponent(
            x.slice(i + 1)
          );
      }
    });

  return out;
}

function isAuthed(req) {
  const sid = parseCookies(req).sid;

  return !!(
    sid &&
    SESSIONS.has(sid)
  );
}

function send(
  res,
  status,
  responseBody,
  type = "application/json",
  extra = {}
) {
  res.writeHead(status, {
    "Content-Type": type,
    ...extra
  });

  res.end(responseBody);
}

function json(res, status, obj) {
  send(
    res,
    status,
    JSON.stringify(obj)
  );
}

function body(req) {
  return new Promise(
    (resolve, reject) => {
      let b = "";

      req.on("data", chunk => {
        b += chunk;

        if (
          b.length >
          50 * 1024 * 1024
        ) {
          req.destroy();
        }
      });

      req.on("end", () => {
        try {
          resolve(
            b
              ? JSON.parse(b)
              : {}
          );
        } catch (e) {
          reject(e);
        }
      });
    }
  );
}

function cleanText(value, max = 300) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function createRazorpayOrder({
  amount,
  receipt
}) {
  return new Promise(
    (resolve, reject) => {
      const payload =
        JSON.stringify({
          amount,
          currency: "INR",
          receipt
        });

      const auth =
        Buffer.from(
          `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
        ).toString("base64");

      const request =
        https.request(
          {
            hostname:
              "api.razorpay.com",

            path:
              "/v1/orders",

            method:
              "POST",

            headers: {
              Authorization:
                `Basic ${auth}`,

              "Content-Type":
                "application/json",

              "Content-Length":
                Buffer.byteLength(
                  payload
                )
            }
          },
          response => {
            let data = "";

            response.on(
              "data",
              chunk => {
                data += chunk;
              }
            );

            response.on(
              "end",
              () => {
                let parsed;

                try {
                  parsed =
                    JSON.parse(data);
                } catch {
                  parsed = {
                    raw: data
                  };
                }

                if (
                  response.statusCode >=
                    200 &&
                  response.statusCode <
                    300
                ) {
                  resolve(parsed);
                } else {
                  reject(
                    new Error(
                      parsed?.error
                        ?.description ||
                        "Could not create Razorpay order"
                    )
                  );
                }
              }
            );
          }
        );

      request.on(
        "error",
        reject
      );

      request.write(payload);
      request.end();
    }
  );
}

function safeCompareHex(a, b) {
  try {
    const aBuffer =
      Buffer.from(
        String(a),
        "hex"
      );

    const bBuffer =
      Buffer.from(
        String(b),
        "hex"
      );

    if (
      aBuffer.length !==
      bBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      aBuffer,
      bBuffer
    );
  } catch {
    return false;
  }
}

async function route(req, res) {
  const url =
    new URL(
      req.url,
      `http://${req.headers.host}`
    );

  const p = url.pathname;

  // =====================================
  // ADMIN LOGIN
  // =====================================

  if (
    req.method === "POST" &&
    p === "/api/login"
  ) {
    const b = await body(req);

    const users =
      readJSON(
        USERS,
        []
      );

    const u =
      users.find(
        x =>
          x.username ===
            b.username &&
          x.passwordHash ===
            sha256(
              b.password || ""
            )
      );

    if (!u) {
      return json(
        res,
        401,
        {
          ok: false,
          error:
            "Invalid username or password"
        }
      );
    }

    const sid =
      crypto
        .randomBytes(32)
        .toString("hex");

    SESSIONS.set(
      sid,
      {
        username:
          u.username,

        created:
          Date.now()
      }
    );

    return send(
      res,
      200,
      JSON.stringify({
        ok: true
      }),
      "application/json",
      {
        "Set-Cookie":
          `sid=${sid}; Path=/; HttpOnly; SameSite=Lax`
      }
    );
  }

  if (
    req.method === "POST" &&
    p === "/api/logout"
  ) {
    const sid =
      parseCookies(req).sid;

    if (sid) {
      SESSIONS.delete(sid);
    }

    return send(
      res,
      200,
      JSON.stringify({
        ok: true
      }),
      "application/json",
      {
        "Set-Cookie":
          "sid=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax"
      }
    );
  }

  if (p === "/api/me") {
    return json(
      res,
      200,
      {
        authenticated:
          isAuthed(req)
      }
    );
  }

  // =====================================
  // PRODUCTS
  // =====================================

  if (
    p === "/api/products" &&
    req.method === "GET"
  ) {
    return json(
      res,
      200,
      readJSON(
        PRODUCTS,
        []
      )
    );
  }

  if (
    p === "/api/products" &&
    req.method === "POST"
  ) {
    if (!isAuthed(req)) {
      return json(
        res,
        401,
        {
          error:
            "Login required"
        }
      );
    }

    const b =
      await body(req);

    if (
      !b.name ||
      !b.price
    ) {
      return json(
        res,
        400,
        {
          error:
            "Product name and price are required"
        }
      );
    }

    const arr =
      readJSON(
        PRODUCTS,
        []
      );

    const images =
      Array.isArray(
        b.images
      )
        ? b.images.filter(
            Boolean
          )
        : (
            b.image
              ? [b.image]
              : []
          );

    const product = {
      id:
        b.id ||
        (
          "MG-" +
          Date.now()
        ),

      name:
        String(b.name),

      category:
        b.category ||
        "New Arrivals",

      price:
        Number(
          b.price
        ) || 0,

      oldPrice:
        Number(
          b.oldPrice
        ) || 0,

      stock:
        Number(
          b.stock
        ) || 0,

      sizes:
        Array.isArray(
          b.sizes
        )
          ? b.sizes
          : [],

      colors:
        Array.isArray(
          b.colors
        )
          ? b.colors
          : [],

      images,

      image:
        images[0] || "",

      description:
        b.description || ""
    };

    const idx =
      arr.findIndex(
        x =>
          x.id ===
          product.id
      );

    if (idx >= 0) {
      arr[idx] =
        product;
    } else {
      arr.push(product);
    }

    writeJSON(
      PRODUCTS,
      arr
    );

    return json(
      res,
      200,
      product
    );
  }

  if (
    p.startsWith(
      "/api/products/"
    ) &&
    req.method ===
      "DELETE"
  ) {
    if (!isAuthed(req)) {
      return json(
        res,
        401,
        {
          error:
            "Login required"
        }
      );
    }

    const id =
      decodeURIComponent(
        p.split("/")
          .pop()
      );

    const arr =
      readJSON(
        PRODUCTS,
        []
      ).filter(
        x =>
          x.id !== id
      );

    writeJSON(
      PRODUCTS,
      arr
    );

    return json(
      res,
      200,
      {
        ok: true
      }
    );
  }

  // =====================================
  // IMAGE UPLOAD
  // =====================================

  if (
    p === "/api/upload" &&
    req.method === "POST"
  ) {
    if (!isAuthed(req)) {
      return json(
        res,
        401,
        {
          error:
            "Login required"
        }
      );
    }

    const b =
      await body(req);

    if (
      !b.data ||
      !String(b.data)
        .startsWith(
          "data:"
        )
    ) {
      return json(
        res,
        400,
        {
          error:
            "Send a data URL"
        }
      );
    }

    const m =
      String(b.data)
        .match(
          /^data:([^;]+);base64,(.+)$/
        );

    if (!m) {
      return json(
        res,
        400,
        {
          error:
            "Invalid image"
        }
      );
    }

    const ext =
      ({
        "image/jpeg":
          ".jpg",

        "image/png":
          ".png",

        "image/webp":
          ".webp",

        "image/gif":
          ".gif"
      })[m[1]] ||
      ".bin";

    const name =
      Date.now() +
      "-" +
      crypto
        .randomBytes(4)
        .toString("hex") +
      ext;

    fs.writeFileSync(
      path.join(
        UPLOADS,
        name
      ),
      Buffer.from(
        m[2],
        "base64"
      )
    );

    return json(
      res,
      200,
      {
        url:
          "/uploads/" +
          name
      }
    );
  }

  // =====================================
  // RAZORPAY PUBLIC CONFIG
  // =====================================

  if (
    p ===
      "/api/payment-config" &&
    req.method === "GET"
  ) {
    return json(
      res,
      200,
      {
        keyId:
          RAZORPAY_KEY_ID
      }
    );
  }

  // =====================================
  // CREATE CHECKOUT ORDER
  // =====================================

  if (
    p ===
      "/api/create-order" &&
    req.method === "POST"
  ) {
    if (
      !RAZORPAY_KEY_ID ||
      !RAZORPAY_KEY_SECRET
    ) {
      return json(
        res,
        503,
        {
          error:
            "Online payment is not configured yet."
        }
      );
    }

    const b =
      await body(req);

    if (
      !Array.isArray(
        b.items
      ) ||
      !b.items.length
    ) {
      return json(
        res,
        400,
        {
          error:
            "Cart is empty."
        }
      );
    }

    const customer =
      b.customer || {};

    const requiredFields = [
      "name",
      "mobile",
      "email",
      "address",
      "city",
      "state",
      "pincode"
    ];

    for (
      const field
      of requiredFields
    ) {
      if (
        !cleanText(
          customer[field]
        )
      ) {
        return json(
          res,
          400,
          {
            error:
              `Please enter ${field}.`
          }
        );
      }
    }

    const products =
      readJSON(
        PRODUCTS,
        []
      );

    const orderItems = [];

    let totalRupees = 0;

    for (
      const cartItem
      of b.items
    ) {
      const product =
        products.find(
          x =>
            x.id ===
            cartItem.id
        );

      if (!product) {
        return json(
          res,
          400,
          {
            error:
              "A product in your cart is no longer available."
          }
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

      if (
        Number(
          product.stock
        ) < quantity
      ) {
        return json(
          res,
          400,
          {
            error:
              `${product.name} has only ${product.stock} piece(s) available.`
          }
        );
      }

      const price =
        Number(
          product.price
        );

      totalRupees +=
        price * quantity;

      orderItems.push({
        id:
          product.id,

        name:
          product.name,

        price,

        quantity,

        image:
          Array.isArray(
            product.images
          ) &&
          product.images.length
            ? product.images[0]
            : product.image || ""
      });
    }

    const amountPaise =
      Math.round(
        totalRupees * 100
      );

    if (
      !Number.isInteger(
        amountPaise
      ) ||
      amountPaise <= 0
    ) {
      return json(
        res,
        400,
        {
          error:
            "Invalid order amount."
        }
      );
    }

    const localOrderId =
      "MGORDER-" +
      Date.now() +
      "-" +
      crypto
        .randomBytes(3)
        .toString("hex");

    try {
      const razorpayOrder =
        await createRazorpayOrder({
          amount:
            amountPaise,

          receipt:
            localOrderId
              .slice(0, 40)
        });

      const orders =
        readJSON(
          ORDERS,
          []
        );

      orders.push({
        id:
          localOrderId,

        razorpayOrderId:
          razorpayOrder.id,

        status:
          "payment_pending",

        amount:
          totalRupees,

        amountPaise,

        currency:
          "INR",

        items:
          orderItems,

        customer: {
          name:
            cleanText(
              customer.name,
              100
            ),

          mobile:
            cleanText(
              customer.mobile,
              20
            ),

          email:
            cleanText(
              customer.email,
              150
            ),

          address:
            cleanText(
              customer.address,
              500
            ),

          city:
            cleanText(
              customer.city,
              100
            ),

          state:
            cleanText(
              customer.state,
              100
            ),

          pincode:
            cleanText(
              customer.pincode,
              20
            )
        },

        createdAt:
          new Date()
            .toISOString()
      });

      writeJSON(
        ORDERS,
        orders
      );

      return json(
        res,
        200,
        {
          ok: true,

          localOrderId,

          razorpayOrderId:
            razorpayOrder.id,

          amount:
            amountPaise,

          currency:
            "INR",

          keyId:
            RAZORPAY_KEY_ID
        }
      );
    } catch (error) {
      console.error(
        "Razorpay order error:",
        error.message
      );

      return json(
        res,
        502,
        {
          error:
            "Could not start online payment. Please try again."
        }
      );
    }
  }

  // =====================================
  // VERIFY PAYMENT
  // =====================================

  if (
    p ===
      "/api/verify-payment" &&
    req.method === "POST"
  ) {
    if (
      !RAZORPAY_KEY_SECRET
    ) {
      return json(
        res,
        503,
        {
          error:
            "Payment verification is not configured."
        }
      );
    }

    const b =
      await body(req);

    const paymentId =
      cleanText(
        b.razorpay_payment_id,
        150
      );

    const razorpayOrderId =
      cleanText(
        b.razorpay_order_id,
        150
      );

    const signature =
      cleanText(
        b.razorpay_signature,
        300
      );

    if (
      !paymentId ||
      !razorpayOrderId ||
      !signature
    ) {
      return json(
        res,
        400,
        {
          error:
            "Missing payment verification details."
        }
      );
    }

    const orders =
      readJSON(
        ORDERS,
        []
      );

    const orderIndex =
      orders.findIndex(
        x =>
          x.razorpayOrderId ===
          razorpayOrderId
      );

    if (
      orderIndex < 0
    ) {
      return json(
        res,
        400,
        {
          error:
            "Order not found."
        }
      );
    }

    const order =
      orders[
        orderIndex
      ];

    if (
      order.status ===
      "paid"
    ) {
      return json(
        res,
        200,
        {
          ok: true,
          orderId:
            order.id,
          alreadyVerified:
            true
        }
      );
    }

    const expected =
      crypto
        .createHmac(
          "sha256",
          RAZORPAY_KEY_SECRET
        )
        .update(
          order.razorpayOrderId +
          "|" +
          paymentId
        )
        .digest("hex");

    if (
      !safeCompareHex(
        expected,
        signature
      )
    ) {
      return json(
        res,
        400,
        {
          error:
            "Payment verification failed."
        }
      );
    }

    const products =
      readJSON(
        PRODUCTS,
        []
      );

    for (
      const item
      of order.items
    ) {
      const product =
        products.find(
          p =>
            p.id === item.id
        );

      if (product) {
        product.stock =
          Math.max(
            0,
            Number(
              product.stock
            ) -
            Number(
              item.quantity
            )
          );
      }
    }

    writeJSON(
      PRODUCTS,
      products
    );

    order.status =
      "paid";

    order.razorpayPaymentId =
      paymentId;

    order.razorpaySignature =
      signature;

    order.paidAt =
      new Date()
        .toISOString();

    orders[
      orderIndex
    ] = order;

    writeJSON(
      ORDERS,
      orders
    );

    return json(
      res,
      200,
      {
        ok: true,

        orderId:
          order.id,

        message:
          "Payment verified successfully."
      }
    );
  }

  // =====================================
  // ADMIN ORDERS
  // =====================================

  if (
    p === "/api/orders" &&
    req.method === "GET"
  ) {
    if (!isAuthed(req)) {
      return json(
        res,
        401,
        {
          error:
            "Login required"
        }
      );
    }

    const orders =
      readJSON(
        ORDERS,
        []
      );

    return json(
      res,
      200,
      orders
        .slice()
        .reverse()
    );
  }

  // =====================================
  // SHORT ADMIN ADDRESS
  // =====================================

  if (p === "/admin") {
    const adminFile =
      path.join(
        ROOT,
        "shop",
        "admin.html"
      );

    if (
      !fs.existsSync(
        adminFile
      )
    ) {
      return send(
        res,
        404,
        "Admin page not found",
        "text/plain"
      );
    }

    return send(
      res,
      200,
      fs.readFileSync(
        adminFile
      ),
      "text/html; charset=utf-8"
    );
  }

  // =====================================
  // CHECKOUT PAGE
  // =====================================

  if (p === "/checkout") {
    const checkoutFile =
      path.join(
        ROOT,
        "checkout.html"
      );

    if (
      !fs.existsSync(
        checkoutFile
      )
    ) {
      return send(
        res,
        404,
        "Checkout page not created yet",
        "text/plain"
      );
    }

    return send(
      res,
      200,
      fs.readFileSync(
        checkoutFile
      ),
      "text/html; charset=utf-8"
    );
  }

  // =====================================
  // STATIC FILES
  // =====================================

  let file =
    p === "/"
      ? "/index.html"
      : p;

  const target =
    path.normalize(
      path.join(
        ROOT,
        file
      )
    );

  if (
    !target.startsWith(
      ROOT
    )
  ) {
    return send(
      res,
      403,
      "Forbidden",
      "text/plain"
    );
  }

  if (
    fs.existsSync(
      target
    ) &&
    fs.statSync(
      target
    ).isFile()
  ) {
    const ext =
      path
        .extname(target)
        .toLowerCase();

    const types = {
      ".html":
        "text/html; charset=utf-8",

      ".js":
        "text/javascript; charset=utf-8",

      ".css":
        "text/css; charset=utf-8",

      ".json":
        "application/json",

      ".svg":
        "image/svg+xml",

      ".jpg":
        "image/jpeg",

      ".jpeg":
        "image/jpeg",

      ".png":
        "image/png",

      ".webp":
        "image/webp",

      ".gif":
        "image/gif"
    };

    return send(
      res,
      200,
      fs.readFileSync(
        target
      ),
      types[ext] ||
        "application/octet-stream"
    );
  }

  return send(
    res,
    404,
    "Not found",
    "text/plain"
  );
}

http
  .createServer(
    (req, res) =>
      route(req, res)
        .catch(error => {
          console.error(error);

          json(
            res,
            500,
            {
              error:
                "Server error"
            }
          );
        })
  )
  .listen(
    PORT,
    () => {
      console.log(
        `MudduGumma store running at http://localhost:${PORT}`
      );

      if (
        !RAZORPAY_KEY_ID ||
        !RAZORPAY_KEY_SECRET
      ) {
        console.log(
          "Razorpay is not configured yet."
        );
      } else {
        console.log(
          "Razorpay payment configuration detected."
        );
      }
    }
  );