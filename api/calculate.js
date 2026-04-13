export default async function handler(req, res) {
  try {
    const address = (req.query.address || "").trim();

    if (!address) {
      return res.status(400).json({
        status: "ERROR",
        message: "Missing address."
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        status: "ERROR",
        message: "Missing GOOGLE_MAPS_API_KEY in Vercel."
      });
    }

    const BASE_ADDRESS = "2976 4th St, Orlando, FL 32820, USA";
    const RATE_PER_MILE = 0.50;
    const FREE_MILES = 8;
    const MAX_MILES = 50;

    const url =
      "https://maps.googleapis.com/maps/api/distancematrix/json?origins=" +
      encodeURIComponent(BASE_ADDRESS) +
      "&destinations=" + encodeURIComponent(address) +
      "&units=imperial&key=" + apiKey;

    const response = await fetch(url);
    const data = await response.json();

    if (
      !data ||
      !data.rows ||
      !data.rows[0] ||
      !data.rows[0].elements ||
      !data.rows[0].elements[0] ||
      data.rows[0].elements[0].status !== "OK"
    ) {
      return res.status(200).json({
        status: "ERROR",
        message: "Unable to calculate the delivery cost right now.",
        debug: data
      });
    }

    const meters = data.rows[0].elements[0].distance.value;
    const miles = meters * 0.000621371;

    if (miles > MAX_MILES) {
      return res.status(200).json({
        status: "OUT_OF_RANGE",
        miles: miles,
        price: "",
        freeThreshold: ""
      });
    }

    if (miles <= FREE_MILES) {
      return res.status(200).json({
        status: "FREE",
        miles: miles,
        price: 0,
        freeThreshold: 0
      });
    }

    let freeThreshold = 100;
    if (miles > 20 && miles <= 30) {
      freeThreshold = 150;
    } else if (miles > 30 && miles <= 50) {
      freeThreshold = 200;
    }

    let price = miles * RATE_PER_MILE;
    price = Math.floor(price) + 0.99;

    return res.status(200).json({
      status: "PAID",
      miles: miles,
      price: price,
      freeThreshold: freeThreshold
    });

  } catch (error) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message
    });
  }
}
