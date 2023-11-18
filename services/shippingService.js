const mysql = require("mysql2/promise");
const dbConfig = require("../config/databaseConnection");
const domesticCountry = "United Kingdom";

//Get ALL THE CHARGES
module.exports.getShippingAdditionalCharges = async () => {
  const connection = await mysql.createConnection(dbConfig.db);
  const sql = `SELECT * FROM shipping_additional_charges`;
  const [results] = await connection.execute(sql);
  connection.end();

  if (!results || results.length === 0) {
    return null;
  }
  return results;
};

const DHLExpressZone = async (country) => {
  const connection = await mysql.createConnection(dbConfig.db);
  const sql = `SELECT * FROM dhl_express_zones WHERE country_code = '${country}' `;
  const [results] = await connection.execute(sql);
  connection.end();

  if (!results || results.length === 0) {
    return null;
  }
  return results[0];
};

module.exports.getDHLExpressZone = DHLExpressZone;

module.exports.getDHLExpressData = async (weight, type, zone) => {
  const connection = await mysql.createConnection(dbConfig.db);
  const sql = `SELECT zone_${zone} as price FROM dhl_express_pricing_rules WHERE weight <= ${weight} AND type='${type}' ORDER BY ID DESC LIMIT 1`;
  const [results] = await connection.execute(sql);
  connection.end();

  if (!results || results.length === 0) {
    return null;
  }
  return results[0];
};

module.exports.getDHLEconomyZone = async (country) => {
  const connection = await mysql.createConnection(dbConfig.db);
  const sql = `SELECT * FROM dhl_economy_zones WHERE country_code = '${country}' `;
  const [results] = await connection.execute(sql);
  connection.end();

  if (!results || results.length === 0) {
    return null;
  }
  return results[0];
};

module.exports.getDHLEconomyData = async (weight, type, zone) => {
  const connection = await mysql.createConnection(dbConfig.db);
  const sql = `SELECT zone_${zone} as price FROM dhl_economy_pricing_rules WHERE weight <= ${weight}  ORDER BY ID DESC LIMIT 1`;
  const [results] = await connection.execute(sql);
  connection.end();

  if (!results || results.length === 0) {
    return null;
  }
  if (weight > 10) {
    const additional_weight = weight - 10;
    const sql = `SELECT zone_${zone} as additional_price FROM dhl_economy_pricing_rules WHERE type='additional'`;
    const [res] = await connection.execute(sql);
    if (res) {
      const { additional_price } = res[0];
      const additional_charge = additional_weight * additional_price;
      results[0].price = results[0].price + additional_charge;
    }
  }
  return results[0];
};

module.exports.getDHLUkPricingData = async (weight, country) => {
  const connection = await mysql.createConnection(dbConfig.db);
  const sql = `SELECT * FROM dhl_uk_price_rules WHERE weight >= ${weight} AND country_code = '${country}'  ORDER BY ID ASC LIMIT 1`;
  const [results] = await connection.execute(sql);
  connection.end();

  if (!results || results.length === 0) {
    return null;
  }

  return results[0];
};

