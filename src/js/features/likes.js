/** Homepage like counter and analytics integration. */
const LIKE_STORAGE_KEY = 'homepage-liked-v1';
const LIKE_TOTAL_LS_KEY = 'homepage-like-total-v1';
const LIKE_VISITOR_LS_KEY = 'homepage-visitor-id-v1';
const ABACUS_API_BASE = 'https://abacus.jasoncameron.dev';

        function getOrCreateVisitorId() {
            try {
                var id = localStorage.getItem(LIKE_VISITOR_LS_KEY);
                if (id) return id;
                id =
                    'v-' +
                    Date.now().toString(36) +
                    '-' +
                    Math.random().toString(36).slice(2, 10);
                localStorage.setItem(LIKE_VISITOR_LS_KEY, id);
                return id;
            } catch (e) {
                return 'v-anon';
            }
        }

        function readLocalLikeTotal(storageKey) {
            try {
                var raw = localStorage.getItem(storageKey || LIKE_TOTAL_LS_KEY);
                var n = parseInt(raw, 10);
                return isNaN(n) || n < 0 ? 0 : n;
            } catch (e) {
                return 0;
            }
        }

        function writeLocalLikeTotal(count, storageKey) {
            try {
                localStorage.setItem(storageKey || LIKE_TOTAL_LS_KEY, String(Math.max(0, count)));
            } catch (e) {}
        }

        function abacusGet(namespace, key) {
            var url =
                ABACUS_API_BASE +
                '/get/' +
                encodeURIComponent(namespace) +
                '/' +
                encodeURIComponent(key);
            return fetch(url, { cache: 'no-store' })
                .then(function (res) {
                    if (res.status === 404) return { __missing: true };
                    if (!res.ok) return null;
                    return res.json();
                })
                .then(function (data) {
                    if (data && data.__missing) return null;
                    return data && typeof data.value === 'number' ? data.value : null;
                })
                .catch(function () {
                    return null;
                });
        }

        function abacusHit(namespace, key) {
            var url =
                ABACUS_API_BASE +
                '/hit/' +
                encodeURIComponent(namespace) +
                '/' +
                encodeURIComponent(key);
            return fetch(url, { cache: 'no-store' })
                .then(function (res) {
                    if (!res.ok) return null;
                    return res.json();
                })
                .then(function (data) {
                    return data && typeof data.value === 'number' ? data.value : null;
                })
                .catch(function () {
                    return null;
                });
        }

        function abacusGetWithRetry(namespace, key, retriesLeft, missingOk) {
            return abacusGet(namespace, key).then(function (val) {
                if (val !== null) return val;
                if (missingOk) return null;
                if (retriesLeft <= 0) return null;
                return new Promise(function (resolve) {
                    window.setTimeout(resolve, 450);
                }).then(function () {
                    return abacusGetWithRetry(namespace, key, retriesLeft - 1, false);
                });
            });
        }

        function abacusHitWithRetry(namespace, key, retriesLeft) {
            return abacusHit(namespace, key).then(function (val) {
                if (val !== null) return val;
                if (retriesLeft <= 0) return null;
                return new Promise(function (resolve) {
                    window.setTimeout(resolve, 450);
                }).then(function () {
                    return abacusHitWithRetry(namespace, key, retriesLeft - 1);
                });
            });
        }

        function resolveLikeProvider(likesCfg) {
            var p = likesCfg && typeof likesCfg.provider === 'string' ? likesCfg.provider.toLowerCase() : '';
            if (p === 'local') return 'local';
            if (p === 'abacus' || p === 'remote') return 'abacus';
            if (p === 'countapi') return 'abacus';
            return 'abacus';
        }

        function likeAbacusKeys(likesCfg, visitorId) {
            var ns =
                (likesCfg && likesCfg.abacusNamespace) ||
                (likesCfg && likesCfg.countApiNamespace) ||
                'abcreatoris.com';
            var prefix =
                likesCfg && typeof likesCfg.likedVisitorKeyPrefix === 'string'
                    ? likesCfg.likedVisitorKeyPrefix
                    : 'liked-';
            var totalKey = (likesCfg && likesCfg.totalLikesKey) || 'total-likes';
            return {
                ns: ns,
                visitorKey: prefix + visitorId,
                totalKey: totalKey
            };
        }

        function fetchLikeTotal(likesCfg) {
            var provider = resolveLikeProvider(likesCfg);
            var localKey =
                likesCfg && typeof likesCfg.localTotalKey === 'string'
                    ? likesCfg.localTotalKey
                    : LIKE_TOTAL_LS_KEY;
            if (provider === 'local') {
                return Promise.resolve(readLocalLikeTotal(localKey));
            }
            var keys = likeAbacusKeys(likesCfg, '');
            return abacusGetWithRetry(keys.ns, keys.totalKey, 2).then(function (val) {
                if (typeof val === 'number' && val >= 0) {
                    writeLocalLikeTotal(val, localKey);
                    return val;
                }
                return null;
            });
        }

        function fetchVisitorLikedOnServer(likesCfg, visitorId) {
            var keys = likeAbacusKeys(likesCfg, visitorId);
            var likedKey = LIKE_STORAGE_KEY + '-' + visitorId;
            try {
                if (
                    localStorage.getItem(LIKE_STORAGE_KEY) !== '1' &&
                    localStorage.getItem(likedKey) !== '1'
                ) {
                    return Promise.resolve(false);
                }
            } catch (e) {}
            return abacusGetWithRetry(keys.ns, keys.visitorKey, 0, true).then(function (val) {
                return typeof val === 'number' && val >= 1;
            });
        }

        /** 首次点赞：登记访客 + 全局总数 +1；已登记则只拉取总数 */
        function registerLikeOnServer(likesCfg, visitorId) {
            var provider = resolveLikeProvider(likesCfg);
            var localKey =
                likesCfg && typeof likesCfg.localTotalKey === 'string'
                    ? likesCfg.localTotalKey
                    : LIKE_TOTAL_LS_KEY;
            if (provider === 'local') {
                var next = readLocalLikeTotal(localKey) + 1;
                writeLocalLikeTotal(next, localKey);
                return Promise.resolve(next);
            }
            var keys = likeAbacusKeys(likesCfg, visitorId);
            var likedKey = LIKE_STORAGE_KEY + '-' + visitorId;
            var locallyMarked = false;
            try {
                locallyMarked =
                    localStorage.getItem(LIKE_STORAGE_KEY) === '1' ||
                    localStorage.getItem(likedKey) === '1';
            } catch (e) {}

            var registerPromise;
            if (locallyMarked) {
                registerPromise = abacusGetWithRetry(keys.ns, keys.visitorKey, 0, true).then(function (marked) {
                    var already = typeof marked === 'number' && marked >= 1;
                    if (already) {
                        return abacusGetWithRetry(keys.ns, keys.totalKey, 2);
                    }
                    return abacusHitWithRetry(keys.ns, keys.visitorKey, 2).then(function () {
                        return abacusHitWithRetry(keys.ns, keys.totalKey, 2);
                    });
                });
            } else {
                registerPromise = abacusHitWithRetry(keys.ns, keys.visitorKey, 2).then(function () {
                    return abacusHitWithRetry(keys.ns, keys.totalKey, 2);
                });
            }

            return registerPromise.then(function (val) {
                if (typeof val === 'number' && val >= 0) {
                    writeLocalLikeTotal(val, localKey);
                    return val;
                }
                return null;
            });
        }

        /** ≥1万：X.Yw；整数部分为两位数（10–99）时不显示小数 */
        function formatLikeCountDisplay(count) {
            if (typeof count !== 'number' || count < 0) return '';
            if (count < 10000) return String(count);

            var value = count / 10000;
            var rounded = Math.round(value * 10) / 10;
            var x = Math.floor(rounded);

            if (x >= 10 && x <= 99) {
                return String(x) + 'w';
            }

            var y = Math.round((rounded - x) * 10);
            if (y === 0) {
                return String(x) + 'w';
            }
            return String(x) + '.' + String(y) + 'w';
        }

        function formatLikeHoverHint(ui, count, liked) {
            var n = typeof count === 'number' && count >= 0 ? count : null;
            if (n === null || n < 1) {
                if (liked) {
                    return ui && ui.likeHoverHint ? ui.likeHoverHint.split('{count}').join('…') : '点赞数同步中…';
                }
                return ui && ui.likeHoverHintEmpty ? ui.likeHoverHintEmpty : '期待你的点赞';
            }
            var tpl = ui && ui.likeHoverHint ? ui.likeHoverHint : '已有{count}位访客点赞';            return tpl.split('{count}').join(formatLikeCountDisplay(n));
        }

        function setHeroLikeUi(btn, countEl, liked, count, ui) {
            if (!btn) return;
            var n = typeof count === 'number' && count >= 0 ? count : null;

            btn.classList.toggle('is-liked', liked);
            btn.setAttribute('aria-pressed', liked ? 'true' : 'false');

            var hintText = formatLikeHoverHint(ui, n, liked);
            btn.setAttribute('title', hintText);

            btn.setAttribute(
                'aria-label',
                liked
                    ? (ui && ui.likeAriaLabelActive ? ui.likeAriaLabelActive : '已点赞') +
                      (n !== null && n > 0 ? '，' + hintText : '')
                    : ui && ui.likeAriaLabel
                      ? ui.likeAriaLabel
                      : '点赞'
            );

            if (countEl) {
                if (liked && n !== null && n > 0) {
                    countEl.textContent = formatLikeCountDisplay(n);
                    countEl.removeAttribute('aria-hidden');
                } else {
                    countEl.textContent = '';
                    countEl.setAttribute('aria-hidden', 'true');
                }
            }
        }

        function initHeroLike(likesCfg, ui) {
            if (!likesCfg || !likesCfg.enabled) return;

            var btn = document.getElementById('hero-like-btn');
            var countEl = document.getElementById('hero-like-count');
            if (!btn) return;

            var currentLikeCount = null;
            var visitorId = getOrCreateVisitorId();
            var likedKey = LIKE_STORAGE_KEY + '-' + visitorId;
            var liked = false;
            var ready = false;

            btn.removeAttribute('hidden');
            btn.disabled = true;
            setHeroLikeUi(btn, countEl, false, null, ui);

            function markLikedLocal() {
                try {
                    localStorage.setItem(LIKE_STORAGE_KEY, '1');
                    localStorage.setItem(likedKey, '1');
                } catch (e) {}
            }

            function applyLikedState() {
                setHeroLikeUi(btn, countEl, true, currentLikeCount, ui);
                markLikedLocal();
            }

            function refreshTotalCount() {
                return fetchLikeTotal(likesCfg).then(function (val) {
                    if (typeof val === 'number' && val >= 0) {
                        currentLikeCount = val;
                    }
                    setHeroLikeUi(btn, countEl, liked, currentLikeCount, ui);
                });
            }

            function finishBootstrap() {
                ready = true;
                if (!liked) btn.disabled = false;
            }

            var localLiked = false;
            try {
                localLiked =
                    localStorage.getItem(LIKE_STORAGE_KEY) === '1' ||
                    localStorage.getItem(likedKey) === '1';
            } catch (e) {}

            if (resolveLikeProvider(likesCfg) === 'local') {
                if (localLiked) {
                    liked = true;
                    currentLikeCount = readLocalLikeTotal(
                        likesCfg.localTotalKey || LIKE_TOTAL_LS_KEY
                    );
                    applyLikedState();
                }
                finishBootstrap();
                return;
            }

            Promise.all([fetchVisitorLikedOnServer(likesCfg, visitorId), refreshTotalCount()])
                .then(function (results) {
                    if (localLiked || results[0]) {
                        liked = true;
                        applyLikedState();
                        if (typeof currentLikeCount !== 'number') {
                            return refreshTotalCount();
                        }
                    }
                })
                .finally(finishBootstrap);

            btn.addEventListener('click', function () {
                if (!ready || liked) return;
                btn.disabled = true;

                registerLikeOnServer(likesCfg, visitorId).then(function (val) {
                    liked = true;
                    if (typeof val === 'number' && val >= 0) {
                        currentLikeCount = val;
                    }
                    applyLikedState();
                    if (typeof currentLikeCount !== 'number') {
                        return refreshTotalCount();
                    }
                });
            });
        }

        export function initSiteAnalytics(data) {
            var analytics = data && data.analytics;
            if (!analytics) return;
            initHeroLike(analytics.likes, data.ui);
        }

