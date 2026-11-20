import { resolveSiteLocale } from './core/locale.js';
import { prefersReducedMotion } from './core/dom.js';
import { loadSiteConfig, createEmptySiteConfig } from './core/config.js';
import { normalizeSiteLinks } from './core/normalize.js';
import { applyUiFromObject } from './components/profile.js';
import { renderCards } from './components/cards.js';
import { renderSocialIcons } from './components/social.js';
import { createQuoteController } from './components/quotes.js';
import { createPresenceController } from './components/presence.js';
import {
    syncAvatarBadgeGeometry,
    getHeaderAvatarSlotRect,
    revealPresenceBadge,
    playAvatarPreBadgeWiggle
} from './components/avatar-layout.js';
import { showMailToast, copyTextToClipboard, bindMailtoClick } from './features/clipboard.js';
import { initSiteAnalytics } from './features/likes.js';
import { createAvatarFeature } from './features/avatar.js';
import { createAvatarFlairController } from './animations/avatar-flair.js';
import { startAnimationSequence } from './animations/intro.js';

let siteLocale = 'zh';
let siteUi = {};
let siteSocialLinks = [];
let siteContentLinks = [];
let mainIntroAnimComplete = false;

const avatarFeature = createAvatarFeature({ prefersReducedMotion });
const presenceController = createPresenceController({
    getPresence: () => avatarFeature.presence
});
const avatarFlairController = createAvatarFlairController({
    getPhrases: () => avatarFeature.avatarTap.bubbles,
    prefersReducedMotion,
    isIntroComplete: () => mainIntroAnimComplete
});
const quoteController = createQuoteController({ prefersReducedMotion });

function uiMessage(key, replacements) {
    const template = siteUi && typeof siteUi[key] === 'string' ? siteUi[key] : '';
    if (!replacements) return template;
    return Object.keys(replacements).reduce((acc, keyName) => {
        return acc.split('{' + keyName + '}').join(replacements[keyName]);
    }, template);
}

function bindMailtoClickWithUi(anchor, href) {
    bindMailtoClick(anchor, href, { uiMessage });
}

function renderConfiguredCards() {
    renderCards({
        links: siteContentLinks,
        bindMailtoClick: bindMailtoClickWithUi
    });
}

function renderConfiguredSocialLinks() {
    renderSocialIcons({
        links: siteSocialLinks,
        uiMessage,
        copyTextToClipboard,
        showMailToast,
        bindMailtoClick: bindMailtoClickWithUi
    });
}

function onMainIntroAnimationsComplete() {
    if (mainIntroAnimComplete) return;
    mainIntroAnimComplete = true;

    syncAvatarBadgeGeometry();
    presenceController.renderPresenceBadge();

    playAvatarPreBadgeWiggle(() => {
        revealPresenceBadge();
        const wrap = document.getElementById('header-avatar-wrap');
        if (!wrap) return;
        wrap.classList.add('avatar-wrap--ready');
        wrap.setAttribute('tabindex', '0');
        avatarFlairController.bindHeaderAvatarInteractions();
    }, prefersReducedMotion);
}

async function loadSiteConfigForPage() {
    const result = await loadSiteConfig(siteLocale);
    siteLocale = result.locale;
    const data = result.data || createEmptySiteConfig(siteLocale);
    siteUi = data.ui || {};

    try {
        applyUiFromObject(data.ui);
        const normalizedLinks = normalizeSiteLinks(data);
        siteSocialLinks = normalizedLinks.socialLinks;
        siteContentLinks = normalizedLinks.contentLinks;
        quoteController.setQuotes(data.quotes);
    } catch (error) {
        console.warn('[homepage] config links invalid:', error);
        siteSocialLinks = [];
        siteContentLinks = [];
        quoteController.setQuotes([]);
    }

    avatarFeature.ingestAvatarExtensions(data);
    avatarFeature.applyAvatarUrlsToStacks();
    initSiteAnalytics(data);
}

document.addEventListener('DOMContentLoaded', async function () {
    siteLocale = await resolveSiteLocale();
    await loadSiteConfigForPage();

    renderConfiguredSocialLinks();

    startAnimationSequence({
        getHeaderAvatarSlotRect,
        syncAvatarBadgeGeometry,
        renderCards: renderConfiguredCards,
        updateQuote: advanceNext => quoteController.update(advanceNext),
        onMainIntroAnimationsComplete
    });

    const quoteContainer = document.getElementById('quote-container');
    quoteContainer.addEventListener('click', function () {
        quoteController.update(true);
        quoteController.scheduleAutoRotate();
    });
    quoteContainer.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            quoteController.update(true);
            quoteController.scheduleAutoRotate();
        }
    });
    quoteController.scheduleAutoRotate();

    let badgeGeomResizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(badgeGeomResizeTimer);
        badgeGeomResizeTimer = setTimeout(function () {
            syncAvatarBadgeGeometry();
            if (mainIntroAnimComplete) presenceController.renderPresenceBadge();
        }, 120);
    });
});
