'use client';

import { useEffect } from 'react';
import { DEFAULT_LANGUAGE, SITE_LANGUAGES } from '../lib/translate';

const CONTAINER_ID = 'google_translate_element';
const SCRIPT_ID = 'google-translate-script';

/**
 * Google Translate wraps text in <font> tags and moves nodes around. React then
 * tries to remove/insert nodes that are no longer where it left them and throws
 * ("Failed to execute 'removeChild' on 'Node'"). These guards make those two
 * calls fail soft instead of crashing the page. Applied once, before the
 * Google script is added.
 */
function protectDomFromTranslation() {
  if (window.__karyantrixDomGuard) return;
  window.__karyantrixDomGuard = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function removeChild(child) {
    if (child && child.parentNode !== this) return child;
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function insertBefore(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return originalInsertBefore.apply(this, arguments);
  };
}

/**
 * Loads the Google Website Translator (same engine as the w3schools "vertical"
 * example) but keeps it invisible. Nothing here is meant to be seen: the
 * visible picker is <LanguageSwitcher />, and every piece of Google UI that
 * would otherwise appear (top banner, gadget, tooltip, highlights, spinner) is
 * hidden by the ".goog-*" rules in globals.css.
 *
 * Mount once, in the root layout.
 */
export default function GoogleTranslateEngine() {
  useEffect(() => {
    protectDomFromTranslation();

    window.googleTranslateElementInit = () => {
      const api = window.google && window.google.translate;
      if (!api || !api.TranslateElement) return;
      // Guard against a second init (React Strict Mode, hot reload).
      const container = document.getElementById(CONTAINER_ID);
      if (!container || container.childElementCount > 0) return;

      new api.TranslateElement(
        {
          pageLanguage: DEFAULT_LANGUAGE,
          includedLanguages: SITE_LANGUAGES.filter((l) => l.code !== DEFAULT_LANGUAGE)
            .map((l) => l.code)
            .join(','),
          layout: api.TranslateElement.InlineLayout.VERTICAL,
          autoDisplay: false, // never pop the "Translate this page?" banner
        },
        CONTAINER_ID
      );
    };

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.body.appendChild(script);
    } else {
      window.googleTranslateElementInit();
    }
  }, []);

  return <div id={CONTAINER_ID} className="gt-engine" translate="no" aria-hidden="true" />;
}