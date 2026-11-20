/** Coordinate the original homepage intro sequence without owning page state. */
export function startAnimationSequence({
    getHeaderAvatarSlotRect,
    syncAvatarBadgeGeometry,
    renderCards,
    renderCardsOptions,
    updateQuote,
    onMainIntroAnimationsComplete
}) {
            // 获取相关元素
            const initialLayout = document.getElementById('initial-layout');
            const mainContent = document.getElementById('main-content');
            const avatarTransition = document.getElementById('avatar-transition');
            const initialAvatar = document.querySelector('.initial-avatar');
            
            // 获取初始头像位置和大小
            const initialAvatarRect = initialAvatar.getBoundingClientRect();
            
            // 设置过渡头像的初始位置和大小
            avatarTransition.style.width = initialAvatarRect.width + 'px';
            avatarTransition.style.height = initialAvatarRect.height + 'px';
            avatarTransition.style.left = initialAvatarRect.left + 'px';
            avatarTransition.style.top = initialAvatarRect.top + 'px';
            avatarTransition.classList.remove('hidden');
            
            // 1. 初始布局淡出
            setTimeout(() => {
                initialLayout.classList.add('minimized');
                
                // 2. 头像动画过渡到最终位置（按 header 槽位实时测量，避免移动端写死 160px 错位）
                setTimeout(() => {
                    const finalSlotRect = getHeaderAvatarSlotRect();
                    if (!finalSlotRect) return;
                    avatarTransition.style.width = finalSlotRect.width + 'px';
                    avatarTransition.style.height = finalSlotRect.height + 'px';
                    avatarTransition.style.left = finalSlotRect.left + 'px';
                    avatarTransition.style.top = finalSlotRect.top + 'px';
                    
                    // 3. 显示主内容区域
                    setTimeout(() => {
                        mainContent.classList.add('show');
                        
                        // 4. 隐藏过渡头像并显示最终头像
                        setTimeout(() => {
                            avatarTransition.classList.add('hidden');
                            syncAvatarBadgeGeometry();

                            // 5. 先显示社交图标
                            setTimeout(() => {
                                const socialIcons = document.querySelectorAll('.social-icon');
                                socialIcons.forEach((icon, index) => {
                                    setTimeout(() => {
                                        icon.classList.add('show');
                                    }, index * 200);
                                });

                                // 6. 正文文字链接 → 引言
                                const cardsReveal = Math.max(420, socialIcons.length * 200 + 200);
                                setTimeout(function () {
                                    renderCards({ links: siteContentLinks, bindMailtoClick: function (anchor, href) { bindMailtoClick(anchor, href, { uiMessage }); } });
                                }, cardsReveal);

                                const quoteDelay = Math.max(620, socialIcons.length * 200 + 520);
                                setTimeout(() => {
                                    quoteController.update(false);
                                    document.getElementById('quote-container').classList.add('show');
                                    setTimeout(onMainIntroAnimationsComplete, 900);
                                }, quoteDelay);
                            }, 500);
                        }, 800);
                    }, 800);
                }, 800);
            }, 1500);

}
