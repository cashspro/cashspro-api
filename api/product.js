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

    // منع روابط s.click
    if (url.includes("s.click.aliexpress.com")) {
      return res.status(400).json({
        success: false,
        message: "Please provide original AliExpress product URL, not affiliate short link."
      });
    }

    // استخراج Product ID
    const match = url.match(/\/item\/(\d+)\.html/);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid AliExpress product URL format."
      });
    }

    const productId = match[1];

    const appKey = process.env.ALIEXPRESS_APP_KEY;
    const appSecret = process.env.ALIEXPRESS_APP_SECRET;

    if (!appKey || !appSecret) {
      return res.status(500).json({
        success: false,
        message: "API credentials not configured."
      });
    }

    const timestamp = Date.now().toString();

    const params = {
      app_key: appKey,
      method: "aliexpress.affiliate.productdetail.get",
      timestamp,
      format: "json",
      v: "2.0",
      sign_method: "sha256",
      product_ids: productId,
      target_currency: "USD",
      target_language: "EN"
    };

    const sortedKeys = Object.keys(params).sort();
    let signString = appSecret;

    sortedKeys.forEach(key => {
      signString += key + params[key];
    });

    signString += appSecret;

    const sign = crypto
      .createHash("sha256")
      .update(signString)
      .digest("hex")
      .toUpperCase();

    params.sign = sign;

    const queryString = new URLSearchParams(params).toString();

    const apiResponse = await fetch(
      `https://api-sg.aliexpress.com/sync?${queryString}`
    );

    const responseData = await apiResponse.json();

    const data =
      responseData?.aliexpress_affiliate_productdetail_get_response
        ?.resp_result?.result?.products?.product?.[0];

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      product: {
        id: data.product_id,
        title: data.product_title,
        image: data.product_main_image_url,
        price: data.target_sale_price,
        original_price: data.target_original_price,
        discount: data.discount,
        currency: "USD",
        rating: data.evaluate_rate,
        sales: data.lastest_volume
      }
    });

  } catch (error) {
    console.error("SERVER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}
