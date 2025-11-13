import fetch from "node-fetch";

const SHOPIFY_ADMIN_URL =
  process.env.SHOPIFY_ADMIN_URL?.trim() ||
  "https://006sda-7b.myshopify.com/admin/api/2025-04";

const SHOPIFY_ADMIN_TOKEN =
  process.env.SHOPIFY_ADMIN_API_KEY?.trim() ||
  process.env.SHOPIFY_ADMIN_TOKEN?.trim();

/**
 * 🔍 Query Shopify for fulfillmentOrders + physicalLocation
 */
async function getOrderStatus(orderId) {
  const graphql = `
    query {
      order(id: "gid://shopify/Order/${orderId}") {
        id
        name
        displayFinancialStatus
        displayFulfillmentStatus
        processedAt
        createdAt
        physicalLocation {
          id
          name
        }
        fulfillmentOrders(first: 10) {
          edges {
            node {
              id
              status
              assignedLocation {
                location {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(`${SHOPIFY_ADMIN_URL}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({ query: graphql }),
  });

  const body = await res.json();
  return body?.data?.order || null;
}

/**
 * 📍 /api/admin/recheck-order
 * Lightweight diagnostic endpoint
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Use GET with ?orderId=" });

  try {
    const orderId = req.query.orderId;
    if (!orderId)
      return res
        .status(400)
        .json({ error: "Missing orderId. Use /api/admin/recheck-order?orderId=123" });

    console.log(`🔍 Rechecking Shopify order ${orderId}...`);

    const order = await getOrderStatus(orderId);

    if (!order) {
      console.warn("⚠️ Order not found in Shopify Admin API.");
      return res.status(404).json({ error: "Order not found" });
    }

    const fulfillmentOrders = order.fulfillmentOrders?.edges || [];
    const physicalLocation = order.physicalLocation;

    console.log("📦 FulfillmentOrders count:", fulfillmentOrders.length);
    console.log("📍 physicalLocation:", physicalLocation || "null");

    return res.status(200).json({
      orderId,
      name: order.name,
      financialStatus: order.displayFinancialStatus,
      fulfillmentStatus: order.displayFulfillmentStatus,
      physicalLocation,
      fulfillmentOrders: fulfillmentOrders.map((edge) => ({
        id: edge.node.id,
        status: edge.node.status,
        assignedLocation: edge.node.assignedLocation?.location || null,
      })),
      summary: {
        hasPhysicalLocation: !!physicalLocation,
        hasFulfillmentOrders: fulfillmentOrders.length > 0,
      },
    });
  } catch (err) {
    console.error("❌ Error in /recheck-order:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
