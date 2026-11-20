/** Work, weekend and holiday badge rendering for the profile avatar. */
export function createPresenceController({ getPresence }) {
        function findHolidayToday(holidays) {
            if (!Array.isArray(holidays)) return null;
            var d = new Date();
            var m = d.getMonth() + 1;
            var day = d.getDate();
            var cur = m * 100 + day;
            for (var i = 0; i < holidays.length; i++) {
                var h = holidays[i];
                if (!h || typeof h.startMonth !== 'number') continue;
                var sm = h.startMonth;
                var sd = typeof h.startDay === 'number' ? h.startDay : 1;
                var em = typeof h.endMonth === 'number' ? h.endMonth : sm;
                var ed = typeof h.endDay === 'number' ? h.endDay : sd;
                var start = sm * 100 + sd;
                var end = em * 100 + ed;
                if (cur >= start && cur <= end) return h;
            }
            return null;
        }

        function isWeekdayLocal(date) {
            var d = date || new Date();
            var day = d.getDay();
            return day >= 1 && day <= 5;
        }

        function isWeekendLocal(date) {
            var day = (date || new Date()).getDay();
            return day === 0 || day === 6;
        }

        function shouldShowWorkBadge(p) {
            if (!p) return false;
            if (!isWeekdayLocal()) return false;
            if (p.employmentType !== 'employee') return false;
            var sub = p.companyMatchSubstring || '';
            var legal = p.companyLegalName || '';
            if (!sub) return false;
            return legal.indexOf(sub) !== -1;
        }

        function shouldShowWeekendBadge(p) {
            if (!p || !isWeekendLocal()) return false;
            var wb = p.weekendBadge;
            if (!wb || wb.enabled === false) return false;
            return true;
        }

        function isPresenceEmojiIcon(icon) {
            if (typeof icon !== 'string' || !icon.length) return false;
            if (icon === 'briefcase' || icon === 'home') return false;
            if (/^fa[srb]?\s/i.test(icon)) return false;
            return true;
        }

        var PRESENCE_FA_ICONS = {
            briefcase: 'fa-solid fa-briefcase',
            work: 'fa-solid fa-briefcase',
            home: 'fa-solid fa-house',
            weekend: 'fa-solid fa-house',
            house: 'fa-solid fa-house'
        };

        function resolvePresenceIconClass(spec, variant) {
            if (spec && typeof spec.iconClass === 'string' && spec.iconClass.length) {
                return spec.iconClass;
            }
            var icon = spec && spec.icon ? String(spec.icon).toLowerCase() : '';
            if (icon === 'home' || icon === 'house' || variant === 'weekend') {
                return PRESENCE_FA_ICONS.home;
            }
            return PRESENCE_FA_ICONS.briefcase;
        }

        function renderPresenceBadgeIcon(core, spec, variant) {
            var icon = spec && spec.icon ? spec.icon : 'briefcase';
            if (isPresenceEmojiIcon(icon)) {
                core.classList.add('avatar-presence-badge__core--emoji');
                core.textContent = icon;
                return;
            }
            var i = document.createElement('i');
            i.className = resolvePresenceIconClass(spec, variant) + ' presence-badge-fa';
            i.setAttribute('aria-hidden', 'true');
            core.appendChild(i);
        }

        function attachPresenceHintHandlers(el, hintsList) {
            var hints = Array.isArray(hintsList) ? hintsList.filter(Boolean) : [];
            var hintEl = el.querySelector('.avatar-presence-badge__hint');
            var hintIndex = 0;
            var canHover = window.matchMedia('(hover: hover)').matches;

            function paintHint() {
                if (!hintEl || !hints.length) return;
                hintEl.textContent = hints[hintIndex % hints.length];
                hintIndex = (hintIndex + 1) % hints.length;
            }

            function showHint() {
                paintHint();
                el.classList.add('is-hint-on');
            }

            function hideHint() {
                el.classList.remove('is-hint-on');
            }

            if (canHover) {
                el.addEventListener('mouseenter', showHint);
                el.addEventListener('mouseleave', hideHint);
                el.addEventListener('focusin', showHint);
                el.addEventListener('focusout', hideHint);
            }

            el.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!hints.length) {
                    hideHint();
                    return;
                }
                if (!canHover) {
                    if (el.classList.contains('is-hint-on')) {
                        paintHint();
                    } else {
                        showHint();
                    }
                    return;
                }
                hideHint();
            });

            var hit = el.querySelector('.avatar-presence-badge__hit');
            if (hit) {
                hit.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
            }
        }

        function mountPresenceBadgeWithHint(el, variant, hints, renderHit) {
            var hintsList = [];
            if (Array.isArray(hints)) hintsList = hints.filter(Boolean);
            else if (typeof hints === 'string' && hints.length) hintsList = [hints];

            el.removeAttribute('hidden');
            el.classList.add('avatar-presence-badge--hinted', 'avatar-presence-badge--' + variant);
            el.setAttribute('aria-label', hintsList[0] || variant);
            el.setAttribute('tabindex', '0');

            var hit = document.createElement('span');
            hit.className = 'avatar-presence-badge__hit';
            var core = document.createElement('span');
            core.className = 'avatar-presence-badge__core';
            hit.setAttribute('role', 'img');
            hit.appendChild(core);
            renderHit(core);

            el.appendChild(hit);

            if (hintsList.length) {
                var hint = document.createElement('span');
                hint.className = 'avatar-presence-badge__hint';
                hint.id = 'presence-badge-hint';
                hint.setAttribute('role', 'tooltip');
                hint.textContent = hintsList[0];
                el.appendChild(hint);
                attachPresenceHintHandlers(el, hintsList);
            }
        }

        function renderPresenceBadge() {
            var el = document.getElementById('avatar-presence-badge');
            if (!el) return;
            el.innerHTML = '';
            el.className = 'avatar-presence-badge';
            el.removeAttribute('title');
            el.removeAttribute('tabindex');
            el.removeAttribute('aria-describedby');
            el.removeAttribute('role');
            el.classList.remove('is-hint-on');
            if (!getPresence()) {
                el.setAttribute('hidden', '');
                return;
            }

            var hol = findHolidayToday(getPresence().holidays);
            if (hol && hol.icon) {
                var holHints = hol.hoverHints && hol.hoverHints.length ? hol.hoverHints : hol.hoverHint || hol.title || '';
                mountPresenceBadgeWithHint(el, 'holiday', holHints, function (hit) {
                    renderPresenceBadgeIcon(hit, { icon: hol.icon }, 'holiday');
                });
                return;
            }

            if (shouldShowWeekendBadge(getPresence())) {
                var we = getPresence().weekendBadge || {};
                mountPresenceBadgeWithHint(el, 'weekend', we.hoverHints || [], function (hit) {
                    renderPresenceBadgeIcon(
                        hit,
                        { icon: we.icon || 'home', iconClass: we.iconClass },
                        'weekend'
                    );
                });
                return;
            }

            if (shouldShowWorkBadge(getPresence())) {
                var wb = getPresence().workBadge || {};
                mountPresenceBadgeWithHint(el, 'work', wb.hoverHints || [], function (hit) {
                    renderPresenceBadgeIcon(
                        hit,
                        { icon: wb.icon || 'briefcase', iconClass: wb.iconClass },
                        'work'
                    );
                });
                return;
            }

            el.setAttribute('hidden', '');
        }


    return { renderPresenceBadge };
}
