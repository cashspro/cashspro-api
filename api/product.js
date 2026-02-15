import crypto from "crypto";

export default async function handler(req, res) {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "Product URL is required"
      });
    }

    const appKey = process.env.AE_APP_KEY;
    const appSecret = process.env.AE_APP_SECRET;

    if (!appKey || !appSecret) {
      return res.status(500).json({
        success: false,
        message: "AliExpress credentials not configured"
      });
    }

    const method = "aliexpress.affiliate.productdetail.get";
    const timestamp = Date.now().toString();

    const params = {
      app_key: appKey,
      method,
      timestamp,
      sign_method: "sha256",
      format: "json",
      v: "2.0",
      product_ids: extractProductId(url),
      fields:
        "product_id,product_title,product_main_image_url,product_small_image_urls," +
        "target_sale_price,target_original_price,discount,commission_rate,shop_name,promotion_link"
    };

    const sign = generateSign(params, appSecret);

    const queryString = new URLSearchParams({
      ...params,
      sign
    }).toString();

    const response = await fetch(
      `https://api-sg.aliexpress.com/sync?${queryString}`
    );

    const data = await response.json();

    const product =
      data?.aliexpress_affiliate_productdetail_get_response?.resp_result
        ?.result?.products?.product?.[0];

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: product.product_id,
        title: product.product_title,
        price: Number(product.target_sale_price),
        old_price: Number(product.target_original_price),
        discount: product.discount,
        currency: product.target_sale_price_currency,
        image: product.product_main_image_url,
        images: product.product_small_image_urls?.string || [],
        affiliate_link: product.promotion_link,
        store: product.shop_name,
        commission_rate: product.commission_rate
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
}

function extractProductId(url) {
  const match = url.match(/\/item\/(\d+)\.html/);
  return match ? match[1] : null;
}

function generateSign(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  let baseString = secret;

  for (const key of sortedKeys) {
    baseString += key + params[key];
  }

  baseString += secret;

  return crypto
    .createHmac("sha256", secret)
    .update(baseString)
    .digest("hex")
    .toUpperCase();
}
