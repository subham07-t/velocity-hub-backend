const nodemailer = require("nodemailer");
const emailConfig = require("../config/emailConfig");

const transport = nodemailer.createTransport(emailConfig.connection);

const sendNotifyEmail = (content, res) => {
  res.render("../templates/email/error.ejs", { content }, (err, data) => {
    if (err) {
      console.log("ERROR", err);
    } else {
      var mailOptions = {
        from: emailConfig.from,
        to: emailConfig.to,
        cc: emailConfig.cc,
        subject: "Urgent: Label Generation Error Notification",
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
  });
};

module.exports = {
  sendNotifyEmail,
};
