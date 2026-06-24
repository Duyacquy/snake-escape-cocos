import { _decorator, Component, Node, Label, director, Vec3, tween, math } from 'cc';
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

    private auraOpacityTarget: number = 0;
    private auraCurrentOpacity: number = 0;
    private readonly AURA_FADE_SPEED: number = 2;
    private auraHoldTimer: number = 0;

    public get isGamePaused(): boolean {
        return this._isPaused;
    }

    protected onLoad() {
        TimeManager.Instance = this;
        
        // Lưu lại kích thước scale ban đầu của các nút cấu hình trong Editor
        if (this.pauseButton) this.pauseOriginalScale = this.pauseButton.getScale();
        if (this.replayButton) this.replayOriginalScale = this.replayButton.getScale();
        if (this.iconSnakeNode) this.iconSnakeOriginalScale = this.iconSnakeNode.getScale();

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

        // Bật active ngay lập tức
        this.redAuraNode.active = true;
        
        // Chớp sáng rực lên mức mong muốn ngay từ khung hình đầu tiên (ví dụ: 180/255 để nhìn xuyên ma trận lưới)
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
            if (this.currentTime <= 0) {
                this.currentTime = 0;
                this._isTimerStarted = false;
                this.onTimeOut();
            }
            this.updateLabelDisplay();
        }
    }

    private onBtnPress(btnNode: Node, originalScale: Vec3) {
        tween(btnNode).stop();
        const targetScale = new Vec3(originalScale.x * this.pressedScaleFactor, originalScale.y * this.pressedScaleFactor, 1);
        tween(btnNode).to(0.05, { scale: targetScale }, { easing: 'sineOut' }).start();
    }

    private onBtnRelease(btnNode: Node, originalScale: Vec3, callback: Function) {
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
        this.escapedSnakes = 0;
        this.updateIconSnakeDisplay();
        this.updateLabelDisplay();
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
        console.log("🎉 [TimeManager]: CHIẾN THẮNG! Bạn đã giải thoát toàn bộ số rắn trên sàn. Hiện Win Panel tại đây!");
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
        console.log("🚫 [TimeManager]: HẾT GIỜ! Hiển thị bảng Result ở đây.");
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