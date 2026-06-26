import { _decorator, Component, Node, Label, director, Vec3, tween, math, Color, Widget } from 'cc'; // 🔥 Đã thêm Color vào import
import { LossPanelManager, LossReason } from './LossPanelManager';
import { AudioManager } from './AudioManager';
import { WinPanelManager } from './WinPanelManager';

const { ccclass, property } = _decorator;

enum AuraState {
    NONE,
    FADE_IN,
    HOLD,
    FADE_OUT
}

@ccclass('TimeManager')
export class TimeManager extends Component {
    public static Instance: TimeManager = null!;

    @property(Label)
    private playtimeLabel: Label = null!;

    @property(Node)
    private playtimeIcon: Node = null!;

    @property(Node)
    private playtimeContainer: Node = null!;

    @property(Node)
    private pauseButton: Node = null!;

    @property(Node)
    private replayButton: Node = null!;

    @property(Node)
    private iconSnakeNode: Node = null!;

    @property(Label)
    private iconSnakeLabel: Label = null!;

    @property({ displayName: "Tỉ lệ thu nhỏ nút", min: 0.1, max: 1.0 })
    private pressedScaleFactor: number = 0.95;

    @property({ displayName: "Tỉ lệ phóng to chữ"})
    private zoomScale: number = 1.25;

    @property({ type: Color, displayName: "Màu chữ khi sắp hết giờ" })
    private dangerColor: Color = new Color(255, 120, 120);

    @property({ displayName: "Tỉ lệ phóng đại nhịp giây", min: 1.0, max: 2.0 })
    private pulseZoomScale: number = 1.2;

    @property({ type: Node, displayName: "Hiệu ứng Aura Đỏ" })
    private redAuraNode: Node = null!;

    private totalTime: number = 180; 
    private currentTime: number = 180;

    private totalSnakes: number = 42;
    private escapedSnakes: number = 0;
    
    private _isTimerStarted: boolean = false;
    private _isPaused: boolean = false;

    private pauseOriginalScale: Vec3 = new Vec3(1, 1, 1);
    private replayOriginalScale: Vec3 = new Vec3(1, 1, 1);
    private iconSnakeOriginalScale: Vec3 = new Vec3(1, 1, 1);

    private labelOriginalScale: Vec3 = new Vec3(1, 1, 1);
    private iconOriginalScale: Vec3 = new Vec3(1, 1, 1);
    private containerOriginalPos: Vec3 = new Vec3(0, 0, 0);
    private originalLabelColor: Color = Color.WHITE;
    private lastSecondsLeft: number = -1;

    private auraOpacityTarget: number = 0;
    private auraCurrentOpacity: number = 0;
    private readonly AURA_FADE_SPEED: number = 2;
    private auraHoldTimer: number = 0;

    public isGameOver: boolean = false;

    public get isGamePaused(): boolean {
        return this._isPaused;
    }

    protected onLoad() {
        TimeManager.Instance = this;
        
        // Lưu lại kích thước scale ban đầu của các nút cấu hình trong Editor
        if (this.pauseButton) this.pauseOriginalScale = this.pauseButton.getScale();
        if (this.replayButton) this.replayOriginalScale = this.replayButton.getScale();
        if (this.iconSnakeNode) this.iconSnakeOriginalScale = this.iconSnakeNode.getScale();

        if (this.playtimeLabel) {
            this.labelOriginalScale = this.playtimeLabel.node.getScale();
            this.originalLabelColor = this.playtimeLabel.color.clone(); // Copy màu chữ ban đầu (trắng/xanh...)
        }
        if (this.playtimeIcon) this.iconOriginalScale = this.playtimeIcon.getScale();
        if (this.playtimeContainer) this.containerOriginalPos = this.playtimeContainer.getPosition();

        if (this.redAuraNode) {
            this.redAuraNode.active = false;
        }

        // ĐĂNG KÝ SỰ KIỆN CHO NÚT PAUSE
        if (this.pauseButton) {
            this.pauseButton.on(Node.EventType.TOUCH_START, () => this.onBtnPress(this.pauseButton, this.pauseOriginalScale), this);
            this.pauseButton.on(Node.EventType.TOUCH_END, (event) => this.onBtnRelease(this.pauseButton, this.pauseOriginalScale, this.onPauseClicked), this);
            this.pauseButton.on(Node.EventType.TOUCH_CANCEL, () => this.onBtnCancel(this.pauseButton, this.pauseOriginalScale), this);
        }

        // ĐĂNG KÝ SỰ KIỆN CHO NÚT REPLAY
        if (this.replayButton) {
            this.replayButton.on(Node.EventType.TOUCH_START, () => this.onBtnPress(this.replayButton, this.replayOriginalScale), this);
            this.replayButton.on(Node.EventType.TOUCH_END, (event) => this.onBtnRelease(this.replayButton, this.replayOriginalScale, this.onReplayClicked), this);
            this.replayButton.on(Node.EventType.TOUCH_CANCEL, () => this.onBtnCancel(this.replayButton, this.replayOriginalScale), this);
        }

        this.resetTimer();
    }
    
