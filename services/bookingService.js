const mysql = require("mysql2/promise");
const dbConfig = require("../config/databaseConnection");
const { v4: uuid } = require("uuid");
const moment = require("moment");

module.exports.insertBookingDetails = async (data) => {
  const connection = await mysql.createConnection(dbConfig.db);
  const UUID = uuid();
  const sql = `INSERT INTO bookings (
        uuid, 
        first_name, 
        last_name, 
        email, 
        phone, 
        billing_address, 
        shipping_address, 
        status, 
        transaction_id,
        price,
        packages,
        shipping_provider,
        collection_date_time,
        label_expiry_date_time
    ) 
    VALUES (
        '${UUID}',
        '${data.customerFirstName}', 
        '${data.customerLastName}',
        '${data.customerEmail}',
        '${data.customerPhone}',
        '${JSON.stringify(data.billingAddress)}',
        '${JSON.stringify(data.shippingDetails)}',
        '${data.bookingStatus}',
        '${data.transactionId}',
        '${data.price}',
        '${JSON.stringify(data.packages)}',
        '${JSON.stringify(data.shippingProvider)}',
        '${data.collectionDateTime}',
        '${data.labelExpiryDateTime}'
    )`;
  const [results] = await connection.execute(sql);
  connection.end();

  if (!results || results.length === 0) {
    return null;
  }
  return UUID;
};

module.exports.getBookingDetails = async (uuid) => {
  const connection = await mysql.createConnection(dbConfig.db);
  const sql = `SELECT * FROM bookings WHERE uuid = '${uuid}' `;
  const [results] = await connection.execute(sql);
  connection.end();

  if (!results || results.length === 0) {
    return null;
  } else {
    const parsedResults = {
      ...results[0],
      billing_address: JSON.parse(results[0].billing_address),
      shipping_address: JSON.parse(results[0].shipping_address),
      packages: JSON.parse(results[0].packages),
      shipping_provider: JSON.parse(results[0].shipping_provider),
      shipment_info: JSON.parse(results[0].shipment_info),
    };

    return parsedResults;
  }
};

module.exports.updateBookingCourierInfo = async (bookingId, data) => {
  const labelExpiryDateTime = moment(new Date())
    .add(1, "hour")
    .format("YYYY-MM-DD HH:mm:ss");
  const connection = await mysql.createConnection(dbConfig.db);
  const sql = `UPDATE bookings SET label_expiry_date_time = '${labelExpiryDateTime}',shipment_info = '${data}' WHERE uuid = '${bookingId}'`;
  await connection.execute(sql);
  connection.end();
  return true;
};

module.exports.updateCollectionDateTime = async (uuid, date) => {
  const connection = await mysql.createConnection(dbConfig.db);
  const collectionDateForUpdate = moment(date.replace(/"/g, "")).format(
    "YYYY-MM-DD HH:mm:ss"
  );
  const sql = `UPDATE bookings SET collection_date_time = '${collectionDateForUpdate}' WHERE uuid = '${uuid}'`;
  await connection.execute(sql);
  connection.end();
  return true;
};
