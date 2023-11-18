require("dotenv").config();

const development = {
  connection: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  },
  from: process.env.EMAIL_FROM,
  to: process.env.EMAIL_TO,
  cc: process.env.EMAIL_CC,
};

const production = {
  connection: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  },
  from: process.env.EMAIL_FROM,
  to: process.env.EMAIL_TO,
  cc: process.env.EMAIL_CC,
};

const emailConfig = { development, production };

module.exports = emailConfig[process.env.NODE_ENV];
