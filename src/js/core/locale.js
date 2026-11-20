/**
 * Resolve the site locale.
 * Prefer the visitor's country when the geo lookup succeeds, then fall back
 * to the browser language when the lookup is unavailable.
 */
export function localeFromNavigator() {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^zh/i.test(nav) ? 'zh' : 'en';
}

export async function resolveSiteLocale() {
    const ctrl = new AbortController();
    const tid = setTimeout(function () {
        ctrl.abort();
    }, 2800);
    try {
        const res = await fetch('https://get.geojs.io/v1/ip/country.json', {
            signal: ctrl.signal,
            cache: 'no-store'
        });
        if (!res.ok) throw new Error('geo http');
        const geo = await res.json();
        const code = String(geo.country || geo.country_code || '').toUpperCase();
        if (code === 'CN') return 'zh';
        return 'en';
    } catch (e) {
        return localeFromNavigator();
    } finally {
        clearTimeout(tid);
    }
}
