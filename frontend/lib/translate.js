/**
 * Site-wide translation helpers (Google Website Translator engine, custom UI).
 *
 * The Google widget is loaded once, hidden (see GoogleTranslateEngine.js and
 * the ".goog-*" rules in globals.css) and driven from here, so the rest of the
 * app only ever sees our own language picker (LanguageSwitcher.js).
 *
 * NOTE: this is separate from lib/languages.js, which lists the languages a
 * service provider *speaks*. This file lists the languages the *site* can be
 * translated into.
 */

export const DEFAULT_LANGUAGE = 'en';

// `code` is the Google Translate language code. `native` is shown first in the
// picker so people can find their own language without reading English.
export const SITE_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली' },
  { code: 'bho', name: 'Bhojpuri', native: 'भोजपुरी' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'zh-CN', name: 'Chinese', native: '中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'fa', name: 'Persian', native: 'فارسی' },
];

export const TRANSLATE_COOKIE = 'googtrans';

const ONE_YEAR = 60 * 60 * 24 * 365;

const isIpAddress = (host) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

/** Hostnames a googtrans cookie may have been written under (host + parent domains). */
function cookieDomains() {
  const host = window.location.hostname;
  if (!host || host === 'localhost' || isIpAddress(host)) return [null];
  const parts = host.split('.');
  const domains = [null, host, `.${host}`];
  for (let i = 1; i < parts.length - 1; i += 1) {
    domains.push(`.${parts.slice(i).join('.')}`);
  }
  return domains;
}

/** Reads the language currently applied by Google Translate ("en" when untranslated). */
export function getCurrentLanguage() {
  if (typeof document === 'undefined') return DEFAULT_LANGUAGE;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${TRANSLATE_COOKIE}=([^;]*)`));
  if (!match) return DEFAULT_LANGUAGE;
  // Cookie value looks like "/en/hi" -> target language is the last segment.
  const target = decodeURIComponent(match[1]).split('/').filter(Boolean).pop();
  return SITE_LANGUAGES.some((l) => l.code === target) ? target : DEFAULT_LANGUAGE;
}

function setTranslateCookie(code) {
  const value = `/${DEFAULT_LANGUAGE}/${code}`;
  cookieDomains().forEach((domain) => {
    const domainPart = domain ? `; domain=${domain}` : '';
    document.cookie = `${TRANSLATE_COOKIE}=${value}; path=/${domainPart}; max-age=${ONE_YEAR}; SameSite=Lax`;
  });
}

function clearTranslateCookie() {
  cookieDomains().forEach((domain) => {
    const domainPart = domain ? `; domain=${domain}` : '';
    document.cookie = `${TRANSLATE_COOKIE}=; path=/${domainPart}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
  });
}

/** The hidden <select> that Google's widget renders. Null until the widget has loaded. */
export function getTranslateCombo() {
  if (typeof document === 'undefined') return null;
  return document.querySelector('select.goog-te-combo');
}

/**
 * Language codes the loaded widget can actually translate into, or null if the
 * widget hasn't finished loading yet (callers should then show the full list).
 */
export function getAvailableLanguageCodes() {
  const combo = getTranslateCombo();
  if (!combo || combo.options.length < 2) return null;
  const codes = new Set([DEFAULT_LANGUAGE]);
  Array.from(combo.options).forEach((o) => {
    if (o.value) codes.add(o.value);
  });
  return codes;
}

/**
 * Switches the whole site to `code`.
 *  - English restores the original page (clears the cookie and reloads).
 *  - Any other language is applied in place through the hidden widget, with the
 *    cookie written first so the choice survives refreshes and page visits.
 */
export function changeLanguage(code) {
  if (typeof window === 'undefined') return;

  if (code === DEFAULT_LANGUAGE) {
    clearTranslateCookie();
    window.location.reload();
    return;
  }

  setTranslateCookie(code);

  const combo = getTranslateCombo();
  const supported = combo && Array.from(combo.options).some((o) => o.value === code);
  if (supported) {
    combo.value = code;
    combo.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // Widget not ready yet (slow network / first load): the cookie alone makes
    // Google translate the page on the next load.
    window.location.reload();
  }
}