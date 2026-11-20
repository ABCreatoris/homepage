/** Avatar media loading and avatar/presence config normalization. */
export function createAvatarFeature({ prefersReducedMotion }) {
    let siteAvatarMedia = null;
    let siteAvatarTap = { bubbles: [] };
    let sitePresence = null;
    let avatarMediaAppliedKey = '';

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


    return {
        ingestAvatarExtensions,
        applyAvatarUrlsToStacks,
        get avatarMedia() { return siteAvatarMedia; },
        get avatarTap() { return siteAvatarTap; },
        get presence() { return sitePresence; }
    };
}
