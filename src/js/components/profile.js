/**
 * Apply localized profile and page accessibility labels to the document.
 * The function receives the UI configuration explicitly and does not own
 * configuration loading or application-wide state.
 */

export function applyUiFromObject(t) {
            document.documentElement.lang = t.htmlLang;
            document.title = t.pageTitle;

            document.querySelectorAll('.i18n-hero-name').forEach(function (el) {
                el.textContent = t.nameDisplay;
            });

            const tagInitial = document.getElementById('tagline-initial');
            const tagMain = document.getElementById('tagline-main');
            if (tagInitial) tagInitial.textContent = t.tagline;
            if (tagMain) tagMain.textContent = t.tagline;

            ['profile-avatar', 'transition-avatar', 'final-avatar'].forEach(function (id) {
                const el = document.getElementById(id);
                if (el) el.setAttribute('alt', t.avatarAlt);
            });

            const socialNav = document.getElementById('social-icons');
            if (socialNav) socialNav.setAttribute('aria-label', t.socialNavAria);

            const linksSection = document.getElementById('links-section');
            if (linksSection) linksSection.setAttribute('aria-label', t.linksSectionAria);

            const cardsNav = document.getElementById('cards-container');
            if (cardsNav) cardsNav.setAttribute('aria-label', t.contentLinksNavAria);

            const quoteSection = document.getElementById('quote-section');
            if (quoteSection) quoteSection.setAttribute('aria-label', t.quoteSectionAria);

            const quoteContainer = document.getElementById('quote-container');
            if (quoteContainer) {
                quoteContainer.setAttribute('aria-label', t.quoteToggleAria);
                quoteContainer.setAttribute('title', t.quoteToggleTitle);
            }

            var headerWrap = document.getElementById('header-avatar-wrap');
            if (headerWrap && typeof t.headerAvatarAria === 'string' && t.headerAvatarAria.length) {
                headerWrap.setAttribute('aria-label', t.headerAvatarAria);
            }
}
