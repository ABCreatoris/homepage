/** Geometry and reveal helpers shared by the avatar and its presence badge. */
export function syncAvatarBadgeGeometry() {
            var slot = document.querySelector('.header-avatar-slot');
            if (!slot) return;
            var size = slot.offsetWidth;
            if (!size) return;
            var rPx = size / 2;
            slot.style.setProperty('--avatar-r', rPx + 'px');
            var badgeRem = Math.max(2.15, Math.min(2.55, size / 16 * 0.26)).toFixed(3) + 'rem';
            slot.style.setProperty('--avatar-badge-hit', badgeRem);
        }

export function getHeaderAvatarSlotRect() {
            var slot = document.querySelector('.header-avatar-slot');
            if (!slot) return null;
            syncAvatarBadgeGeometry();
            return slot.getBoundingClientRect();
        }

export function revealPresenceBadge() {
            syncAvatarBadgeGeometry();
            var el = document.getElementById('avatar-presence-badge');
            if (!el || el.hasAttribute('hidden')) return;
            el.classList.remove('is-revealed');
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    el.classList.add('is-revealed');
                });
            });
        }

export function playAvatarPreBadgeWiggle(done, prefersReducedMotion) {
            var slot = document.querySelector('.header-avatar-slot');
            if (!slot || prefersReducedMotion()) {
                if (done) done();
                return;
            }
            slot.classList.remove('avatar-wiggle-pre-badge');
            void slot.offsetWidth;
            slot.classList.add('avatar-wiggle-pre-badge');
            slot.addEventListener(
                'animationend',
                function onEnd() {
                    slot.removeEventListener('animationend', onEnd);
                    slot.classList.remove('avatar-wiggle-pre-badge');
                    if (done) done();
                },
                { once: true }
            );
        }

