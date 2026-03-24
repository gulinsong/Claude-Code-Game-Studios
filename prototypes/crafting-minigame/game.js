// PROTOTYPE - NOT for production
// Question: 迷你游戏的操作手感是否有趣？玩家是否能在短时间内理解操作？
// Date: 2026-03-24

/**
 * 手工艺迷你游戏原型 - 做月饼
 * 验证核心假设：操作是否有趣？玩家能否快速理解？
 */

class CraftingGame {
    constructor() {
        // 游戏状态
        this.currentStage = 0; // 0=开始, 1=揉面, 2=包馅, 3=压模
        this.stageProgress = 0;
        this.startTime = 0;
        this.totalTime = 0;

        // 阶段配置
        this.stages = [
            {
                name: '揉面',
                instruction: '快速点击屏幕！',
                targetClicks: 10,
                duration: 3000
            },
            {
                name: '包馅',
                instruction: '拖拽馅料到面皮中心，然后点击包裹',
                targetAccuracy: 80,
                duration: 5000
            },
            {
                name: '压模',
                instruction: '点击选择正确的模具图案',
                options: ['🌸', '🌕', '🏮'],
                correctIndex: 1,
                duration: 4000
            }
        ];

        // UI 元素
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.stageIndicator = document.getElementById('stage-indicator');
        this.instructionText = document.getElementById('instruction-text');
        this.gameArea = document.getElementById('game-area');
        this.progressBar = document.getElementById('progress-bar');
        this.moldContainer = document.getElementById('mold-container');
        this.resultScreen = document.getElementById('result-screen');
        this.resultMooncake = document.getElementById('result-mooncake');
        this.timeSpent = document.getElementById('time-spent');
        this.accuracyDisplay = document.getElementById('accuracy');
        this.retryBtn = document.getElementById('retry-btn');

        this.init();
    }

