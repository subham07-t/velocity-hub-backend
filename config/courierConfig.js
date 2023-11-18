require("dotenv").config();

const development = {
  apiObjConfig: {
    testing: process.env.COURIER_SERVICE_TEST_MODE,
    dhl: {
      courier: process.env.COURIER_NAME_DHL,
      auth_company: process.env.AUTH_COMPANY_DHL,
    },
    evri: {
      courier: process.env.COURIER_NAME_EVRI,
      auth_company: process.env.AUTH_COMPANY_EVRI,
    },
    ups: {
      courier: process.env.COURIER_NAME_UPS,
      auth_company: process.env.AUTH_COMPANY_UPS,
    },
  },
  headersConfig: {
    maxBodyLength: Infinity,
    headers: {
      "api-user": process.env.COURIER_API_USER,
      "api-token": process.env.COURIER_API_TOKEN,
      "Content-Type": "application/json",
    },
  },
};

const production = {
  apiObjConfig: {
    testing: process.env.COURIER_SERVICE_TEST_MODE,
    dhl: {
      courier: process.env.COURIER_NAME_DHL,
      auth_company: process.env.AUTH_COMPANY_DHL,
    },
    evri: {
      courier: process.env.COURIER_NAME_EVRI,
      auth_company: process.env.AUTH_COMPANY_EVRI,
    },
    ups: {
      courier: process.env.COURIER_NAME_UPS,
      auth_company: process.env.AUTH_COMPANY_UPS,
    },
  },
  headersConfig: {
    maxBodyLength: Infinity,
    headers: {
      "api-user": process.env.COURIER_API_USER,
      "api-token": process.env.COURIER_API_TOKEN,
      "Content-Type": "application/json",
    },
  },
};

const courierApiConfig = { development, production };

module.exports = courierApiConfig[process.env.NODE_ENV];
