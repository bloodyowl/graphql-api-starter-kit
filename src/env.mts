import { number, oneOf, string, url, validate, type Validator } from "valienv";

const urlArray: Validator<string[]> = value => {
  const urls = value?.split(",");
  if (urls == undefined) {
    return undefined;
  }
  if (urls.some(string => url(string) === undefined)) {
    return undefined;
  }
  return urls;
};

export const env = validate({
  env: process.env,
  validators: {
    PORT: number,
    LOG_LEVEL: oneOf(
      "fatal",
      "error",
      "warn",
      "info",
      "debug",
      "trace",
      "silent",
    ),
    NODE_ENV: oneOf("production", "development", "test"),
    DATABASE_URL: url,
    TGGL_API_KEY: string,
    PARTNER_API_URL: url,
    KAFKA_BROKERS: urlArray,
    KAFKA_CLIENT_ID: string,
    KAFKA_CONSUMER_GROUP_ID: string,
  },
});
