import acceptLanguage from "accept-language";
import { IntlMessageFormat } from "intl-messageformat";

import en from "#app/i18n/locales/en.json" with { type: "json" };
import { Dict } from "@swan-io/boxed";

const locales = { en };

type SupportedLocale = keyof typeof locales;
type TranslationKey = keyof typeof en;

export type Translator = (
  translationKey: TranslationKey,
  params?: Record<string, unknown>,
) => string;

// Define supported languages
acceptLanguage.languages(Dict.keys(locales));

export const getLocale = (acceptLanguageHeader: string | undefined) => {
  return acceptLanguage.get(acceptLanguageHeader) as SupportedLocale;
};

const cache = new Map<
  SupportedLocale,
  Map<TranslationKey, IntlMessageFormat>
>();

export const createTranslationHelper = (
  locale: SupportedLocale,
): Translator => {
  return (translationKey: TranslationKey, params?: Record<string, unknown>) => {
    let currentLocaleCache = cache.get(locale);
    if (currentLocaleCache == undefined) {
      currentLocaleCache = new Map();
      cache.set(locale, currentLocaleCache);
    }
    let currentMessageFormatter = currentLocaleCache.get(translationKey);
    if (currentMessageFormatter == undefined) {
      const translationInPreferredLocale = locales[locale][translationKey];
      if (translationInPreferredLocale != undefined) {
        currentMessageFormatter = new IntlMessageFormat(
          translationInPreferredLocale,
          locale,
        );
      } else {
        currentMessageFormatter = new IntlMessageFormat(
          locales.en[translationKey],
          "en",
        );
      }
      currentLocaleCache.set(translationKey, currentMessageFormatter);
    }
    return currentMessageFormatter.format(params) as string;
  };
};
