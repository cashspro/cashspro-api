import crypto from "crypto";

export default async function handler(req, res) {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "No product URL provided" });
    }

    const appKey = process.env.AE_APP_KEY;
    const appSecret = process.env.AE_APP_SECRET;

    const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);

    const productIdMatch = url.match(/item\/(\d+)/);
    if (!productIdMatch) {
      return res.status(400).json({ error: "Invalid AliExpress URL" });
    }

    const productId = productIdMatch[1];

    const params = {
      app_key: appKey,
      method: "aliexpress.affiliate.productdetail.get",
      product_ids: productId,
      sign_method: "sha256",
      timestamp: timestamp,
      format: "json",
      v: "2.0"
    };

    const sortedKeys = Object.keys(params).sort();
    let baseString = "";

    sortedKeys.forEach(key => {
      baseString += key + params[key];
    });

    const sign = crypto
      .createHmac("sha256", appSecret)
      .update(baseString)
      .digest("hex")
      .toUpperCase();

    const queryString = new URLSearchParams({
      ...params,
      sign
    }).toString();

    const response = await fetch(
      `https://api-sg.aliexpress.com/sync?${queryString}`
    );

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
