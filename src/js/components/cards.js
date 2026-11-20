/** Render the configured content links into the homepage. */
export function renderCards({ links, bindMailtoClick }) {
    const container = document.getElementById('cards-container');
    if (!container) return;
    container.innerHTML = '';

    links.forEach(function (item, index) {
        if (index > 0) {
            const sep = document.createElement('span');
            sep.className = 'content-links__sep';
            sep.setAttribute('aria-hidden', 'true');
            sep.textContent = '\u00b7';
            container.appendChild(sep);
        }

        const a = document.createElement('a');
        a.href = item.url;
        a.className = 'card content-links__a';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'content-links__title';
        titleSpan.textContent = item.title;
        a.appendChild(titleSpan);
        if (typeof item.description === 'string' && item.description.length > 0) {
            a.setAttribute('aria-label', item.title + '：' + item.description);
            a.title = item.description;
            const descSpan = document.createElement('span');
            descSpan.className = 'content-links__desc';
            descSpan.textContent = item.description;
            descSpan.setAttribute('aria-hidden', 'true');
            a.appendChild(descSpan);
        }
        if (/^mailto:/i.test(item.url)) {
            var mailAddr = item.url.replace(/^mailto:/i, '').split('?')[0];
            a.title = a.title ? mailAddr + ' — ' + a.title : mailAddr;
            bindMailtoClick(a, item.url);
        }
        if (/^https?:\/\//i.test(item.url)) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        }

        container.appendChild(a);
        setTimeout(function () {
            a.classList.add('show');
        }, 800 + index * 70);
    });
}
