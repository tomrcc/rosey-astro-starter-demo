export const locales: Record<string, { collection: string; label: string; dateLocale: string }> = {
  fr: { collection: "blog_fr", label: "French", dateLocale: "fr-FR" },
  de: { collection: "blog_de", label: "German", dateLocale: "de-DE" },
  ar: { collection: "blog_ar", label: "Arabic", dateLocale: "ar-SA" },
  zh: { collection: "blog_zh", label: "Chinese", dateLocale: "zh-CN" },
};

export const localeCodes = Object.keys(locales);
