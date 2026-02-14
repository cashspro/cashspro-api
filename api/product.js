export default async function handler(req, res) {

  const productUrl = req.query.url;

  if (!productUrl) {
    return res.status(400).json({ error: "Missing product URL" });
  }

  try {

    const response = await fetch("https://api-sg.aliexpress.com/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.ALI_APP_KEY,
        "X-API-SECRET": process.env.ALI_APP_SECRET
      },
      body: JSON.stringify({
        productUrl: productUrl
      })
    });

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: "API Error", details: error.message });
  }

}
