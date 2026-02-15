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

    // 🔥 أولاً: نحصل على product_id عبر link.generate
    const productId = await getProductIdFromLink(url, appKey, appSecret);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Could not resolve product ID"
      });
    }

    // 🔥 ثانياً: نطلب تفاصيل المنتج
    const detailParams = {
      app_key: appKey,
      method: "aliexpress.affiliate.productdetail.get",
      timestamp: Date.now().toString(),
      sign_method: "sha256",
      format: "json",
      v: "2.0",
      product_ids: productId
    };

    const detailSign = generateSign(detailParams, appSecret);

    const detailQuery = new URLSearchParams({
      ...detailParams,
      sign: detailSign
    }).toString();

    const detailResponse = await fetch(
      `https://api-sg.aliexpress.com/sync?${detailQuery}`
    );

    const detailData = await detailResponse.json();

    const product =
      detailData?.aliexpress_affiliate_productdetail_get_response?.resp_result
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
      message: error.message
    });
  }
}

async function getProductIdFromLink(url, appKey, appSecret) {
  const params = {
    app_key: appKey,
    method: "aliexpress.affiliate.link.generate",
    timestamp: Date.now().toString(),
    sign_method: "sha256",
    format: "json",
    v: "2.0",
    promotion_link_type: 0,
    source_values: url
  };

  const sign = generateSign(params, appSecret);

  const query = new URLSearchParams({
    ...params,
    sign
  }).toString();

  const response = await fetch(
    `https://api-sg.aliexpress.com/sync?${query}`
  );

  const data = await response.json();

  const result =
    data?.aliexpress_affiliate_link_generate_response?.resp_result
      ?.result?.promotion_links?.promotion_link?.[0]?.promotion_link;

  if (!result) return null;

  const match = result.match(/(\d{10,})/);
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
