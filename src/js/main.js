
        import { resolveSiteLocale } from './core/locale.js';
        import { loadSiteConfig as loadSiteConfigData } from './core/config.js';
        import { applyUiFromObject } from './components/profile.js';
        import { renderCards } from './components/cards.js';
        import { renderSocialIcons } from './components/social.js';
        import { createQuoteController } from './components/quotes.js';
        import { startAnimationSequence } from './animations/intro.js';
        import { showMailToast, copyTextToClipboard, bindMailtoClick } from './features/clipboard.js';
        import { initSiteAnalytics } from './features/likes.js';

        /** 境内 CN → 中文；境外 → 英文。失败时按浏览器语言回退。 */
        let siteLocale = 'zh';
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

        /** 配置文件加载失败时的空壳（不含个人文案，仅保证结构） */
        function createEmptySiteConfig(loc) {
            return {
                ui: {
                    htmlLang: loc === 'zh' ? 'zh-CN' : 'en',
                    pageTitle: '',
                    nameDisplay: '',
                    tagline: '',
                    avatarAlt: '',
                    socialNavAria: '',
                    linksSectionAria: '',
                    contentLinksNavAria: '',
                    quoteSectionAria: '',
                    quoteToggleAria: '',
                    quoteToggleTitle: '',
                    headerAvatarAria: '',
                    mailCopySuccess: '',
                    mailCopyManual: '',
                    wechatCopySuccess: '',
                    wechatCopyManual: '',
                    wechatTitleDesktop: '',
                    wechatTitleMobile: '',
                    qqTitle: ''
                },
                avatarMedia: { fullUrl: '', thumbUrl: '', thumbSize: 32, fallbackUrl: '' },
                avatarTap: { bubbles: [] },
                presence: null,
                social: [],
                contentLinks: [],
                quotes: { mottos: [], famous: [] },
                analytics: { likes: { enabled: false } }
            };
        }

        /** 社交平台 SVG（小红书不在 Font Awesome brands 中时改用） */
        const SOCIAL_SVG_XHS =
            '<svg class="xhs-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5.5" fill="currentColor"/><path fill="#ffffff" d="M7 7h10v2H7zm0 4h7v2H7zm0 4h10v2H7z"/></svg>';

        let siteSocialLinks = [];
        let siteContentLinks = [];
        let siteAvatarMedia = null;
        let siteAvatarTap = { bubbles: [] };
        let sitePresence = null;

        const DEFAULT_AVATAR_THUMB_SIZE = 32;

        function emptyAvatarMedia() {
            return {
                fullUrl: '',
                thumbSize: DEFAULT_AVATAR_THUMB_SIZE,
                thumbUrl: '',
                fallbackUrl: ''
            };
        }

        /** Gitee 头像缩略图用后缀 !avatar32（非 ?avatar32） */
        function buildGiteeAvatarThumbUrl(fullUrl, size) {
            var px = typeof size === 'number' && size > 0 ? Math.round(size) : DEFAULT_AVATAR_THUMB_SIZE;
            if (typeof fullUrl !== 'string' || !fullUrl.length) return '';
            var base = fullUrl.replace(/!avatar\d+/i, '').split('?')[0];
            if (/foruda\.gitee\.com\/avatar\//i.test(base)) {
                return base + '!avatar' + px;
            }
            return fullUrl;
        }

        function normalizeAvatarMedia(m) {
            var d = emptyAvatarMedia();
            if (!m || typeof m !== 'object') {
                return {
                    fullUrl: d.fullUrl,
                    thumbUrl: d.thumbUrl,
                    thumbSize: d.thumbSize,
                    fallbackUrl: d.fallbackUrl
                };
            }
            var full = typeof m.fullUrl === 'string' && m.fullUrl ? m.fullUrl : d.fullUrl;
            var thumbSize =
                typeof m.thumbSize === 'number' && m.thumbSize > 0 ? Math.round(m.thumbSize) : DEFAULT_AVATAR_THUMB_SIZE;
            var thumb =
                typeof m.thumbUrl === 'string' && m.thumbUrl
                    ? m.thumbUrl
                    : buildGiteeAvatarThumbUrl(full, thumbSize);
            var fb = typeof m.fallbackUrl === 'string' && m.fallbackUrl ? m.fallbackUrl : d.fallbackUrl;
            return { fullUrl: full, thumbUrl: thumb, thumbSize: thumbSize, fallbackUrl: fb };
        }

        function preloadAvatarThumb(url) {
            if (!url || typeof url !== 'string') return;
            var id = 'avatar-thumb-preload';
            var link = document.getElementById(id);
            if (link) {
                if (link.href !== url) link.href = url;
                return;
            }
            link = document.createElement('link');
            link.id = id;
            link.rel = 'preload';
            link.as = 'image';
            link.href = url;
            document.head.appendChild(link);
        }

        function normalizeAvatarTap(t) {
            var bubbles = [];
            if (t && Array.isArray(t.bubbles)) {
                t.bubbles.forEach(function (b) {
                    if (typeof b === 'string' && b.length) {
                        bubbles.push({ text: b });
                        return;
                    }
                    if (b && typeof b.text === 'string' && b.text.length) {
                        bubbles.push({ text: b.text });
                    }
                });
            }
            return { bubbles: bubbles };
        }

        function normalizeStringList(arr, fallback) {
            var out = [];
            if (Array.isArray(arr)) {
                arr.forEach(function (s) {
                    if (typeof s === 'string' && s.length) out.push(s);
                });
            }
            if (!out.length && typeof fallback === 'string' && fallback.length) out.push(fallback);
            return out;
        }

        function normalizeHoliday(h) {
            if (!h || typeof h !== 'object' || typeof h.startMonth !== 'number') return null;
            var sm = h.startMonth;
            var sd = typeof h.startDay === 'number' ? h.startDay : 1;
            var em = typeof h.endMonth === 'number' ? h.endMonth : sm;
            var ed = typeof h.endDay === 'number' ? h.endDay : sd;
            var hoverHint = '';
            if (typeof h.hoverHint === 'string' && h.hoverHint.length) {
                hoverHint = h.hoverHint;
            } else if (typeof h.title === 'string') {
                hoverHint = h.title;
            }
            return {
                id: typeof h.id === 'string' ? h.id : '',
                title: typeof h.title === 'string' ? h.title : '',
                hoverHint: hoverHint,
                hoverHints: normalizeStringList(h.hoverHints, hoverHint),
                icon: typeof h.icon === 'string' ? h.icon : '',
                startMonth: sm,
                startDay: sd,
                endMonth: em,
                endDay: ed
            };
        }

        function normalizePresence(p) {
            if (!p || typeof p !== 'object') return null;
            var wbRaw = p.workBadge && typeof p.workBadge === 'object' ? p.workBadge : {};
            var workFallback = '';
            if (typeof wbRaw.hoverHint === 'string') workFallback = wbRaw.hoverHint;
            else if (typeof wbRaw.employmentTooltip === 'string') workFallback = wbRaw.employmentTooltip;
            else if (typeof wbRaw.hiringTooltip === 'string') workFallback = wbRaw.hiringTooltip;
            var wb = {
                icon: typeof wbRaw.icon === 'string' ? wbRaw.icon : 'briefcase',
                iconClass: typeof wbRaw.iconClass === 'string' ? wbRaw.iconClass : '',
                hoverHints: normalizeStringList(wbRaw.hoverHints, workFallback)
            };
            var weRaw = p.weekendBadge && typeof p.weekendBadge === 'object' ? p.weekendBadge : {};
            var weekendHint = typeof weRaw.hoverHint === 'string' ? weRaw.hoverHint : '';
            var weekendBadge = {
                enabled: weRaw.enabled !== false,
                icon: typeof weRaw.icon === 'string' ? weRaw.icon : 'home',
                hoverHints: normalizeStringList(weRaw.hoverHints, weekendHint)
            };
            var holidays = [];
            if (Array.isArray(p.holidays)) {
                p.holidays.forEach(function (h) {
                    var norm = normalizeHoliday(h);
                    if (norm) holidays.push(norm);
                });
            }
            return {
                employmentType: typeof p.employmentType === 'string' ? p.employmentType : '',
                companyLegalName: typeof p.companyLegalName === 'string' ? p.companyLegalName : '',
                companyMatchSubstring: typeof p.companyMatchSubstring === 'string' ? p.companyMatchSubstring : '',
                workBadge: wb,
                weekendBadge: weekendBadge,
                holidays: holidays
            };
        }

        function ingestAvatarExtensions(data) {
            siteAvatarMedia = normalizeAvatarMedia(data && data.avatarMedia);
            siteAvatarTap = normalizeAvatarTap(data && data.avatarTap);
            sitePresence = normalizePresence(data && data.presence);
            preloadAvatarThumb(siteAvatarMedia.thumbUrl);
        }

        var avatarMediaAppliedKey = '';

        function fetchImageAsync(url, timeoutMs) {
            return new Promise(function (resolve, reject) {
                if (!url) {
                    reject(new Error('empty url'));
                    return;
                }
                var img = new Image();
                var tid = window.setTimeout(function () {
                    tid = null;
                    reject(new Error('timeout'));
                }, timeoutMs || 12000);
                img.decoding = 'async';
                function finish(ok) {
                    if (tid !== null) {
                        window.clearTimeout(tid);
                        tid = null;
                    }
                    if (ok) resolve(img);
                    else reject(new Error('load failed'));
                }
                img.onload = function () {
                    finish(true);
                };
                img.onerror = function () {
                    finish(false);
                };
                img.src = url;
            });
        }

        function wireProgressiveAvatarStack(stack, thumb, full, media) {
            var clarifyScheduled = false;

            stack.classList.remove('is-sharp', 'full-loaded', 'thumb-ready', 'thumb-hidden');
            stack.classList.add('is-loading');
            thumb.removeAttribute('src');
            full.removeAttribute('src');

            function beginClarifyTransition() {
                if (clarifyScheduled) return;
                if (!stack.classList.contains('thumb-ready')) return;
                if (!(full.complete && full.naturalWidth > 0)) return;
                clarifyScheduled = true;

                stack.classList.add('thumb-hidden', 'full-loaded');

                if (prefersReducedMotion()) {
                    stack.classList.add('is-sharp');
                    stack.classList.remove('is-loading');
                    return;
                }

                requestAnimationFrame(function () {
                    stack.classList.add('is-sharp');
                    stack.classList.remove('is-loading');
                });
            }

            function attachFullAndClarify(url) {
                full.src = url;
                if (full.complete && full.naturalWidth > 0) {
                    beginClarifyTransition();
                    return;
                }
                full.addEventListener('load', beginClarifyTransition, { once: true });
                full.addEventListener('error', beginClarifyTransition, { once: true });
            }

            function markThumbReady(thumbUrl) {
                if (stack.classList.contains('thumb-ready')) return;
                thumb.src = thumbUrl;
                stack.classList.add('thumb-ready');
            }

            function beginFullFetch() {
                fetchImageAsync(media.fullUrl, 15000)
                    .then(function () {
                        attachFullAndClarify(media.fullUrl);
                    })
                    .catch(function () {
                        if (media.fallbackUrl) {
                            fetchImageAsync(media.fallbackUrl, 15000).then(function () {
                                attachFullAndClarify(media.fallbackUrl);
                            }).catch(function () {
                                attachFullAndClarify(media.fallbackUrl);
                            });
                            return;
                        }
                        attachFullAndClarify(media.fullUrl);
                    });
            }

            function loadThumbThenFull() {
                fetchImageAsync(media.thumbUrl, 8000)
                    .then(function () {
                        markThumbReady(media.thumbUrl);
                        beginFullFetch();
                    })
                    .catch(function () {
                        if (media.fallbackUrl) {
                            fetchImageAsync(media.fallbackUrl, 8000)
                                .then(function () {                                    markThumbReady(media.fallbackUrl);
                                    beginFullFetch();
                                })
                                .catch(function () {
                                    markThumbReady(media.thumbUrl);
                                    beginFullFetch();
                                });
                            return;
                        }
                        markThumbReady(media.thumbUrl);
                        beginFullFetch();
                    });
            }

            window.setTimeout(loadThumbThenFull, 0);
        }

        function applyAvatarUrlsToStacks() {
            var m = siteAvatarMedia;
            if (!m) return;
            var key = m.thumbUrl + '|' + m.fullUrl;
            if (key === avatarMediaAppliedKey) return;
            avatarMediaAppliedKey = key;
            document.querySelectorAll('.avatar-photo-stack').forEach(function (stack) {
                var thumb = stack.querySelector('.avatar-photo-thumb');
                var full = stack.querySelector('.avatar-photo-full');
                if (!thumb || !full) return;
                wireProgressiveAvatarStack(stack, thumb, full, m);
            });
        }

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
            if (!sitePresence) {
                el.setAttribute('hidden', '');
                return;
            }

            var hol = findHolidayToday(sitePresence.holidays);
            if (hol && hol.icon) {
                var holHints = hol.hoverHints && hol.hoverHints.length ? hol.hoverHints : hol.hoverHint || hol.title || '';
                mountPresenceBadgeWithHint(el, 'holiday', holHints, function (hit) {
                    renderPresenceBadgeIcon(hit, { icon: hol.icon }, 'holiday');
                });
                return;
            }

            if (shouldShowWeekendBadge(sitePresence)) {
                var we = sitePresence.weekendBadge || {};
                mountPresenceBadgeWithHint(el, 'weekend', we.hoverHints || [], function (hit) {
                    renderPresenceBadgeIcon(
                        hit,
                        { icon: we.icon || 'home', iconClass: we.iconClass },
                        'weekend'
                    );
                });
                return;
            }

            if (shouldShowWorkBadge(sitePresence)) {
                var wb = sitePresence.workBadge || {};
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

        var mainIntroAnimComplete = false;
        var avatarFlairHideTimer = null;
        var avatarTapPhraseIndex = 0;
        var headerFlairDistortRaf = null;
        var lastHeaderFlairShiftRem = null;

        var HEADER_FLAIR_DISTORT = {
            duration: 1500,
            maxScale: 28,
            maxBlur: 3,
            blurFadePortion: 0.28,
            baseFreqX: 0.048,
            baseFreqY: 0.095,
            extraSpacing: 0.05,
            maxOutwardPx: 132,
            charFromXEm: 3.4
        };

        /** 按头像实际尺寸更新角标锚点（与 w-40 及过渡动画终点一致） */
        function syncAvatarBadgeGeometry() {
            var slot = document.querySelector('.header-avatar-slot');
            if (!slot) return;
            var size = slot.offsetWidth;
            if (!size) return;
            var rPx = size / 2;
            slot.style.setProperty('--avatar-r', rPx + 'px');
            var badgeRem = Math.max(2.15, Math.min(2.55, size / 16 * 0.26)).toFixed(3) + 'rem';
            slot.style.setProperty('--avatar-badge-hit', badgeRem);
        }

        function getHeaderAvatarSlotRect() {
            var slot = document.querySelector('.header-avatar-slot');
            if (!slot) return null;
            syncAvatarBadgeGeometry();
            return slot.getBoundingClientRect();
        }

        function revealPresenceBadge() {
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

        function playAvatarPreBadgeWiggle(done) {
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

        function onMainIntroAnimationsComplete() {
            if (mainIntroAnimComplete) return;
            mainIntroAnimComplete = true;
            syncAvatarBadgeGeometry();
            renderPresenceBadge();
            playAvatarPreBadgeWiggle(function () {
                revealPresenceBadge();
                var wrap = document.getElementById('header-avatar-wrap');
                if (!wrap) return;
                wrap.classList.add('avatar-wrap--ready');
                wrap.setAttribute('tabindex', '0');
                bindHeaderAvatarInteractions();
            });
        }

        function headerFlairBaseLetterSpacingEm() {
            var lang = document.documentElement.lang || '';
            return /^en/i.test(lang) ? 0.052 : 0.06;
        }

        /** 大屏 + 可悬停设备才用湍流/逐字动画（手机仅淡入） */
        function shouldUseHeaderFlairMotion() {
            if (prefersReducedMotion()) return false;
            return window.matchMedia('(min-width: 768px) and (hover: hover)').matches;
        }

        /** 每次点击随机垂直偏移，且与上一次拉开差距 */
        function pickHeaderFlairShiftRem() {
            var wide = shouldUseHeaderFlairMotion();
            var min = wide ? -4 : -2.25;
            var max = wide ? 4 : 2.25;
            var step = 0.25;
            var shift = 0;
            var attempts = 0;
            do {
                shift = min + Math.random() * (max - min);
                shift = Math.round(shift / step) * step;
                attempts += 1;
            } while (
                lastHeaderFlairShiftRem !== null &&
                Math.abs(shift - lastHeaderFlairShiftRem) < 1.1 &&
                attempts < 14
            );
            lastHeaderFlairShiftRem = shift;
            return shift.toFixed(2);
        }

        function headerFlairShiftTransform(line, scale, outwardPx) {
            var shift = line.style.getPropertyValue('--flair-shift') || '0rem';
            var x =
                typeof outwardPx === 'number' && Math.abs(outwardPx) > 0.01
                    ? ' translateX(' + outwardPx.toFixed(1) + 'px)'
                    : '';
            return 'translateY(' + shift.trim() + ') scale(' + scale + ')' + x;
        }

        function headerFlairSide(host) {
            if (!host) return 'right';
            if (host.classList.contains('header-flair--left') || host.id === 'header-flair-left') {
                return 'left';
            }
            return 'right';
        }

        function headerFlairOutwardSign(side) {
            return side === 'left' ? 1 : -1;
        }

        function cancelHeaderFlairDistort() {
            if (headerFlairDistortRaf) {
                cancelAnimationFrame(headerFlairDistortRaf);
                headerFlairDistortRaf = null;
            }
        }

        function getHeaderFlairDistortNodes() {
            return {                turbulence: document.getElementById('header-flair-turbulence'),
                displacement: document.getElementById('header-flair-displacement')
            };
        }

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function setHeaderFlairCharVars(span, side, idx, total) {
            var twist = (Math.random() * 14 - 7).toFixed(1);
            var lift = (Math.random() * 0.2 + 0.28).toFixed(2);
            var centerWeight =
                side === 'left' ? (idx + 0.5) / Math.max(1, total) : (total - idx - 0.5) / Math.max(1, total);
            var fromXEm = centerWeight * HEADER_FLAIR_DISTORT.charFromXEm;
            var fromX = side === 'left' ? fromXEm : -fromXEm;
            span.style.setProperty('--twist-r', twist + 'deg');
            span.style.setProperty('--lift', lift + 'em');
            span.style.setProperty('--from-x', fromX.toFixed(2) + 'em');
        }

        function fillHeaderFlairChars(line, text, side) {
            line.textContent = '';
            var idx = 0;
            var segments = segmentQuoteGlyphs(text);
            var animateTotal = segments.reduce(function (acc, seg) {
                return acc + (seg.animate ? 1 : 0);
            }, 0);
            segments.forEach(function (seg) {
                if (!seg.animate) {
                    line.appendChild(document.createTextNode(seg.text));
                    return;
                }
                var span = document.createElement('span');
                span.className = 'header-flair-char';
                span.textContent = seg.text;
                setHeaderFlairCharVars(span, side, idx, animateTotal);
                span.style.setProperty('--fi', String(idx));
                idx += 1;
                line.appendChild(span);
            });
            return idx;
        }

        /** 整句 SVG 湍流（由中心向外扩散 + 模糊消退）+ 逐字向外归位 */
        function runHeaderFlairDistortIn(line, host, done) {
            var nodes = getHeaderFlairDistortNodes();
            var cfg = HEADER_FLAIR_DISTORT;
            var baseSpacing = headerFlairBaseLetterSpacingEm();
            var side = headerFlairSide(host);
            var outwardSign = headerFlairOutwardSign(side);

            cancelHeaderFlairDistort();

            if (!nodes.turbulence || !nodes.displacement || !shouldUseHeaderFlairMotion()) {
                line.classList.remove('is-distorting', 'is-out');
                line.classList.add('is-sharp', 'is-live');
                line.style.filter = '';
                line.style.opacity = '1';
                line.style.transform = headerFlairShiftTransform(line, 1, 0);
                line.style.letterSpacing = baseSpacing + 'em';
                if (done) done();
                return;
            }

            var turbSeed = 2 + Math.floor(Math.random() * 16);
            nodes.turbulence.setAttribute('seed', String(turbSeed));
            line.classList.remove('is-sharp', 'is-out');
            line.classList.add('is-distorting');

            requestAnimationFrame(function () {
                line.classList.add('is-live');
            });

            line.style.letterSpacing = baseSpacing + cfg.extraSpacing + 'em';

            var start = performance.now();

            function frame(now) {
                var raw = Math.min((now - start) / cfg.duration, 1);
                var progress = easeOutCubic(raw);
                var turbulence = 1 - progress;
                var spread = 1 - progress;

                var blurPhase = Math.min(1, progress / cfg.blurFadePortion);
                var blurAmount = cfg.maxBlur * (1 - easeOutCubic(blurPhase));

                nodes.displacement.setAttribute('scale', String(cfg.maxScale * turbulence));
                nodes.turbulence.setAttribute(
                    'baseFrequency',
                    cfg.baseFreqX + 0.04 * turbulence + ' ' + (cfg.baseFreqY + 0.08 * turbulence)
                );
                nodes.turbulence.setAttribute('seed', String(turbSeed + Math.floor(progress * 22)));

                if (blurAmount > 0.08) {
                    line.style.filter =
                        'url(#header-flair-distort-filter) blur(' + blurAmount.toFixed(2) + 'px)';
                } else {
                    line.style.filter = 'url(#header-flair-distort-filter)';
                }

                var outwardPx = outwardSign * cfg.maxOutwardPx * spread;
                line.style.opacity = String(0.55 + progress * 0.45);
                line.style.transform = headerFlairShiftTransform(line, 1 + 0.03 * turbulence, outwardPx);
                line.style.letterSpacing = baseSpacing + cfg.extraSpacing * turbulence + 'em';

                if (raw < 1) {
                    headerFlairDistortRaf = requestAnimationFrame(frame);
                    return;
                }

                headerFlairDistortRaf = null;
                line.classList.remove('is-distorting');
                line.classList.add('is-sharp');
                line.style.filter = 'none';
                line.style.opacity = '1';
                line.style.transform = headerFlairShiftTransform(line, 1, 0);
                line.style.letterSpacing = baseSpacing + 'em';
                if (done) done();
            }

            headerFlairDistortRaf = requestAnimationFrame(frame);
        }

        function hideHeaderFlairLine(line, host) {
            cancelHeaderFlairDistort();
            line.style.filter = 'none';
            line.classList.remove('is-distorting', 'is-sharp', 'is-live');
            line.classList.add('is-out');
            window.setTimeout(function () {
                if (host.contains(line)) host.removeChild(line);
            }, 440);
        }

        function showHeaderFlairSimple(line) {
            var baseSpacing = headerFlairBaseLetterSpacingEm();
            line.classList.add('header-flair-line--simple', 'is-sharp');
            line.style.filter = 'none';
            line.style.letterSpacing = baseSpacing + 'em';
            line.style.transform = headerFlairShiftTransform(line, 1, 0);
            line.style.opacity = '0';
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    line.classList.add('is-visible');
                });
            });
        }

        /** 每次点击随机左/右浮现一句（文案来自 config） */
        function playAvatarFlair() {
            var list = siteAvatarTap.bubbles;
            if (!list.length) return;

            var leftHost = document.getElementById('header-flair-left');
            var rightHost = document.getElementById('header-flair-right');
            if (!leftHost || !rightHost) return;

            var phrase = list[avatarTapPhraseIndex % list.length];
            avatarTapPhraseIndex += 1;

            var host = Math.random() < 0.5 ? leftHost : rightHost;
            var side = headerFlairSide(host);
            var useMotion = shouldUseHeaderFlairMotion();

            cancelHeaderFlairDistort();
            clearTimeout(avatarFlairHideTimer);
            leftHost.innerHTML = '';
            rightHost.innerHTML = '';

            var line = document.createElement('p');
            line.className = 'header-flair-line';
            line.style.setProperty('--flair-shift', pickHeaderFlairShiftRem() + 'rem');
            host.appendChild(line);

            var glyphCount = 0;
            if (useMotion) {
                glyphCount = fillHeaderFlairChars(line, phrase.text, side);
                runHeaderFlairDistortIn(line, host);
            } else {
                line.textContent = phrase.text;
                showHeaderFlairSimple(line);
            }

            var dwellMs;
            if (!useMotion) {
                dwellMs = 2600;
            } else if (prefersReducedMotion()) {
                dwellMs = 2800;
            } else {
                dwellMs = Math.max(3600, HEADER_FLAIR_DISTORT.duration + glyphCount * 42 + 900);
            }
            avatarFlairHideTimer = setTimeout(function () {
                hideHeaderFlairLine(line, host);
            }, dwellMs);
        }

        function bindHeaderAvatarInteractions() {
            var wrap = document.getElementById('header-avatar-wrap');
            if (!wrap || wrap.dataset.avatarTapBound) return;
            wrap.dataset.avatarTapBound = '1';
            wrap.addEventListener('click', function () {
                if (!mainIntroAnimComplete) return;
                playAvatarFlair();
            });
            wrap.addEventListener('keydown', function (e) {
                if (!mainIntroAnimComplete) return;
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                playAvatarFlair();
            });
        }

        function normalizeLinksFromConfig(data) {
            const social = Array.isArray(data.social) ? data.social : [];
            const contentLinks = Array.isArray(data.contentLinks) ? data.contentLinks : [];

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

            const linksNorm = contentLinks.filter(function (c) {
                return c && typeof c.url === 'string' && typeof c.title === 'string' && c.title.length > 0;
            });

            if (socialNorm.length === 0 || linksNorm.length === 0) {
                throw new Error('links empty');
            }

            siteSocialLinks = socialNorm.map(function (s) {
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

            siteContentLinks = linksNorm.map(function (c) {
                return {
                    title: c.title,
                    description: typeof c.description === 'string' ? c.description : '',
                    url: c.url
                };
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
                normalizeLinksFromConfig(data);
                quoteController.setQuotes(data.quotes);
            } catch (e) {
                console.warn('[homepage] config links invalid:', e);
                siteSocialLinks = [];
                siteContentLinks = [];
                quoteController.setQuotes([]);
            }
            ingestAvatarExtensions(payload);
            applyAvatarUrlsToStacks();
            initSiteAnalytics(payload);
        }

        function prefersReducedMotion() {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }

        document.addEventListener('DOMContentLoaded', async function () {
            siteLocale = await resolveSiteLocale();
            await loadSiteConfig();
            renderSocialIcons({ links: siteSocialLinks, uiMessage, copyTextToClipboard, showMailToast, bindMailtoClick: function (anchor, href) { bindMailtoClick(anchor, href, { uiMessage }); }, socialSvgXhs: SOCIAL_SVG_XHS });

            startAnimationSequence({
                getHeaderAvatarSlotRect,
                syncAvatarBadgeGeometry,
                renderCards: function () { renderCards(renderCardsOptions()); },
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
                    updateQuote(true);
                    scheduleQuoteAutoRotate();
                }
            });
            scheduleQuoteAutoRotate();

            var badgeGeomResizeTimer;
            window.addEventListener('resize', function () {
                clearTimeout(badgeGeomResizeTimer);
                badgeGeomResizeTimer = setTimeout(function () {
                    syncAvatarBadgeGeometry();
                    if (mainIntroAnimComplete) renderPresenceBadge();
                }, 120);
            });
        });