    public playRedAura() {
        if (!this.redAuraNode) return;

        const uiOpacity = this.redAuraNode.getComponent('cc.UIOpacity') || this.redAuraNode.addComponent('cc.UIOpacity' as any);
        if (!uiOpacity) return;

        this.redAuraNode.active = true;
        this.auraCurrentOpacity = 255;
        (uiOpacity as any).opacity = this.auraCurrentOpacity;
        this.auraHoldTimer = 0.15;
        this.auraOpacityTarget = 255;
    }

    public hideRedAura() {
        this.auraOpacityTarget = 0;
    }

    protected update(dt: number) {
        if (this.redAuraNode && this.redAuraNode.active) {
            const uiOpacity = this.redAuraNode.getComponent('cc.UIOpacity');
            if (uiOpacity) {
                if (this.auraHoldTimer > 0) {
                    this.auraHoldTimer -= dt;
                    this.auraCurrentOpacity = 255;
                    (uiOpacity as any).opacity = 255;
                } else {
                    this.auraCurrentOpacity = math.lerp(this.auraCurrentOpacity, this.auraOpacityTarget, dt * this.AURA_FADE_SPEED);
                    (uiOpacity as any).opacity = this.auraCurrentOpacity;

                    if (this.auraOpacityTarget === 0 && this.auraCurrentOpacity < 2) {
                        this.redAuraNode.active = false;
                        (uiOpacity as any).opacity = 0;
                        this.auraCurrentOpacity = 0;
                    }
                }
            }
        }

        if (!this._isTimerStarted || this._isPaused) return;

        if (this.currentTime > 0) {
            this.currentTime -= dt;

            let secondsLeft = Math.floor(this.currentTime);
            
            if (secondsLeft <= 15 && this.currentTime > 0) {
                
                // Đổi chữ sang màu cấu hình từ Inspector thay vì ép chết Color.RED
                if (this.playtimeLabel && this.playtimeLabel.color !== this.dangerColor) {
                    this.playtimeLabel.color = this.dangerColor;
                }

                if (secondsLeft !== this.lastSecondsLeft) {
                    this.lastSecondsLeft = secondsLeft;
                    this.playTickPulseAnimation();

                    if (AudioManager.Instance) {
                        AudioManager.Instance.playSFX(AudioManager.Instance.seTickTock);
                    }
                }
            }

            if (this.currentTime <= 0) {
                this.currentTime = 0;
                this._isTimerStarted = false;
                this.onTimeOut();
            }
            this.updateLabelDisplay();
        }
    }

    private playTickPulseAnimation() {
        if (this.playtimeLabel) {
            tween(this.playtimeLabel.node)
                .stop()
                .to(0.12, { scale: new Vec3(this.labelOriginalScale.x * this.pulseZoomScale, this.labelOriginalScale.y * this.pulseZoomScale, 1) }, { easing: 'sineOut' })
                .to(0.15, { scale: this.labelOriginalScale }, { easing: 'sineIn' })
                .start();
        }

        if (this.playtimeIcon) {
            tween(this.playtimeIcon)
                .stop()
                .to(0.12, { scale: new Vec3(this.iconOriginalScale.x * this.pulseZoomScale, this.iconOriginalScale.y * this.pulseZoomScale, 1) }, { easing: 'sineOut' })
                .to(0.15, { scale: this.iconOriginalScale }, { easing: 'sineIn' })
                .start();
        }
    }

    private playContainerShakeAnimation() {
        if (!this.playtimeContainer) return;

        const widget = this.playtimeContainer.getComponent(Widget);
        if (widget) {
            widget.enabled = false;
        }

        tween(this.playtimeContainer).stop();
        this.playtimeContainer.setPosition(this.containerOriginalPos);

        const shakeIntensity = 6; 
        const shakeSpeed = 0.03;  
        
        const cycles = 16; 

        let shakeTween = tween(this.playtimeContainer);

        for (let i = 0; i < cycles; i++) {
            const currentIntensity = shakeIntensity * (1 - i / cycles); 

            shakeTween
                .to(shakeSpeed, { position: new Vec3(this.containerOriginalPos.x - currentIntensity, this.containerOriginalPos.y + currentIntensity, 0) })
                .to(shakeSpeed, { position: new Vec3(this.containerOriginalPos.x + currentIntensity, this.containerOriginalPos.y - currentIntensity, 0) })
                .to(shakeSpeed, { position: new Vec3(this.containerOriginalPos.x - currentIntensity * 0.7, this.containerOriginalPos.y - currentIntensity * 0.6, 0) })
                .to(shakeSpeed, { position: new Vec3(this.containerOriginalPos.x + currentIntensity * 0.7, this.containerOriginalPos.y + currentIntensity * 0.6, 0) });
        }

        shakeTween
            .to(shakeSpeed, { position: this.containerOriginalPos })
            .call(() => {
                if (widget) widget.enabled = true;
            })
            .start();
    }

