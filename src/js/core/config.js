/**
 * Site configuration loading and validation.
 *
 * This module owns URL resolution, JSON fetching, validation and locale
 * fallback. Applying configuration to page-specific features remains in
 * index.html for now, so this extraction does not change feature startup order.
 */

export function resolveAssetUrl(filename) {
    const baseEl = document.querySelector('base[href]');
    if (baseEl && baseEl.href) {
        return new URL(filename, baseEl.href).href;
    }
    let path = window.location.pathname || '/';
    if (!path.endsWith('/')) {
        const last = path.split('/').pop() || '';
        if (/\.[a-z0-9]+$/i.test(last)) {
            path = path.replace(/\/[^/]+$/, '/');
        } else {
            path = path + '/';
        }
    }
    return new URL(filename, window.location.origin + path).href;
}

function quoteConfigHasItems(quotes) {
    if (Array.isArray(quotes)) return quotes.length > 0;
    if (!quotes || typeof quotes !== 'object') return false;
    const mottos = Array.isArray(quotes.mottos) ? quotes.mottos.length : 0;
    const famous = Array.isArray(quotes.famous) ? quotes.famous.length : 0;
    return mottos + famous > 0;
}

export function isValidSiteConfig(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.ui || typeof data.ui !== 'object') return false;
    if (!Array.isArray(data.social) || data.social.length === 0) return false;
    if (!Array.isArray(data.contentLinks) || data.contentLinks.length === 0) return false;
    if (!quoteConfigHasItems(data.quotes)) return false;
    return true;
}

export async function fetchSiteConfig(locale) {
    try {
        const response = await fetch(resolveAssetUrl('config.' + locale + '.json'), {
            cache: 'no-store'
        });
        if (!response.ok) return null;
        const data = await response.json();
        return isValidSiteConfig(data) ? data : null;
    } catch (error) {
        return null;
    }
}

/**
 * Load the requested locale, then try the other locale if needed.
 * Returns data instead of mutating page globals; the caller decides how to
 * apply the configuration to the homepage.
 */
export async function loadSiteConfig(locale) {
    let resolvedLocale = locale;
    let data = await fetchSiteConfig(resolvedLocale);

    if (!data) {
        const fallbackLocale = resolvedLocale === 'zh' ? 'en' : 'zh';
        data = await fetchSiteConfig(fallbackLocale);
        if (data) resolvedLocale = fallbackLocale;
    }

    if (!data) {
        console.warn(
            '[homepage] config.' + resolvedLocale + '.json unavailable; using empty shell.'
        );
    }

    return { locale: resolvedLocale, data };
}

export function createEmptySiteConfig(loc) {
            return {
                ui: {
                    htmlLang: loc === 'zh' ? 'zh-CN' : 'en',
                    pageTitle: '',
                    nameDisplay: '',
                    tagline: '',
                    avatarAlt: '',
                    socialNavAria: '',
                    linksSectionAria: '',
                    contentLinksNavAria: '',
                    quoteSectionAria: '',
                    quoteToggleAria: '',
                    quoteToggleTitle: '',
                    headerAvatarAria: '',
                    mailCopySuccess: '',
                    mailCopyManual: '',
                    wechatCopySuccess: '',
                    wechatCopyManual: '',
                    wechatTitleDesktop: '',
                    wechatTitleMobile: '',
                    qqTitle: ''
                },
                avatarMedia: { fullUrl: '', thumbUrl: '', thumbSize: 32, fallbackUrl: '' },
                avatarTap: { bubbles: [] },
                presence: null,
                social: [],
                contentLinks: [],
                quotes: { mottos: [], famous: [] },
                analytics: { likes: { enabled: false } }
            };
}
