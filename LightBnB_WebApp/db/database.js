const { Pool } = require('pg');
const properties = require("./json/properties.json");
const users = require("./json/users.json");

// set up connection
const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = (email) => {
  return pool.
    query(
      `SELECT * FROM users WHERE users.email = $1`,
      [email.toLowerCase()])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = (id) => {
  return pool.
    query(
      `SELECT * FROM users WHERE users.id = $1`,
      [Number(id)])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = (user) => {
  return pool.
    query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [user.name, user.email, user.password])
    .then(() => {
      return "Add new user successfully";
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool.
    query(
      `
      SELECT
      reservations.*, properties.*,
      AVG(rating) AS average_rating
      FROM reservations
      JOIN properties ON reservations.property_id = properties.id
      JOIN property_reviews ON property_reviews.property_id = properties.id
      JOIN users ON reservations.guest_id = users.id
      WHERE reservations.guest_id = $1
      GROUP BY properties.id, reservations.id
      ORDER BY reservations.start_date
      LIMIT $2;
      `,
      [ guest_id, limit || 10 ]
    )
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  const queryParams = [];

  // construct query string in format:
  // select -> from -> join on -> where (options) -> group by - having (option) -> order -> limit
  let queryString = `
  SELECT properties.*, AVG(property_reviews.rating) AS average_rating
  FROM properties
  JOIN property_reviews ON property_id = properties.id
  `;

  // handle options for query string
  if(options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += ` WHERE city LIKE $${queryParams.length}\n`;
  }

  if(options.owner_id) {
    queryParams.push(Number(options.owner_id));
    queryString += 
    `AND owner_id = $${queryParams.length}\n`;
  }

  if(options.minimum_price_per_night) {
    queryParams.push(Number(options.minimum_price_per_night) * 100);
    queryString += 
    `AND cost_per_night >= $${queryParams.length}\n`;
  }

  if(options.maximum_price_per_night) {
    queryParams.push(Number(options.maximum_price_per_night) * 100);
    queryString += 
    `AND cost_per_night <= $${queryParams.length}\n`;
  }

  queryString += 
  `GROUP BY properties.id\n`;

  if(options.minimum_rating) {
    queryParams.push(Number(options.minimum_rating));
    queryString += 
    `HAVING AVG(property_reviews.rating) >= $${queryParams.length}\n`;
  }

  queryString += 
  `ORDER BY cost_per_night\n`;

  queryParams.push(limit);
  queryString += 
  `LIMIT $${queryParams.length};`;
  
  // handle result
  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