module.exports.getAllDHLSurcharges = async (
  weight,
  additionalCharges,
  country,
  from_post_code,
  to_post_code,
  items
) => {
  let TOTAL_CHARGE = 0;
  let OVER_PIECE_CHARGE = 0;
  let OVER_SIZE_PIECE_CHARGE = 0;
  let OVER_HEAD_PIECE_CHARGE = 0;
  let ADDITIONAL_CHARGES_ADDED = {};

  // additional charges for dhl
  const DHL_OVERHEAD_PIECE_CHARGE = additionalCharges.filter(
    (value) => value.additional_charge == "DHL_OVERWEIGHT_PIECE_CHARGE"
  )[0].charge;
  const DHL_OVERSIZE_PIECE_CHARGE = additionalCharges.filter(
    (value) => value.additional_charge == "DHL_OVERSIZE_PIECE_CHARGE"
  )[0].charge;
  const DHL_FUEL_CHARGE = additionalCharges.filter(
    (value) => value.additional_charge == "DHL_FUEL_CHARGE"
  )[0].charge;

  items.forEach((item, id) => {
    let charge = 0;
    if (
      (item.length > 120 || item.width > 120 || item.height > 120) &&
      item.weight <= 70
    ) {
      charge = DHL_OVERSIZE_PIECE_CHARGE;
      OVER_SIZE_PIECE_CHARGE = OVER_SIZE_PIECE_CHARGE + charge;
      ADDITIONAL_CHARGES_ADDED.overSizePiece = OVER_SIZE_PIECE_CHARGE;
    }
    if (item.weight > 70) {
      charge = DHL_OVERHEAD_PIECE_CHARGE;
      OVER_HEAD_PIECE_CHARGE = OVER_HEAD_PIECE_CHARGE + charge;
      ADDITIONAL_CHARGES_ADDED.overHeadPiece = OVER_HEAD_PIECE_CHARGE;
    }
    OVER_PIECE_CHARGE = OVER_PIECE_CHARGE + charge;
  });

  TOTAL_CHARGE = OVER_PIECE_CHARGE;

  if (country != domesticCountry) {
    TOTAL_CHARGE = TOTAL_CHARGE + DHL_FUEL_CHARGE;
    ADDITIONAL_CHARGES_ADDED.fuel = DHL_FUEL_CHARGE;
  }

  let result = {
    TOTAL_CHARGE,
    OVER_PIECE_CHARGE,
    ADDITIONAL_CHARGES_ADDED,
  };
  return result;
};

module.exports.getDHLExpressESS = async (country_from, country_to, weight) => {
  const zone_1 = await DHLExpressZone(country_from);
  const zone_2 = await DHLExpressZone(country_to);

  //Return charge as 0 if zone not found based on country
  if (!zone_1 || !zone_2) {
    return 0;
  }
  const connection = await mysql.createConnection(dbConfig.db);
  const sql = `SELECT * FROM emergency_situation_charges where from_zone = ${zone_1.ess_zone} AND to_zone = ${zone_2.ess_zone}`;
  const [results] = await connection.execute(sql);
  connection.end();

  if (!results || results.length === 0) {
    return 0;
  } else {
    const charge = results[0].charge;
    const total_ess_charge = charge * weight;
    return total_ess_charge;
  }
};

module.exports.getEvriPricingData = async (weight, country) => {
  const connection = await mysql.createConnection(dbConfig.db);
  const sql = `SELECT * FROM evri_pricing_rules WHERE weight >= ${weight} AND country = '${country}'  ORDER BY ID ASC LIMIT 1`;
  const [results] = await connection.execute(sql);
  connection.end();

  if (!results || results.length === 0) {
    return null;
  }

  return results[0];
};

module.exports.evryExtraLocationCharge = async (
  from_post_code,
  to_post_code,
  additionalCharges
) => {
  const from_outer_post_code = from_post_code.slice(0, 2);
  const to_outer_post_code = to_post_code.slice(0, 2);
  let locationCharge = 0;
  if (from_outer_post_code !== to_outer_post_code) {
    const result = additionalCharges.filter(
      (value) => value.additional_charge == "EVRY_LOCATION_CHARGE"
    );
    locationCharge = result[0].charge;
  }
  return locationCharge;
};

module.exports.getUPSExpressZone = async (country) => {
  const connection = await mysql.createConnection(dbConfig.db);
  const sql = `SELECT * FROM ups_express_zones WHERE country_code = '${country}' `;
  const [results] = await connection.execute(sql);
  connection.end();

  if (!results || results.length === 0) {
    return null;
  }
  return results[0];
};

module.exports.getUPSExpressData = async (weight, type, zone) => {
  const connection = await mysql.createConnection(dbConfig.db);

  if (weight <= 70) {
    const sql = `SELECT zone_${zone} as price FROM ups_pricing_rules WHERE weight <= ${weight} AND type='${type}' ORDER BY ID DESC LIMIT 1`;
    const [results] = await connection.execute(sql);

    if (!results || results.length === 0) {
      return null;
    }

    return results[0];
  }

  if (weight > 70) {
    const sql = `SELECT zone_${zone} as price FROM ups_rules_over_extra_weight WHERE weight_to >= ${weight} AND weight_from <= ${weight}  ORDER BY ID DESC LIMIT 1`;
    const [results] = await connection.execute(sql);
    connection.end();

    if (!results || results.length === 0) {
      return null;
    }
    return { price: weight * results[0].price };
  }
};