    init() {
        // 开始界面点击
        document.addEventListener('click', () => {
            if (this.currentStage === 0) {
                this.startGame();
            }
        });

        // 重试按钮
        this.retryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.reset();
            });

        // 游戏区域点击（用于揉面阶段）
        this.gameArea.addEventListener('click', (e) => {
                if (this.currentStage === 1) {
                    this.handleKneadingClick();
                this.createTapFeedback(e.clientX, e.clientY);
                this.createParticle(e.clientX, e.clientY);
            }
        });

        // 拖拽相关变量
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.fillingElement = null;

        // 游戏区域触摸事件（用于包馅阶段）
        this.gameArea.addEventListener('touchstart', (e) => {
            if (this.currentStage === 2) {
                    this.isDragging = true;
                    const touch = e.touches[0];
                    this.dragStartX = touch.clientX;
                    this.dragStartY = touch.clientY;
                    this.createFilling(touch.clientX, touch.clientY);
                }
            });
        });

        this.gameArea.addEventListener('touchmove', (e) => {
                if (this.currentStage === 2 && this.isDragging && this.fillingElement) {
                    const touch = e.touches[0];
                    const x = touch.clientX - this.gameArea.offsetLeft;
                    const y = touch.clientY - this.gameArea.offsetTop;
                    this.fillingElement.style.left = x + 'px';
                    this.fillingElement.style.top = y + 'px';
                }
            });
        });

        this.gameArea.addEventListener('touchend', (e) => {
                if (this.currentStage === 2 && this.isDragging && this.fillingElement) {
                    this.isDragging = false;
                    const touch = e.touches[0];
                    const x = touch.clientX - this.gameArea.offsetLeft;
                    const y = touch.clientY - this.gameArea.offsetTop;

                    // 检查是否放在中心区域
                    const centerX = this.gameArea.offsetWidth / 2;
                    const centerY = this.gameArea.offsetHeight / 2;
                    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

                    if (distance < 50) {
                        // 放置成功
                        this.fillingElement.style.left = centerX + 'px';
                        this.fillingElement.style.top = centerY + 'px';
                        this.showSuccess('放置正确！');
                        setTimeout(() => {
                            this.fillingElement.remove();
                            this.fillingElement = null;
                            this.nextStage();
                        }, 500);
                    } else {
                        // 需要继续拖动
                        this.fillingElement.style.opacity = '0.5';
                        setTimeout(() => {
                            if (this.fillingElement) {
                                this.fillingElement.style.opacity = '1';
                            }
                        }, 100);
                    }
                }
            });
        });

        // 模具选择
        this.moldContainer.addEventListener('click', (e) => {
            if (this.currentStage === 3) {
                const target = e.target;
                if (target.classList.contains('mold')) {
                    const index = parseInt(target.dataset.index);
                    this.selectMold(index);
                }
            }
        });
    }

    startGame() {
        this.currentStage = 1;
        this.stageProgress = 0;
        this.startTime = Date.now();
        this.startScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.updateStageUI();
    }

    updateStageUI() {
        const stage = this.stages[this.currentStage - 1];
        this.stageIndicator.innerHTML = `阶段 ${this.currentStage}/3: ${stage.name}`;
        this.instructionText.textContent = stage.instruction;

        // 清理游戏区域
        this.gameArea.innerHTML = '';
        this.progressBar.style.width = '0%';

        // 根据阶段设置 UI
        if (this.currentStage === 3) {
            this.moldContainer.classList.remove('hidden');
            this.createMolds();
        } else {
            this.moldContainer.classList.add('hidden');
        }
    }

    handleKneadingClick() {
        this.stageProgress++;
        this.progressBar.style.width = `${(this.stageProgress / 10) * 100}%`;

        if (this.stageProgress >= 10) {
            this.nextStage();
        }
    }

    createFilling(x, y) {
                this.fillingElement = document.createElement('div');
                this.fillingElement.className = 'filling';
                this.fillingElement.style.left = x + 'px';
                this.fillingElement.style.top = y + 'px';
                this.fillingElement.textContent = '🫘';
                this.gameArea.appendChild(this.fillingElement);
            }

    createMolds() {
                this.moldContainer.innerHTML = '';
                const options = this.stages[2].options;
                options.forEach((emoji, index) => {
                    const mold = document.createElement('div');
                    mold.className = 'mold';
                    mold.dataset.index = index;
                    mold.textContent = emoji;
                    this.moldContainer.appendChild(mold);
                });
            }

    selectMold(index) {
                const correctIndex = this.stages[2].correctIndex;
                const molds = this.moldContainer.querySelectorAll('.mold');

                molds.forEach((m, i) => {
                    if (i === index) {
                        if (i === correctIndex) {
                            m.style.background = '#4CAF50';
                            this.showSuccess('正确！');
                        } else {
                            m.style.background = '#f44336';
                            this.showFail('图案不对！');
                        }
                    }
                });

                setTimeout(() => {
                    this.nextStage();
                }, 500);
            }

    nextStage() {
                this.currentStage++;
                this.stageProgress = 0;

                if (this.currentStage > 3) {
                    this.endGame();
                } else {
                    this.updateStageUI();
                }
            }

    endGame() {
                this.totalTime = (Date.now() - this.startTime) / 1000;
                this.gameScreen.classList.add('hidden');
                this.resultScreen.classList.remove('hidden');
                this.timeSpent.textContent = (this.totalTime / 1000).toFixed(1);
                this.accuracyDisplay.textContent = '100';

                // 创建月饼动画
                this.resultMooncake.style.animation = 'bounce 0.5s ease';
            }

    reset() {
                this.currentStage = 0;
                this.stageProgress = 0;
                this.startTime = 0;
                this.totalTime = 0;
                this.resultScreen.classList.add('hidden');
                this.startScreen.classList.remove('hidden');
            }

    createTapFeedback(x, y) {
                const feedback = document.createElement('div');
                feedback.className = 'tap-feedback';
                feedback.style.left = x + 'px';
                feedback.style.top = y + 'px';
                feedback.textContent = '+1';
                document.body.appendChild(feedback);
                setTimeout(() => feedback.remove(), 500);
            }

    createParticle(x, y) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = x + 'px';
                particle.style.top = y + 'px';
                document.body.appendChild(particle);
            }

    showSuccess(text) {
                const feedback = document.createElement('div');
                feedback.className = 'tap-feedback';
                feedback.style.left = '50%';
                feedback.style.top = '50%';
                feedback.style.transform = 'translate(-50%, -50%)';
                feedback.textContent = text;
                document.body.appendChild(feedback);
                setTimeout(() => feedback.remove(), 500);
            }

    showFail(text) {
                const feedback = document.createElement('div');
                feedback.className = 'tap-feedback';
                feedback.style.left = '50%';
                feedback.style.top = '50%';
                feedback.style.transform = 'translate(-50%, -50%)';
                feedback.style.background = '#f44336';
                feedback.textContent = text;
                document.body.appendChild(feedback);
                setTimeout(() => feedback.remove(), 500);
            }
        }

        // 启动游戏
        const game = new CraftingGame();
