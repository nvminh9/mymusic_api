const { Sequelize } = require("sequelize");
const dotenv = require('dotenv');
dotenv.config();

// Connect to database
// Determine if in a production env or not
const isProduction = process.env.DB_HOST !== 'localhost';
// Connection Options for localhost DB
const connectionOptions = {
  host: process.env.DB_HOST || "localhost",
  dialect: "postgres",
  port: process.env.DB_PORT || 5432,
  logging: false, // Tắt log SQL
  // dialectOptions: {
  //   ssl: {
  //     require: true, // This ensures SSL is required
  //     rejectUnauthorized: false // This can be set to true if you have a valid CA certificate
  //   }
  // }
};
// Connection Options for production DB
if(isProduction){
  connectionOptions.dialectOptions = {
    ssl: {
      require: true, // This ensures SSL is required
      rejectUnauthorized: false // This can be set to true if you have a valid CA certificate
    }
  };
}
// Cách 1
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, String(process.env.DB_PASSWORD), connectionOptions);
// Cách 2
// const sequelize = new Sequelize(`postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`) //
// const sequelize = new Sequelize(`postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`) //

// Test connection
async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Kết nối thành công đến PostgreSQL!");
  } catch (error) {
    console.error("❌ Kết nối thất bại:", error);
  }
};

module.exports = sequelize;
