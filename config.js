// Runtime settings. Everything the app needs from its environment is read here.
module.exports = {
  host: process.env.HOST || '0.0.0.0',
  
  port: Number(process.env.PORT) || 8080,
  databaseUrl: process.env.PG_URL || process.env.DATABASE_URL,
<<<<<<< HEAD
 
=======
  host: "0.0.0.0",
>>>>>>> bdc8e8ae3f93670e68c1beb0ae2badfc0dc4e2e1
  pageSize: 20,
};
