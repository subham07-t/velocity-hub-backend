const axios = require("axios");
const mysql = require("mysql2/promise");
const dbConfig = require("../config/databaseConnection");
const shippingService = require("../services/shippingService");
const bookingService = require("../services/bookingService");
const { v4: uuid } = require("uuid");

module.exports.shippingProviders = async (req, res) => {
  const {
    weight,
    type,
    country_from,
    country_to,
    from_post_code,
    to_post_code,
    items,
  } = req.body;

  const providerData = [];

  const additionalCharges =
    await shippingService.getShippingAdditionalCharges();

  //Adding DHL Express in the provider api
  const dhlExpressZoneData = await shippingService.getDHLExpressZone(
    country_to
  );
  const dhlSurgeCharges = await shippingService.getAllDHLSurcharges(
    weight,
    additionalCharges,
    country_to,
    from_post_code,
    to_post_code,
    items
  );

  if (dhlExpressZoneData) {
    const { zone, time_taken } = dhlExpressZoneData;
    if (zone) {
      const dhlExpressData = await shippingService.getDHLExpressData(
        weight,
        type,
        zone
      );
      const { price } = dhlExpressData;
      const dhlExpressESSCharge = await shippingService.getDHLExpressESS(
        country_from,
        country_to,
        weight
      );

      let dhlExpressDropBy = {
        quote_id: uuid(),
        provider_name: "DHL Express",
        provider_type: "dhl_express",
        provider_company: "dhl",
        price: parseFloat(
          price + dhlSurgeCharges.TOTAL_CHARGE + dhlExpressESSCharge
        ).toFixed(2),
        additionalCharges: {
          surgeCharges: dhlSurgeCharges.ADDITIONAL_CHARGES_ADDED,
          essCharges: dhlExpressESSCharge,
        },
        type: time_taken == 1 ? "next-day" : "standard",
        delivery_type: "drop-by",
        time_taken,
      };
      providerData.push(dhlExpressDropBy);
      let dhlExpressCollection = {
        quote_id: uuid(),
        provider_name: "DHL Express",
        provider_type: "dhl_express",
        provider_company: "dhl",
        price: parseFloat(
          price + 4 + dhlSurgeCharges.TOTAL_CHARGE + dhlExpressESSCharge
        ).toFixed(2),
        additionalCharges: {
          surgeCharges: dhlSurgeCharges.ADDITIONAL_CHARGES_ADDED,
          essCharges: dhlExpressESSCharge,
        },
        type: time_taken == 1 ? "next-day" : "standard",
        delivery_type: "collection",
        time_taken,
      };
      providerData.push(dhlExpressCollection);
    }
  }

  //Adding DHL Economy in the provider api
  const dhlEconomyZoneData = await shippingService.getDHLEconomyZone(
    country_to
  );

  if (dhlEconomyZoneData) {
    const { zone, time_taken } = dhlEconomyZoneData;
    if (zone) {
      const dhlEconomyData = await shippingService.getDHLEconomyData(
        weight,
        type,
        zone
      );
      const { price } = dhlEconomyData;

      let dhlEconomy = {
        quote_id: uuid(),
        provider_name: "DHL Economy",
        provider_type: "dhl_economy",
        provider_company: "dhl",
        price: parseFloat(price + dhlSurgeCharges.TOTAL_CHARGE).toFixed(2),
        additionalCharges: {
          surgeCharges: dhlSurgeCharges.ADDITIONAL_CHARGES_ADDED,
        },
        type: time_taken == 1 ? "next-day" : "standard",
        delivery_type: "drop-by",
        time_taken,
      };
      providerData.push(dhlEconomy);
    }
  }

  //Adding DHL UK in the provider api
  const dhlUkPricingData = await shippingService.getDHLUkPricingData(
    weight,
    country_to
  );

  if (dhlUkPricingData) {
    const { next_day, before_nine, before_twelve } = dhlUkPricingData;

    let dhlUkNext = {
      quote_id: uuid(),
      provider_name: "DHL UK - Next Day Delivery",
      provider_type: "dhl_uk_next",
      provider_company: "dhl",
      price: parseFloat(next_day).toFixed(2),
      type: "standard",
      delivery_type: "drop-by",
      time_taken: 1,
    };
    providerData.push(dhlUkNext);

    let dhlUkBeforeNine = {
      quote_id: uuid(),
      provider_name: "DHL UK - Before 9AM Delivery",
      provider_type: "dhl_uk_before_nine",
      provider_company: "dhl",
      price: parseFloat(before_nine).toFixed(2),
      type: "standard",
      delivery_type: "drop-by",
      time_taken: 1,
    };
    providerData.push(dhlUkBeforeNine);

    let dhlUkBeforeTwelve = {
      quote_id: uuid(),
      provider_name: "DHL UK - Before 12PM Delivery",
      provider_type: "dhl_uk_before_twelve",
      provider_company: "dhl",
      price: parseFloat(before_twelve).toFixed(2),
      type: "standard",
      delivery_type: "drop-by",
      time_taken: 1,
    };
    providerData.push(dhlUkBeforeTwelve);
  }

  //Adding Evri in the provider api
  const evriPricingData = await shippingService.getEvriPricingData(
    weight,
    country_to
  );
  if (evriPricingData) {
    const { next_day_charge, standard_charge, collection_charge } =
      evriPricingData;
    const evriLocationCharge = await shippingService.evryExtraLocationCharge(
      from_post_code,
      to_post_code,
      additionalCharges
    );

    let evriNext = {
      quote_id: uuid(),
      provider_name: "Evri - Next Day Delivery",
      provider_type: "evri_next",
      provider_company: "evri",
      price: parseFloat(next_day_charge + evriLocationCharge).toFixed(2),
      type: "next-day",
      delivery_type: "drop-by",
      time_taken: 1,
    };
    providerData.push(evriNext);

    let evriStandardDropBy = {
      quote_id: uuid(),
      provider_name: "Evri - Standard",
      provider_type: "evri_standard",
      provider_company: "evri",
      price: parseFloat(standard_charge + evriLocationCharge).toFixed(2),
      type: "standard",
      delivery_type: "drop-by",
      time_taken: "1-2",
    };
    providerData.push(evriStandardDropBy);

    let evriStandardCollection = {
      quote_id: uuid(),
      provider_name: "Evri - Standard",
      provider_type: "evri_standard",
      provider_company: "evri",
      price: parseFloat(
        standard_charge + collection_charge + evriLocationCharge
      ).toFixed(2),
      delivery_type: "collection",
      type: "standard",
      time_taken: "1-2",
    };
    providerData.push(evriStandardCollection);
  }

  //Adding UPS in the provider api
  const upsExpressZoneData = await shippingService.getUPSExpressZone(
    country_to
  );

  if (upsExpressZoneData) {
    const { zone, time_taken } = upsExpressZoneData;
    if (zone) {
      const upsExpressData = await shippingService.getUPSExpressData(
        weight,
        type,
        zone
      );

      const { price } = upsExpressData;

      let upsExpressDropBy = {
        quote_id: uuid(),
        provider_name: "UPS Express",
        provider_type: "ups_express",
        provider_company: "ups",
        price: parseFloat(price).toFixed(2),
        type: time_taken == 1 ? "next-day" : "standard",
        delivery_type: "drop-by",
        type: "express saver",
        time_taken,
      };
      providerData.push(upsExpressDropBy);
      let upsExpressCollection = {
        quote_id: uuid(),
        provider_name: "UPS Express",
        provider_type: "ups_express",
        provider_company: "ups",
        price: parseFloat(price + 4).toFixed(2),
        type: time_taken == 1 ? "next-day" : "standard",
        delivery_type: "collection",
        type: "express saver",
        time_taken,
      };
      providerData.push(upsExpressCollection);
    }
  }

  return res.status(200).json({
    data: providerData,
  });
};
