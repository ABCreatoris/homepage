/** Whether mobile contact protocols should be used for WeChat and QQ. */
export function shouldUseMobileContactScheme() {
    if (window.matchMedia('(pointer: coarse)').matches) return true;
    if (
        window.matchMedia('(max-width: 767.98px)').matches &&
        ((navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || 'ontouchstart' in window)
    ) {
        return true;
    }
    return false;
}

/** Render configured social links. Dependencies are supplied by the page entry. */
export function renderSocialIcons({
    links,
    uiMessage,
    copyTextToClipboard,
    showMailToast,
    bindMailtoClick,
    socialSvgXhs
}) {
    const container = document.getElementById('social-icons');
    if (!container) return;
    container.innerHTML = '';
    links.forEach(function (link) {
        const a = document.createElement('a');
        const cssExtra = link.cssClass ? link.cssClass : '';
        a.className = 'social-icon' + (cssExtra ? ' ' + cssExtra : '');
        a.setAttribute('aria-label', link.label);

        var useMobileScheme = shouldUseMobileContactScheme();

        if (link.iconKind === 'wechat' && link.wechatId) {
            if (useMobileScheme) {
                a.href = 'weixin://dl/business/?t=' + encodeURIComponent(link.wechatId);
                a.title = uiMessage('wechatTitleMobile', { value: link.wechatId });
            } else {
                a.href = '#';
                a.title = uiMessage('wechatTitleDesktop', { value: link.wechatId });
                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    copyTextToClipboard(link.wechatId)
                        .then(function () {
                            showMailToast(uiMessage('wechatCopySuccess'));
                        })
                        .catch(function () {
                            showMailToast(uiMessage('wechatCopyManual', { value: link.wechatId }));
                        });
                });
            }
        } else if (link.iconKind === 'qq' && link.qqUin) {
            var uin = link.qqUin;
            if (useMobileScheme) {
                a.href =
                    'mqqwpa://im/chat?chat_type=wpa&uin=' +
                    uin +
                    '&version=1&src_type=web&web_src=abcreatoris.com';
                a.title = uiMessage('qqTitle', { value: uin });
            } else {
                a.href = 'https://wpa.qq.com/msgrd?v=3&uin=' + uin + '&site=qq&menu=yes';
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.title = uiMessage('qqTitle', { value: uin });
            }
        } else {
            a.href = link.href;
            if (/^https?:\/\//i.test(link.href)) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }
            if (/^mailto:/i.test(link.href)) {
                a.title = link.href.replace(/^mailto:/i, '').split('?')[0];
                bindMailtoClick(a, link.href);
            }
        }

        if (link.iconKind === 'xiaohongshu') {
            a.innerHTML = socialSvgXhs;
        } else {
            const icon = document.createElement('i');
            icon.className = link.iconClass;
            icon.setAttribute('aria-hidden', 'true');
            a.appendChild(icon);
        }
        container.appendChild(a);
    });
}
