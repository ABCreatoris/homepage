/** Quote parsing, ordering, rendering and automatic rotation. */
function filterQuotesList(list) {
    return (Array.isArray(list) ? list : []).filter(q => q && typeof q.text === 'string' && typeof q.author === 'string');
}
function shuffleQuoteList(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function parseQuotesFromConfig(quotes) {
    const mottos = [];
    const famous = [];
    if (Array.isArray(quotes)) return { mottos, famous: filterQuotesList(quotes) };
    if (!quotes || typeof quotes !== 'object') return { mottos, famous };
    const mottoAuthor = typeof quotes.mottosTitle === 'string' && quotes.mottosTitle.length ? quotes.mottosTitle : '我的座右铭';
    if (Array.isArray(quotes.mottos)) quotes.mottos.forEach(m => {
        if (!m || typeof m.text !== 'string' || !m.text.trim()) return;
        mottos.push({ text: m.text.trim(), author: typeof m.author === 'string' && m.author.length ? m.author : mottoAuthor });
    });
    if (Array.isArray(quotes.famous)) quotes.famous.forEach(q => {
        if (!q || typeof q.text !== 'string' || typeof q.author !== 'string' || !q.text.trim() || !q.author.trim()) return;
        famous.push({ text: q.text.trim(), author: q.author.trim() });
    });
    return { mottos, famous };
}
function buildQuotePlayOrder(quotes) {
    const parsed = parseQuotesFromConfig(quotes);
    const mottos = shuffleQuoteList(parsed.mottos);
    const famous = shuffleQuoteList(parsed.famous);
    const out = [];
    let mi = 0, fi = 0;
    if (!mottos.length) return famous;
    if (!famous.length) return mottos;
    const startWithMotto = Math.random() < 0.5;
    while (mi < mottos.length || fi < famous.length) {
        if (startWithMotto) {
            if (mi < mottos.length) out.push(mottos[mi++]);
            if (fi < famous.length) out.push(famous[fi++]);
        } else {
            if (fi < famous.length) out.push(famous[fi++]);
            if (mi < mottos.length) out.push(mottos[mi++]);
        }
    }
    return out;
}
function isEnglish(text) {
    return /^[A-Za-z0-9\\s.,'"!?;:()\\-]+$/.test(text);
}
function segmentQuoteGlyphs(text) {
    const hasCjk = /[\\u3040-\\u30ff\\u3400-\\u9fff\\uf900-\\ufaff]/.test(text);
    const segments = [];
    if (hasCjk) {
        for (const ch of text) segments.push({ text: ch, animate: !/\\s/.test(ch) });
    } else {
        text.split(/(\\s+)/).forEach(part => {
            if (part) segments.push({ text: part, animate: !/^\\s+$/.test(part) });
        });
    }
    return segments;
}
function fillQuoteGlyphs(quoteElem, text) {
    quoteElem.textContent = '';
    let idx = 0;
    segmentQuoteGlyphs(text).forEach(seg => {
        if (!seg.animate) {
            quoteElem.appendChild(document.createTextNode(seg.text));
            return;
        }
        const span = document.createElement('span');
        span.className = 'quote-glyph';
        span.textContent = seg.text;
        span.style.setProperty('--qi', String(idx++));
        quoteElem.appendChild(span);
    });
    return idx;
}
export function createQuoteController({ prefersReducedMotion }) {
    let quotes = [], displayIndex = 0, timerId = null;
    function setQuotes(config) { quotes = buildQuotePlayOrder(config); displayIndex = 0; }
    function update(advanceNext) {
        if (!quotes.length) return;
        if (advanceNext === true) displayIndex = (displayIndex + 1) % quotes.length;
        const quote = quotes[displayIndex];
        const container = document.getElementById('quote-container');
        const quoteElem = document.getElementById('quote');
        const authorEl = document.getElementById('quote-author');
        if (!container || !quoteElem || !authorEl) return;
        if (prefersReducedMotion()) {
            container.classList.remove('quote-play');
            quoteElem.textContent = quote.text;
            if (isEnglish(quote.text)) quoteElem.setAttribute('lang', 'en');
            else quoteElem.removeAttribute('lang');
            authorEl.textContent = '\\u2014 ' + quote.author;
            authorEl.classList.toggle('quote-attribution-cn', /[\\u4e00-\\u9fff]/.test(quote.author));
            return;
        }
        container.classList.remove('quote-play');
        void container.offsetWidth;
        if (isEnglish(quote.text)) quoteElem.setAttribute('lang', 'en');
        else quoteElem.removeAttribute('lang');
        const glyphCount = fillQuoteGlyphs(quoteElem, quote.text);
        authorEl.textContent = '\\u2014 ' + quote.author;
        authorEl.classList.toggle('quote-attribution-cn', /[\\u4e00-\\u9fff]/.test(quote.author));
        container.style.setProperty('--quote-author-delay', (0.22 + glyphCount * 0.036) + 's');
        requestAnimationFrame(() => requestAnimationFrame(() => container.classList.add('quote-play')));
    }
    function scheduleAutoRotate() {
        clearTimeout(timerId);
        timerId = setTimeout(() => { update(true); scheduleAutoRotate(); }, 5200);
    }
    return { setQuotes, update, scheduleAutoRotate };
}
