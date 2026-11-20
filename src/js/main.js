
        import { resolveSiteLocale } from './core/locale.js';
        import { prefersReducedMotion } from './core/dom.js';
        import { loadSiteConfig as loadSiteConfigData, createEmptySiteConfig } from './core/config.js';
        import { normalizeSiteLinks } from './core/normalize.js';
        import { applyUiFromObject } from './components/profile.js';
        import { renderCards } from './components/cards.js';
        import { renderSocialIcons } from './components/social.js';
        import { createQuoteController } from './components/quotes.js';
        import { startAnimationSequence } from './animations/intro.js';
        import { showMailToast, copyTextToClipboard, bindMailtoClick } from './features/clipboard.js';
        import { initSiteAnalytics } from './features/likes.js';
        import { createAvatarFeature } from './features/avatar.js';
        import { createPresenceController } from './components/presence.js';
        import { createAvatarFlairController } from './animations/avatar-flair.js';
        import { syncAvatarBadgeGeometry, getHeaderAvatarSlotRect, revealPresenceBadge, playAvatarPreBadgeWiggle } from './components/avatar-layout.js';

        /** 境内 CN → 中文；境外 → 英文。失败时按浏览器语言回退。 */
        let siteLocale = 'zh';
        const avatarFeature = createAvatarFeature({ prefersReducedMotion });
        const presenceController = createPresenceController({ getPresence: function () { return avatarFeature.presence; } });
        const avatarFlairController = createAvatarFlairController({ getPhrases: function () { return avatarFeature.avatarTap.bubbles; }, prefersReducedMotion, isIntroComplete: function () { return mainIntroAnimComplete; } });
        const quoteController = createQuoteController({ prefersReducedMotion });

        /** 当前语言 ui 文案（来自 config.*.json，供 toast / title 等使用） */
        let siteUi = {};

        function uiMessage(key, replacements) {
            var template = siteUi && typeof siteUi[key] === 'string' ? siteUi[key] : '';
            if (!replacements) return template;
            return Object.keys(replacements).reduce(function (acc, k) {
                return acc.split('{' + k + '}').join(replacements[k]);
            }, template);
        }

        /** 社交平台 SVG（小红书不在 Font Awesome brands 中时改用） */
        const SOCIAL_SVG_XHS =
            '<svg class="xhs-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5.5" fill="currentColor"/><path fill="#ffffff" d="M7 7h10v2H7zm0 4h7v2H7zm0 4h10v2H7z"/></svg>';

        let siteSocialLinks = [];
        let siteContentLinks = [];

        var mainIntroAnimComplete = false;

        function onMainIntroAnimationsComplete() {
            if (mainIntroAnimComplete) return;
            mainIntroAnimComplete = true;
            syncAvatarBadgeGeometry();
            presenceController.renderPresenceBadge();
            playAvatarPreBadgeWiggle(function () {
                revealPresenceBadge();
                var wrap = document.getElementById('header-avatar-wrap');
                if (!wrap) return;
                wrap.classList.add('avatar-wrap--ready');
                wrap.setAttribute('tabindex', '0');
                avatarFlairController.bindHeaderAvatarInteractions();
            });
        }

        async function loadSiteConfig() {
            const result = await loadSiteConfigData(siteLocale);
            siteLocale = result.locale;
            const data = result.data || createEmptySiteConfig(siteLocale);
            const payload = data;
            siteUi = data.ui || {};
            try {
                applyUiFromObject(data.ui);
                const normalizedLinks = normalizeSiteLinks(data);
                siteSocialLinks = normalizedLinks.socialLinks;
                siteContentLinks = normalizedLinks.contentLinks;
                quoteController.setQuotes(data.quotes);
            } catch (e) {
                console.warn('[homepage] config links invalid:', e);
                siteSocialLinks = [];
                siteContentLinks = [];
                quoteController.setQuotes([]);
            }
            avatarFeature.ingestAvatarExtensions(payload);
            avatarFeature.applyAvatarUrlsToStacks();
            initSiteAnalytics(payload);
        }


        document.addEventListener('DOMContentLoaded', async function () {
            siteLocale = await resolveSiteLocale();
            await loadSiteConfig();
            renderSocialIcons({ links: siteSocialLinks, uiMessage, copyTextToClipboard, showMailToast, bindMailtoClick: function (anchor, href) { bindMailtoClick(anchor, href, { uiMessage }); }, socialSvgXhs: SOCIAL_SVG_XHS });

            startAnimationSequence({
                getHeaderAvatarSlotRect,
                syncAvatarBadgeGeometry,
                renderCards: function () { renderCards({ links: siteContentLinks, bindMailtoClick: function (anchor, href) { bindMailtoClick(anchor, href, { uiMessage }); } }); },
                                updateQuote: function (advanceNext) { quoteController.update(advanceNext); },
                onMainIntroAnimationsComplete
            });

            const quoteContainer = document.getElementById('quote-container');            quoteContainer.addEventListener('click', function () {
                quoteController.update(true);
                quoteController.scheduleAutoRotate();
            });
            quoteContainer.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    quoteController.update(true);
                    quoteController.scheduleAutoRotate();
                }
            });
            quoteController.scheduleAutoRotate();

            var badgeGeomResizeTimer;
            window.addEventListener('resize', function () {
                clearTimeout(badgeGeomResizeTimer);
                badgeGeomResizeTimer = setTimeout(function () {
                    syncAvatarBadgeGeometry();
                    if (mainIntroAnimComplete) presenceController.renderPresenceBadge();
                }, 120);
            });
        });


