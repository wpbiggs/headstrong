// Explicit fixture values: no .env secrets, provider calls or shared application database.
Object.assign(process.env, {
  API_HOST: "127.0.0.1",
  API_PORT: "4000",
  DATABASE_URL: "postgres://fixture@127.0.0.1:5432/postgres",
  JWT_SECRET: "learning-fixtures-only-not-a-production-secret",
  ENABLE_LEARNING_JOURNEYS: "true",
  OPENAI_BASE_URL: "http://127.0.0.1:9/v1",
  OPENAI_API_KEY: "unused-fixture",
  QUEST_COMPOSER_PROVIDER: "stub",
  QUEST_COMPOSER_MODEL: "fixture",
});
