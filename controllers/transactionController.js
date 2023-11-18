const axios = require("axios");
const btoa = require("btoa");
const bookingService = require("../services/bookingService");
const { sendEmail } = require("../emails/bookingEmail");
const moment = require("moment");

module.exports.createNewTransaction = async (req, res) => {
  try {
    const username = process.env.INTEGRATION_KEY;
    const password = process.env.INTEGRATION_PASSWORD;
    const encodedToken = btoa(`${username}:${password}`);

    const {
      merchantSessionKey,
      "card-identifier": cardIdentifier,
      transactionObject,
      selectedShippingProviderObject,
      deliveryPackageObject,
      collectionDateTime,
    } = req.body;

    const transactData = JSON.parse(transactionObject);

    const packageData = JSON.parse(deliveryPackageObject);

    const reqBody = {
      vendorName: process.env.VENDOR_NAME,
      paymentMethod: {
        card: {
          merchantSessionKey,
          cardIdentifier,
        },
      },
      ...transactData,
    };

    // console.log(reqBody);

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      _url: process.env.CREATE_TRANSACTION_URL,
      get url() {
        return this._url;
      },
      set url(value) {
        this._url = value;
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${encodedToken}`,
      },
      data: reqBody,
    };
    const response = await axios.request(config);
    // const collectionDate = new Date();
    const bookingDetails = {
      customerFirstName: transactData.customerFirstName,
      customerLastName: transactData.customerLastName,
      customerEmail: transactData.customerEmail,
      customerPhone: transactData.customerPhone,
      billingAddress: transactData.billingAddress,
      shippingDetails: transactData.shippingDetails,
      transactionId: response.data.transactionId,
      price: transactData.amount,
      packages: packageData,
      shippingProvider: JSON.parse(selectedShippingProviderObject),
      bookingStatus: response.data.statusCode == "0000" ? 1 : 0,
      collectionDateTime: moment(collectionDateTime.replace(/"/g, "")).format(
        "YYYY-MM-DD HH:mm:ss"
      ),
      labelExpiryDateTime: moment(new Date())
        .add(1, "hour")
        .format("YYYY-MM-DD HH:mm:ss"),
    };

    const UUID = await bookingService.insertBookingDetails(bookingDetails);

    const contentForEmail = {
      orderId: UUID,
      ...bookingDetails,
    };

    sendEmail(
      transactData.customerEmail,
      "Thank you for Booking",
      contentForEmail,
      res
    );

    return res.redirect(
      process.env.APP_BASE_URL +
        `/thankyou/?order_id=${UUID}&&email=${transactData.customerEmail}`
    );
  } catch (error) {
    console.log({ error: error });
    return res.redirect(process.env.APP_BASE_URL + "/?success=no");
  }
};
