process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-not-used-anywhere-real";
// Fewer rounds, because the tests hash a lot of passwords and bcrypt at 12
// rounds turns a fast suite into a slow one. Production keeps the default.
process.env.BCRYPT_SALT_ROUNDS = "4";
process.env.WEB_ORIGIN = "http://localhost:3000";
