/** Avatar click speech-bubble animation and its keyboard interaction. */
export function createAvatarFlairController({ getPhrases, prefersReducedMotion, isIntroComplete }) {
    let avatarFlairHideTimer = null;
    let avatarTapPhraseIndex = 0;
    let headerFlairDistortRaf = null;
    let lastHeaderFlairShiftRem = null;
    const HEADER_FLAIR_DISTORT = {
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
    function segmentHeaderFlairGlyphs(text) {
        const hasCjk = /[\\u3040-\\u30ff\\u3400-\\u9fff\\uf900-\\ufaff]/.test(text);
        const segments = [];
        if (hasCjk) {
            for (const ch of text) segments.push({ text: ch, animate: !/\\s/.test(ch) });
        } else {
            text.split(/(\\s+)/).forEach(function (part) {
                if (!part) return;
                segments.push({ text: part, animate: !/^\\s+$/.test(part) });
            });
        }
        return segments;
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
            var segments = segmentHeaderFlairGlyphs(text);
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
            var list = getPhrases();
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
                if (!isIntroComplete()) return;
                playAvatarFlair();
            });
            wrap.addEventListener('keydown', function (e) {
                if (!isIntroComplete()) return;
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                playAvatarFlair();
            });
        }


    return { bindHeaderAvatarInteractions, playAvatarFlair };
}
