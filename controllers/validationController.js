const axios = require("axios");

module.exports.validatePostcode = async (req, res) => {
  const { postalCode, country } = req.body;

  try {
    const response = await axios({
      method: "get",
      url: `https://api.addressy.com/Capture/Interactive/Find/v1.10/json3.ws?Key=${process.env.LOQATE_API_KEY}&text=${postalCode}&Countries=${country}&Filters=Postcode:${postalCode}`,
    });

    if (response.data?.Items) {
      return res.status(200).json({
        data: response.data?.Items,
      });
    } else {
      return res.status(200).json({
        data: null,
      });
    }
  } catch (error) {
    return res.status(400).json(error);
  }
};
