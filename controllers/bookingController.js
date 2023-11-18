const bookingService = require("../services/bookingService");

module.exports.saveBookingDetails = async (req, res) => {
  const data = req.body;
  const result = await bookingService.insertBookingDetails(data);
  return res.status(200).json({
    data: result,
  });
};

module.exports.getBookingDetails = async (req, res) => {
  const { uuid } = req.params;
  const result = await bookingService.getBookingDetails(uuid);
  return res.status(200).json({
    data: result,
  });
};
