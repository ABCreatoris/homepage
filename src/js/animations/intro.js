/** Run the homepage intro in sequence, following real transitions where possible. */
export async function startAnimationSequence({
    getHeaderAvatarSlotRect,
    syncAvatarBadgeGeometry,
    renderCards,
    updateQuote,
    onMainIntroAnimationsComplete,
    prefersReducedMotion
}) {
    const initialLayout = document.getElementById('initial-layout');
    const mainContent = document.getElementById('main-content');
    const avatarTransition = document.getElementById('avatar-transition');
    const initialAvatar = document.querySelector('.initial-avatar');
    const quoteContainer = document.getElementById('quote-container');
    const socialIcons = document.querySelectorAll('.social-icon');

    const showRemainingContent = () => {
        socialIcons.forEach(icon => icon.classList.add('show'));
        renderCards();
        updateQuote(false);
        if (quoteContainer) quoteContainer.classList.add('show');
        if (typeof syncAvatarBadgeGeometry === 'function') syncAvatarBadgeGeometry();
        onMainIntroAnimationsComplete();
    };

    if (!initialLayout || !mainContent || !avatarTransition || !initialAvatar || !quoteContainer) {
        showRemainingContent();
        return;
    }

    if (prefersReducedMotion && prefersReducedMotion()) {
        initialLayout.classList.add('minimized');
        avatarTransition.classList.add('hidden');
        mainContent.classList.add('show');
        showRemainingContent();
        return;
    }

    const waitForTransition = (element, propertyName, fallbackMs) => new Promise(resolve => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            element.removeEventListener('transitionend', onEnd);
            window.clearTimeout(fallback);
            resolve();
        };
        const onEnd = event => {
            if (event.target === element && event.propertyName === propertyName) finish();
        };
        const fallback = window.setTimeout(finish, fallbackMs);
        element.addEventListener('transitionend', onEnd);
    });

    const initialRect = initialAvatar.getBoundingClientRect();
    avatarTransition.style.width = initialRect.width + 'px';
    avatarTransition.style.height = initialRect.height + 'px';
    avatarTransition.style.left = initialRect.left + 'px';
    avatarTransition.style.top = initialRect.top + 'px';
    avatarTransition.classList.remove('hidden');

    initialLayout.classList.add('minimized');
    await waitForTransition(initialLayout, 'opacity', 950);

    const finalRect = getHeaderAvatarSlotRect();
    if (finalRect) {
        avatarTransition.style.width = finalRect.width + 'px';
        avatarTransition.style.height = finalRect.height + 'px';
        avatarTransition.style.left = finalRect.left + 'px';
        avatarTransition.style.top = finalRect.top + 'px';
        await waitForTransition(avatarTransition, 'left', 950);
    }

    mainContent.classList.add('show');
    await waitForTransition(mainContent, 'opacity', 950);
    avatarTransition.classList.add('hidden');
    if (typeof syncAvatarBadgeGeometry === 'function') syncAvatarBadgeGeometry();

    socialIcons.forEach((icon, index) => {
        window.setTimeout(() => icon.classList.add('show'), index * 120);
    });
    const socialRevealDuration = socialIcons.length ? (socialIcons.length - 1) * 120 + 400 : 0;
    await new Promise(resolve => window.setTimeout(resolve, socialRevealDuration));

    renderCards();
    await new Promise(resolve => window.setTimeout(resolve, 420));
    updateQuote(false);
    quoteContainer.classList.add('show');
    await new Promise(resolve => window.setTimeout(resolve, 900));
    onMainIntroAnimationsComplete();
}
