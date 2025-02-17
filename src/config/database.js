const { Sequelize } = require("sequelize");

// Connect to database
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: "postgres",
//   logging: false, // Tắt log SQL
});

// Test connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Kết nối thành công đến PostgreSQL!");
  } catch (error) {
    console.error("❌ Kết nối thất bại:", error);
  }
})();

module.exports = sequelize;