    private onBtnPress(btnNode: Node, originalScale: Vec3) {
        tween(btnNode).stop();
        const targetScale = new Vec3(originalScale.x * this.pressedScaleFactor, originalScale.y * this.pressedScaleFactor, 1);
        tween(btnNode).to(0.05, { scale: targetScale }, { easing: 'sineOut' }).start();
    }

    private onBtnRelease(btnNode: Node, originalScale: Vec3, callback: Function) {
        if (AudioManager.Instance) {
            AudioManager.Instance.playSFX(AudioManager.Instance.seClick);
        }

        tween(btnNode).stop();
        tween(btnNode).to(0.08, { scale: originalScale }, { easing: 'sineOut' }).call(() => { callback.call(this); }).start();
    }

    private onBtnCancel(btnNode: Node, originalScale: Vec3) {
        tween(btnNode).stop();
        tween(btnNode).to(0.08, { scale: originalScale }, { easing: 'sineOut' }).start();
    }

    public resetTimer() {
        this.currentTime = this.totalTime;
        this._isTimerStarted = false;
        this._isPaused = false;
        this.isGameOver = false;
        this.escapedSnakes = 0;
        this.lastSecondsLeft = -1;

        if (this.playtimeLabel) {
            this.playtimeLabel.color = this.originalLabelColor;
            this.playtimeLabel.node.setScale(this.labelOriginalScale);
        }
        if (this.playtimeIcon) this.playtimeIcon.setScale(this.iconOriginalScale);
        if (this.playtimeContainer) this.playtimeContainer.setPosition(this.containerOriginalPos);

        this.updateIconSnakeDisplay();
        this.updateLabelDisplay();
    }

    public forceStopTimerOnGameOver() {
        this._isTimerStarted = false; 
        this.isGameOver = true;
    }

    private updateIconSnakeDisplay() {
        if (this.iconSnakeLabel) {
            this.iconSnakeLabel.string = `${this.escapedSnakes}/${this.totalSnakes}`;
        }
    }

    public addEscapedSnake() {
        this.escapedSnakes++;
        this.updateIconSnakeDisplay();

        if (this.iconSnakeNode) {
            tween(this.iconSnakeNode)
                .stop()
                .to(0.1, { scale: new Vec3(this.iconSnakeOriginalScale.x * this.zoomScale, this.iconSnakeOriginalScale.y * this.zoomScale, 1) }, { easing: 'sineOut' })
                .to(0.15, { scale: this.iconSnakeOriginalScale }, { easing: 'sineIn' })
                .start();
        }

        if (this.escapedSnakes >= this.totalSnakes) {
            this._isTimerStarted = false; 
            this.onGameWin();
        }
    }

    private onGameWin() {
        this.forceStopTimerOnGameOver();

        this.scheduleOnce(() => {
            if (WinPanelManager.Instance) {
                WinPanelManager.Instance.showWinPanel();
            }
        }, 0.8);
    }

    public startTimer() {
        if (this._isTimerStarted) return; 
        this._isTimerStarted = true;
        console.log("⏰ [TimeManager]: Người chơi đã đi nước đầu tiên. Đồng hồ bắt đầu chạy!");
    }

    private updateLabelDisplay() {
        if (!this.playtimeLabel) return;

        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);

        const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
        const strSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

        this.playtimeLabel.string = `${strMinutes}:${strSeconds}`;
    }

    private onTimeOut() {
        this.forceStopTimerOnGameOver();
        this.playContainerShakeAnimation();

        if (AudioManager.Instance) {
            AudioManager.Instance.playSFX(AudioManager.Instance.seTimeout);
        }

        this.scheduleOnce(() => {
            if (LossPanelManager.Instance) {
                LossPanelManager.Instance.showLossPanel(LossReason.OUT_OF_TIME);
            }
        }, 1);
    }

    private onPauseClicked() {
        if (!this._isTimerStarted) return; 

        this._isPaused = !this._isPaused;
        if (this._isPaused) {
            console.log("⏸️ [Game State]: Đã TẠM DỪNG trò chơi.");
        } else {
            console.log("▶️ [Game State]: TIẾP TỤC trò chơi.");
        }
    }

    private onReplayClicked() {
        console.log("🔄 [Game State]: Bấm chơi lại màn! Đang tải lại màn chơi...");
        this.resetTimer();
        director.loadScene("main");
    }
}