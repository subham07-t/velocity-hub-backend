module.exports.generateInvoiceNumber = () => {
  const min = 1000000000; // Minimum 10-digit number
  const max = 9999999999; // Maximum 10-digit number

  const invoiceNumber = Math.floor(Math.random() * (max - min + 1)) + min;

  return invoiceNumber.toString();
};
