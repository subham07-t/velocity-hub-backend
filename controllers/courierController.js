const axios = require("axios");
const courierApiConfig = require("../config/courierConfig");
const {
  getBookingDetails,
  updateBookingCourierInfo,
  updateCollectionDateTime,
} = require("../services/bookingService");
const { sendNotifyEmail } = require("../emails/errorNotifyEmail");
const moment = require("moment-timezone");
const { generateInvoiceNumber } = require("../utils/generateInvoiceNo");
const { uploadToBucket } = require("../utils/bucket");

module.exports.getAllCourierLists = async (req, res) => {
  try {
    let config = {
      method: "get",
      url: process.env.COURIER_API_URL + "/list-couriers",
      ...courierApiConfig.headersConfig,
    };

    const response = await axios(config);
    return res.json({ data: response.data });
  } catch (error) {
    return res.status(400).json({
      error: {
        message: error.message,
        code: error.code,
        status: error.status,
      },
      data: error.response.data,
    });
  }
};

module.exports.generateShippingLabel = async (req, res) => {
  const request = req.body;

  if (request.collection_date_time) {
    await updateCollectionDateTime(
      request.booking_id,
      request.collection_date_time
    );
  }

  /* Get booking details & packages details */

  const bookingDetails = await getBookingDetails(request.booking_id);
  const items = bookingDetails.packages;

  const orderId = bookingDetails?.uuid;
  const collectionDateTime = bookingDetails?.collection_date_time;

  const billingFullName =
    bookingDetails?.first_name + " " + bookingDetails?.last_name;
  const billingPostalCode = bookingDetails?.billing_address.postalCode;
  const billingCity = bookingDetails?.billing_address.city;
  const billingCountry = bookingDetails?.billing_address.country;
  const billingAddress1 = bookingDetails?.billing_address.address1;
  const billingAddress2 = bookingDetails?.billing_address.address2;
  const billingCompanyName = bookingDetails?.billing_address.companyName;

  const shippingFullName =
    bookingDetails?.shipping_address.recipientFirstName +
    " " +
    bookingDetails?.shipping_address.recipientLastName;
  const shippingPostalCode =
    bookingDetails?.shipping_address.shippingPostalCode;
  const shippingCity = bookingDetails?.shipping_address.shippingCity;
  const shippingCountry = bookingDetails?.shipping_address.shippingCountry;
  const shippingAddress1 = bookingDetails?.shipping_address.shippingAddress1;
  const shippingAddress2 = bookingDetails?.shipping_address.shippingAddress2;
  const shippingCompanyName = bookingDetails?.shipping_address.companyName;
  const shippingEmail = bookingDetails?.shipping_address.email;
  const shippingPhoneNo = bookingDetails?.shipping_address.phoneNo;

  /* items object for dispatch cloud */
  let total_weight = 0;
  let total_height = 0;
  let total_length = 0;
  let total_width = 0;

  let item_parcels = [];
  items.map((item) => {
    total_weight = total_weight + parseInt(item.weight);
    total_height = total_height + parseInt(item.height);
    total_length = total_length + parseInt(item.length);
    total_width = total_width + parseInt(item.width);

    let tempItem = {
      description: item.itemDescription,
      quantity: parseInt(item.quantity),
      value: 1,
      value_currency: "GBP",
      weight: parseInt(item.weight),
      weight_unit: "kg",
      sku: item.sku,
      _original_value: 1,
    };
    item_parcels.push(tempItem);
  });

  /* DHL direct Api packages content */
  let total_weight_for_direct = 0;
  let packages_measurement_details = [];
  let lineItems_details = [];

  items.map((item, index) => {
    total_weight_for_direct = total_weight_for_direct + parseInt(item.weight);

    let tempMeasurementItem = {
      weight: parseInt(item.weight),

      dimensions: {
        length: parseInt(item.length),
        width: parseInt(item.width),
        height: parseInt(item.height),
      },
    };
    let tempLineItem = {
      number: index + 1,
      description: item.itemDescription,
      price: 1,
      quantity: {
        value: parseInt(item.quantity),
        unitOfMeasurement: "EA",
      },
      exportReasonType: "permanent",
      manufacturerCountry: billingCountry,
      weight: {
        netValue: parseInt(item.weight),
        grossValue: parseInt(item.weight),
      },
      isTaxesPaid: false,
      customerReferences: [
        {
          typeCode: "AFE",
          value: item.sku,
        },
      ],
    };
    packages_measurement_details.push(tempMeasurementItem);
    lineItems_details.push(tempLineItem);
  });

  const dhl = {
    courierData: {
      plannedShippingDateAndTime:
        moment.utc(collectionDateTime).format("YYYY-MM-DD[T]HH:mm:ss") +
        "GMT+01:00",
      pickup: {
        isRequested:
          bookingDetails.shipping_provider.delivery_type === "collection"
            ? true
            : false,
        location: "",
        pickupDetails: {
          postalAddress: {
            postalCode: billingPostalCode,
            cityName: billingCity,
            countryCode: billingCountry,
            addressLine1: billingAddress1,
          },
          contactInformation: {
            email: bookingDetails.email,
            phone: bookingDetails.phone,
            companyName: billingCompanyName,
            fullName: billingFullName,
          },
          typeCode: "business",
        },
      },

      productCode: "P",
      localProductCode: "P",
      accounts: [
        {
          typeCode: "shipper",
          number: process.env.DHL_ACCOUNT_NUMBER,
        },
      ],
      outputImageProperties: {
        printerDPI: 200,
        encodingFormat: "pdf",
        imageOptions: [
          {
            typeCode: "label",

            // need to clarify about this templateName
            templateName: "ECOM26_A6_002",
            isRequested: true,
          },
          {
            typeCode: "invoice",

            // need to clarify about this templateName
            templateName: "COMMERCIAL_INVOICE_L_10",
            isRequested: true,
            invoiceType: "commercial",
          },
        ],
        splitTransportAndWaybillDocLabels: true,
        allDocumentsInOneImage: false,
        splitDocumentsByPages: true,
        splitInvoiceAndReceipt: true,
        receiptAndLabelsInOneImage: true,
      },
      customerDetails: {
        shipperDetails: {
          postalAddress: {
            postalCode: billingPostalCode,
            cityName: billingCity,
            countryCode: billingCountry,
            addressLine1: billingAddress1,
          },
          contactInformation: {
            email: bookingDetails.email,
            phone: bookingDetails.phone,
            companyName: billingCompanyName,
            fullName: billingFullName,
          },
          typeCode: "business",
        },
        receiverDetails: {
          postalAddress: {
            postalCode: shippingPostalCode,
            cityName: shippingCity,
            countryCode: shippingCountry,
            addressLine1: shippingAddress1,
          },
          contactInformation: {
            email: shippingEmail,
            phone: shippingPhoneNo,
            companyName: shippingCompanyName,
            fullName: shippingFullName,
          },
          /* Need to clarify about this . */
          typeCode: "direct_consumer",
        },
      },
      content: {
        packages: packages_measurement_details,
        isCustomsDeclarable: true,
        declaredValue: 1,
        declaredValueCurrency: "GBP",

        /* need to clarify that */

        exportDeclaration: {
          lineItems: lineItems_details,
          invoice: {
            number: generateInvoiceNumber(),
            date: "2023-10-31",
            totalNetWeight: total_weight_for_direct,
            totalGrossWeight: total_weight_for_direct,
          },
          exportReason: "sale",
          exportReasonType: "permanent",
          shipmentType: "commercial",
        },

        /* need to clarify that */
        description: "Test",
        incoterm: "DAP",
        unitOfMeasurement: "metric",
      },
      shipmentNotification: [
        {
          typeCode: "email",
          receiverId: shippingEmail,
          languageCode: "eng",
          languageCountryCode: shippingCountry,
        },
      ],
      getTransliteratedResponse: false,
    },
    url: process.env.COURIER_DHL_API_URL,
  };

  /* Evri direct api */
  // const evri = {
  //   courierData: `<soapenv:Envelope
  //   xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  //   xmlns:v4="http://v4.web.domain.routing.hermes.co.uk/">
  //   <soapenv:Header/>
  //   <soapenv:Body>
  //     <v4:routeDeliveryCreatePreadviceAndLabel>
  //       <deliveryRoutingRequest>
  //         <clientId>${process.env.EVRI_CLIENT_ID}</clientId>
  //         <clientName>${process.env.EVRI_CLIENT_NAME}</clientName>
  //         <childClientId></childClientId>
  //         <childClientName></childClientName>
  //         <batchNumber>2</batchNumber>
  //         <userId>${process.env.EVRI_USER_ID}</userId>
  //         <sourceOfRequest>CLIENTWS</sourceOfRequest>
  //         <deliveryRoutingRequestEntries>
  //           <deliveryRoutingRequestEntry>
  //             <addressValidationRequired>true</addressValidationRequired>
  //             <customer>
  //               <address>
  //                 <title></title>
  //                 <firstName>${bookingDetails.shipping_address.recipientFirstName}</firstName>
  //                 <lastName>${bookingDetails.shipping_address.recipientLastName}</lastName>
  //                 <streetName>${shippingCompanyName}</streetName>
  //                 <addressLine1>${bookingDetails.shipping_address.shippingAddress1}</addressLine1>
  //                 <addressLine2></addressLine2>
  //                 <city>${shippingCity}</city>
  //                 <region></region>
  //                 <postCode>${shippingPostalCode}</postCode>
  //                 <countryCode>${shippingCountry}</countryCode>
  //               </address>
  //               <homePhoneNo>${shippingPhoneNo}</homePhoneNo>
  //               <workPhoneNo>${shippingPhoneNo}</workPhoneNo>
  //               <mobilePhoneNo>${shippingPhoneNo}</mobilePhoneNo>
  //               <faxNo></faxNo>
  //               <email>${shippingEmail}</email>
  //               <customerReference1>${orderId}</customerReference1>
  //               <customerReference2></customerReference2>
  //               <customerAlertType></customerAlertType>
  //               <customerAlertGroup></customerAlertGroup>
  //               <deliveryMessage></deliveryMessage>
  //               <specialInstruction1></specialInstruction1>
  //               <specialInstruction2></specialInstruction2>
  //             </customer>
  //             <parcel>
  //               <weight>10000</weight>
  //               <length>10</length>
  //               <width>4</width>
  //               <depth>10</depth>
  //               <girth>0</girth>
  //               <combinedDimension>0</combinedDimension>
  //               <volume>0</volume>
  //               <currency>GBP</currency>
  //               <value>100</value>
  //               <numberOfParts></numberOfParts>
  //               <numberOfItems>1</numberOfItems>
  //               <description>Test Doc</description>
  //               <originOfParcel>GB</originOfParcel>
  //               <dutyPaid>U</dutyPaid>
  //             </parcel>
  //             <services>
  //               <nextDay></nextDay>
  //               <signature>false</signature>
  //             </services>
  //             <senderAddress>
  //               <addressLine1>${bookingDetails.billing_address.companyName}</addressLine1>
  //               <addressLine2>${billingAddress1}</addressLine2>
  //               <addressLine3>${billingCity}</addressLine3>
  //               <addressLine4>${billingPostalCode}</addressLine4>
  //             </senderAddress>
  //             <expectedDespatchDate>2023-10-21T00:00:00</expectedDespatchDate>
  //             <countryOfOrigin>GB</countryOfOrigin>
  //           </deliveryRoutingRequestEntry>
  //         </deliveryRoutingRequestEntries>
  //       </deliveryRoutingRequest>
  //     </v4:routeDeliveryCreatePreadviceAndLabel>
  //   </soapenv:Body>
  // </soapenv:Envelope>
  // `,
  //   url: process.env.COURIER_EVRI_API_URL,
  // };

  /* for dispatch cloud */
  // const dhl = {
  //   courierData: {
  //     testing: courierApiConfig.apiObjConfig.testing,
  //     ...courierApiConfig.apiObjConfig.dhl,
  //     format_address_default: true,
  //     shipment: {
  //       label_size: "6x4",
  //       label_format: "pdf",
  //       generate_invoice: false,
  //       generate_packing_slip: false,
  //       dc_service_id: "DHL-WPX",
  //       account_number: "1000",
  //       account_name: null,
  //       courier: {
  //         friendly_service_name: "Express Worldwide",
  //         lead_time: "Next Day",
  //       },
  //       collection_date: new Date(collectionDateTime),
  //       ship_from: {
  //         name: billingFullName,
  //         phone: bookingDetails.phone,
  //         email: bookingDetails.email,
  //         company_name:billingCompanyName,
  //         address_1: billingAddress1,
  //         address_2: billingAddress2,
  //         city: billingCity,
  //         postcode: billingPostalCode,
  //         county: null,
  //       },
  //       ship_to: {
  //         name:
  //        shippingFullName,
  //         phone: shippingPhoneNo,
  //         email: shippingEmail,
  //         company_name: shippingCompanyName,
  //         address_1:shippingAddress1,
  //         address_2: shippingAddress2,
  //         city: shippingCity,
  //         county: null,
  //         postcode: shippingPostalCode,
  //         country_iso: shippingCountry,
  //       },
  //       parcels: [
  //         {
  //           dim_length: total_length,
  //           dim_width: total_width,
  //           dim_height: total_height,
  //           dim_unit: "cm",
  //           items: item_parcels,
  //         },
  //       ],
  //     },
  //   },
  //   url: process.env.COURIER_API_URL + "/DHL/create-label",
  // };
  const evri = {
    courierData: {
      testing: courierApiConfig.apiObjConfig.testing,
      ...courierApiConfig.apiObjConfig.evri,
      format_address_default: true,
      shipment: {
        reference: orderId,
        label_size: "6x4",
        label_format: "pdf",
        generate_invoice: false,
        generate_packing_slip: false,
        collection_date: new Date(collectionDateTime),
        ship_from: {
          name: billingFullName,
          phone: bookingDetails.phone,
          email: bookingDetails.email,
          company_name: billingCompanyName,
          address_1: billingAddress1,
          address_2: billingAddress2,
          city: billingCity,
          postcode: billingPostalCode,
          county: null,
        },
        ship_to: {
          name: shippingFullName,
          phone: shippingPhoneNo,
          email: shippingEmail,
          company_name: shippingCompanyName,
          address_1: shippingAddress1,
          address_2: shippingAddress2,
          city: shippingCity,
          county: null,
          postcode: shippingPostalCode,
          country_iso: shippingCountry,
        },
        parcels: [
          {
            dim_length: total_length,
            dim_width: total_width,
            dim_height: total_height,
            dim_unit: "cm",
            items: item_parcels,
          },
        ],
      },
    },
    url: process.env.COURIER_API_URL + "/HermesCorporate/create-label",
  };
  const ups = {
    courierData: {
      testing: courierApiConfig.apiObjConfig.testing,
      ...courierApiConfig.apiObjConfig.ups,
      format_address_default: true,
      shipment: {
        reference: orderId,
        label_size: "6x4",
        label_format: "pdf",
        generate_invoice: false,
        generate_packing_slip: false,
        courier: {
          service_code: "11",
          service_description: "Standard",
        },
        collection_date: new Date(collectionDateTime),
        ship_from: {
          name: billingFullName,
          phone: bookingDetails.phone,
          email: bookingDetails.email,
          company_name: billingCompanyName,
          address_1: billingAddress1,
          address_2: billingAddress2,
          city: billingCity,
          postcode: billingPostalCode,
          county: null,
        },
        ship_to: {
          name: shippingFullName,
          phone: shippingPhoneNo,
          email: shippingEmail,
          company_name: shippingCompanyName,
          address_1: shippingAddress1,
          address_2: shippingAddress2,
          city: shippingCity,
          county: null,
          postcode: shippingPostalCode,
          country_iso: shippingCountry,
        },
        parcels: [
          {
            dim_length: total_length,
            dim_width: total_width,
            dim_height: total_height,
            dim_unit: "cm",
            items: item_parcels,
          },
        ],
      },
    },
    url: process.env.COURIER_API_URL + "/UPS/create-label",
  };

  const dataObject = { dhl, evri, ups };
  const courierUrl = { dhl, evri, ups };

  /* api config object for dispatch cloud */

  // let config = {
  //   method: "POST",
  //   url: courierUrl[bookingDetails.shipping_provider.provider_company].url,
  //   ...courierApiConfig.headersConfig,
  //   data: dataObject[bookingDetails.shipping_provider.provider_company]
  //     .courierData,
  // };

  /* api config object for direct integration */

  let config = {
    dhl_direct: {
      method: "POST",
      headers: {
        Authorization: `Basic ${process.env.DHL_HEADER_TOKEN}`,
      },
      url: courierUrl[bookingDetails.shipping_provider.provider_company].url,
      data: dataObject[bookingDetails.shipping_provider.provider_company]
        .courierData,
    },
    evri_direct: {
      method: "POST",
      headers: {
        client_id: process.env.EVRI_CLIENT_ID,
        client_name: process.env.EVRI_CLIENT_NAME,
        user_id: process.env.EVRI_USER_ID,
        user_password: process.env.EVRI_USER_PASSWORD,
        "Content-Type": "application/xml",
      },
      url: courierUrl[bookingDetails.shipping_provider.provider_company].url,
      data: dataObject[bookingDetails.shipping_provider.provider_company]
        .courierData,
    },
    for_dispatch: {
      method: "POST",
      url: courierUrl[bookingDetails.shipping_provider.provider_company].url,
      ...courierApiConfig.headersConfig,
      data: dataObject[bookingDetails.shipping_provider.provider_company]
        .courierData,
    },
  };

  try {
    /* For DHL direct integration */
    if (bookingDetails.shipping_provider.provider_company === "dhl") {
      const response = await axios(config.dhl_direct);
      const elementWithLabel = response.data.documents.find(
        (obj) => obj.typeCode === "label"
      );
      const elementWithInvoice = response.data.documents.find(
        (obj) => obj.typeCode === "invoice"
      );

      const labelFileName = `${bookingDetails.shipping_provider.provider_company}-${orderId}-label.pdf`;
      const invoiceFileName = `${bookingDetails.shipping_provider.provider_company}-${orderId}-invoice.pdf`;

      const labelDetails = await uploadToBucket(
        labelFileName,
        elementWithLabel.content
      );
      const invoiceDetails = await uploadToBucket(
        invoiceFileName,
        elementWithInvoice.content
      );
      const documents = [
        {
          type: "label",
          value: { uri: labelDetails.Location, key: labelDetails.key },
        },
        {
          type: "invoice",
          value: { uri: invoiceDetails.Location, key: invoiceDetails.key },
        },
      ];

      const modifiedShipmentInfo = { ...response.data, documents: documents };

      await updateBookingCourierInfo(
        request.booking_id,
        JSON.stringify(modifiedShipmentInfo)
      );

      return res.json({ data: modifiedShipmentInfo });
    } else {
      /* For dispatch cloud */
      const response = await axios(config.for_dispatch);
      await updateBookingCourierInfo(
        request.booking_id,
        JSON.stringify(response.data)
      );
      return res.json({ data: response.data });
    }
  } catch (error) {
    const content = {
      orderId: orderId,
      serviceProvider: bookingDetails.shipping_provider.provider_company,
      dateAndTime: moment(new Date()).format("ddd MMM DD YYYY HH:mm:ss"),
      errorCode: error.code,
      errorMsg: error.message,
      errorDescription: JSON.stringify(error.response.data),
    };

    sendNotifyEmail(content, res);

    return res.status(400).json({
      error: {
        message: error.message,
        code: error.code,
        status: error.status,
      },
      data: error.response.data,
    });
  }
};

module.exports.renewLabel = async (req, res) => {
  const request = req.body;
  const { shipment_info } = await getBookingDetails(request.booking_id);

  try {
    let config = {
      method: "get",
      url: process.env.LABEL_RENEW_API_URL + `/renew/?key=${request.key}`,
      ...courierApiConfig.headersConfig,
    };

    const response = await axios(config);
    if (response.data) {
      const updatedShipmentInfo = { ...shipment_info, uri: response.data.uri };
      await updateBookingCourierInfo(
        request.booking_id,
        JSON.stringify(updatedShipmentInfo)
      );
      return res.json({ data: response.data });
    }
  } catch (error) {
    return res.status(400).json({
      error: {
        message: error.message,
        code: error.code,
        status: error.status,
      },
      data: error.response.data,
    });
  }
};
