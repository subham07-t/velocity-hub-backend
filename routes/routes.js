const express = require("express");
const router = express.Router();

const transactionController = require("../controllers/transactionController");
const merchantSessionController = require("../controllers/merchantSession");
const shippingController = require("../controllers/shippingController");
const bookingController = require("../controllers/bookingController");
const courierController = require("../controllers/courierController");
const validationController = require("../controllers/validationController");

router.post(
  "/get-merchant-session-key",
  merchantSessionController.createNewMerchantSession
);

router.post("/create-transaction", transactionController.createNewTransaction);

//Shipping Endpoints
router.post("/shipping-providers", shippingController.shippingProviders);

//Booking Endpoints
router.post("/booking-details", bookingController.saveBookingDetails);
router.get("/booking-details/:uuid", bookingController.getBookingDetails);

//Courier Services endpoints
router.get("/courier-list", courierController.getAllCourierLists);
router.post("/shipping-label", courierController.generateShippingLabel);
router.post("/renew-label", courierController.renewLabel);

//PostalCode validation endpoint

router.post("/validate-postcode", validationController.validatePostcode);

module.exports = router;
