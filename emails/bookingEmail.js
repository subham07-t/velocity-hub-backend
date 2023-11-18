const nodemailer = require("nodemailer");
const emailConfig = require("../config/emailConfig");

// const ejs = require('ejs');

const transport = nodemailer.createTransport(emailConfig.connection);

const sendEmail = (receiver, subject, content, res) => {
  res.render(
    "../templates/email/index.ejs",
    { receiver, content },
    (err, data) => {
      if (err) {
        console.log("ERROR", err);
      } else {
        var mailOptions = {
          from: emailConfig.from,
          to: receiver,
          subject: subject,
          html: data,
        };

        transport.sendMail(mailOptions, (error, info) => {
          if (error) {
            return console.log(error);
          }
          console.log(
            "Response: %s\nEnvelope: %j\nMessageId: %s",
            info.response,
            info.envelope,
            info.messageId
          );
        });
      }
    }
  );
};

module.exports = {
  sendEmail,
};
