/** Normalize social and content links from the site JSON configuration. */
export function normalizeSiteLinks(data) {
            const social = Array.isArray(data.social) ? data.social : [];
            const contentLinksRaw = Array.isArray(data.contentLinks) ? data.contentLinks : [];

            const socialNorm = social.filter(function (s) {
                if (!s || typeof s.label !== 'string' || !s.label.length) return false;
                if (s.iconKind === 'xiaohongshu') {
                    return typeof s.href === 'string' && s.href.length > 0;
                }
                if (s.iconKind === 'wechat') {
                    return (
                        typeof s.wechatId === 'string' &&
                        s.wechatId.trim().length > 0 &&
                        typeof s.iconClass === 'string' &&
                        s.iconClass.length > 0 &&
                        typeof s.href === 'string'
                    );
                }
                if (s.iconKind === 'qq') {
                    var uq = typeof s.qqUin === 'string' ? String(s.qqUin).replace(/\D/g, '') : '';
                    return (
                        uq.length >= 5 &&
                        uq.length <= 14 &&
                        typeof s.iconClass === 'string' &&
                        s.iconClass.length > 0 &&
                        typeof s.href === 'string'
                    );
                }
                if (typeof s.href !== 'string') return false;
                return typeof s.iconClass === 'string' && s.iconClass.length > 0;
            });

            const linksNorm = contentLinksRaw.filter(function (c) {
                return c && typeof c.url === 'string' && typeof c.title === 'string' && c.title.length > 0;
            });

            if (socialNorm.length === 0 || linksNorm.length === 0) {
                throw new Error('links empty');
            }

            const socialLinks = socialNorm.map(function (s) {
                var ik =
                    s.iconKind === 'xiaohongshu'
                        ? 'xiaohongshu'
                        : s.iconKind === 'wechat'
                          ? 'wechat'
                          : s.iconKind === 'qq'
                            ? 'qq'
                            : '';
                return {
                    href: s.href,
                    label: s.label,
                    iconClass: typeof s.iconClass === 'string' ? s.iconClass : '',
                    iconKind: ik,
                    cssClass: typeof s.cssClass === 'string' ? s.cssClass : '',
                    wechatId: typeof s.wechatId === 'string' ? s.wechatId.trim() : '',
                    qqUin:
                        typeof s.qqUin === 'string' ? String(s.qqUin).replace(/\D/g, '') : ''
                };
            });

            const contentLinks = linksNorm.map(function (c) {
                return {
                    title: c.title,
                    description: typeof c.description === 'string' ? c.description : '',
                    url: c.url
                };
            });
            return { socialLinks: socialLinks, contentLinks: contentLinks };
        }

