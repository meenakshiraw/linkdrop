// Runtime settings. Everything the app needs from its environment is read here.
module.exports = {
  host: process.env.HOST || 'localhost',
  port: Number(process.env.PORT) || 8080,
  databaseUrl: process.env.PG_URL || process.env.DATABASE_URL,
  host: "0.0.0.0",
  pageSize: 20,
};
