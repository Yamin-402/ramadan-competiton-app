import { useMemo } from "react";
import { translate, TranslationKey } from "../i18n/strings";
import { useSettingsStore } from "../store/settings-store";

export function useI18n() {
  const language = useSettingsStore((state) => state.appLanguage);

  return useMemo(
    () => ({
      language,
      isArabic: language === "ar",
      t: (key: TranslationKey, params?: Record<string, string | number>) => {
        const template = translate(language, key);
        if (!params) {
          return template;
        }

        return Object.entries(params).reduce(
          (acc, [name, value]) => acc.replace(new RegExp(`{{${name}}}`, "g"), String(value)),
          template
        );
      },
    }),
    [language]
  );
}
