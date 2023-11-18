const axios = require("axios");
const btoa = require("btoa");

module.exports.createNewMerchantSession = async (req, res) => {
  try {
    const encodedToken = btoa(
      `${process.env.INTEGRATION_KEY}:${process.env.INTEGRATION_PASSWORD}`
    );

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: process.env.CREATE_MERCHANT_SESSION_KEY_URL,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${encodedToken}`,
      },
      data: JSON.stringify({
        vendorName: process.env.VENDOR_NAME,
      }),
    };

    const response = await axios.request(config);

    return res.json({ data: response.data });
  } catch (error) {
    return res.status(400).json({
      error: {
        message: error.message,
        code: error.code,
        status: error.status,
      },
      data: error.response.data,
    });
  }
};
