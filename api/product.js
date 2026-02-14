import crypto from "crypto";

export default async function handler(req, res) {

  const productUrl = req.query.url;

  if (!productUrl) {
    return res.status(400).json({ error: "Missing product URL" });
  }

  const appKey = process.env.ALI_APP_KEY;
  const appSecret = process.env.ALI_APP_SECRET;

  const method = "aliexpress.affiliate.link.generate";
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);

  const params = {
    app_key: appKey,
    method: method,
    timestamp: timestamp,
    format: "json",
    v: "2.0",
    sign_method: "sha256",
    promotion_link_type: 0,
    source_values: productUrl
  };

  const sortedKeys = Object.keys(params).sort();

let signString = "";

sortedKeys.forEach(key => {
  signString += key + params[key];
});

signString = appSecret + signString + appSecret;

const sign = crypto
  .createHmac("sha256", appSecret)
  .update(signString)
  .digest("hex")
  .toUpperCase();

  signString += appSecret;

  const sign = crypto
    .createHash("sha256")
    .update(signString)
    .digest("hex")
    .toUpperCase();

  params.sign = sign;

  const query = new URLSearchParams(params).toString();

  try {
    const response = await fetch(
      "https://api-sg.aliexpress.com/sync?" + query
    );

    const data = await response.json();

    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({
      error: "API request failed",
      details: error.message
    });
  }

}
