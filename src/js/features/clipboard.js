/** Small clipboard and mail interaction helpers. */
export function showMailToast(message) {
    var el = document.getElementById('mail-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'mail-toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('mail-toast--visible');
    clearTimeout(showMailToast._hideTimer);
    showMailToast._hideTimer = setTimeout(function () {
        el.classList.remove('mail-toast--visible');
    }, 3200);
}

export function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            ta.setSelectionRange(0, text.length);
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            ok ? resolve() : reject(new Error('execCommand'));
        } catch (err) {
            reject(err);
        }
    });
}

/** Copy the address, show feedback, then open the mail client. */
export function bindMailtoClick(anchor, mailtoHref, { uiMessage, showToast = showMailToast } = {}) {
    if (!anchor || typeof mailtoHref !== 'string' || !/^mailto:/i.test(mailtoHref)) return;
    var addr = mailtoHref.replace(/^mailto:/i, '').split('?')[0];
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        copyTextToClipboard(addr)
            .then(function () {
                showToast(uiMessage('mailCopySuccess'));
            })
            .catch(function () {
                showToast(uiMessage('mailCopyManual', { value: addr }));
            })
            .then(function () {
                window.setTimeout(function () {
                    window.location.href = mailtoHref;
                }, 520);
            });
    });
}
