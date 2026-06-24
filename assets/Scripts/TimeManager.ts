import { _decorator, Component, Node, Label, director, Vec3, tween } from 'cc';
const { ccclass, property } = _decorator;

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

    private isAuraBlinking: boolean = false;
    private auraBlinkTimer: number = 0;
    private auraBlinkCount: number = 0;
    
    private readonly MAX_BLINKS: number = 4;       // Số lần chớp tắt (4 lần bật/tắt)
    private readonly BLINK_INTERVAL: number = 0.05;

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

    protected onDestroy() {
        if (this.pauseButton) {
            this.pauseButton.targetOff(this);
        }
        if (this.replayButton) {
            this.replayButton.targetOff(this);
        }
    }

    public playRedAura() {
        if (!this.redAuraNode) return;

        const uiOpacity = this.redAuraNode.getComponent('cc.UIOpacity') || this.redAuraNode.addComponent('cc.UIOpacity' as any);
        if (!uiOpacity) return;

        this.redAuraNode.active = true;
        
        // Bật thẳng lên độ tỏ mong muốn ngay lập tức (Chớp sáng ngay khi va chạm)
        this.auraCurrentOpacity = 180; // Độ sáng tối đa (0 - 255)
        (uiOpacity as any).opacity = this.auraCurrentOpacity;
        
        // Đặt mục tiêu tiếp theo là giữ nguyên (hoặc giảm nhẹ)
        this.auraOpacityTarget = 180;
        console.log("🔥 [Aura]: Đã kích hoạt chớp đỏ màn hình!");
    }

    /**
     * Làm mờ và ẩn hiệu ứng đỏ màn hình khi rắn đã lùi về an toàn
     */
    public hideRedAura() {
        // Đặt mục tiêu biến mất về 0
        this.auraOpacityTarget = 0;
    }

    public playRedAura() {
        if (!this.redAuraNode) return;

        // Bật cờ hiệu cho phép hệ thống update bắt đầu chớp nháy
        this.isAuraBlinking = true;
        this.auraBlinkTimer = 0;
        this.auraBlinkCount = 0;
        
        // Phát phát đầu tiên: Bật lên ngay lập tức
        this.redAuraNode.active = true;

        // Thêm một chút Tween Scale nhẹ khung viền UI cho có độ nẩy
        tween(this.redAuraNode)
            .stop()
            .to(0.05, { scale: new Vec3(1.05, 1.05, 1) })
            .to(0.05, { scale: new Vec3(1.0, 1.0, 1) })
            .start();

        console.log("⚡ [Aura]: Kích hoạt hiệu ứng chớp Flash toàn màn hình!");
    }

    /**
     * Hàm hide cũ bây giờ chỉ cần làm nhiệm vụ dọn dẹp phòng hờ 
     * vì hiệu ứng chớp nháy mới sẽ TỰ ĐỘNG TẮT sau khi chớp đủ số lần
     */
    public hideRedAura() {
        // Nếu rắn đã lùi về xong mà hiệu ứng vẫn đang nhấp nháy thì ép tắt hẳn
        this.isAuraBlinking = false;
        if (this.redAuraNode) {
            this.redAuraNode.active = false;
        }
    }

    protected update(dt: number) {
        // 🌟 ĐƯA LOGIC CHỚP FLASH LÊN ĐẦU HÀM UPDATE
        if (this.isAuraBlinking && this.redAuraNode) {
            this.auraBlinkTimer += dt;

            if (this.auraBlinkTimer >= this.BLINK_INTERVAL) {
                this.auraBlinkTimer = 0;
                
                // Đảo ngược trạng thái active (Đang bật -> Tắt, Đang tắt -> Bật)
                this.redAuraNode.active = !this.redAuraNode.active;
                this.auraBlinkCount++;

                // Khi đã chớp đủ số lần quy định thì tự động dừng lại và ẩn hẳn
                if (this.auraBlinkCount >= this.MAX_BLINKS) {
                    this.isAuraBlinking = false;
                    this.redAuraNode.active = false;
                    console.log("❄️ [Aura]: Hoàn thành chu kỳ chớp Flash.");
                }
            }
        }

        // --- ĐIỀU KIỆN RÀO CỦA ĐỒNG HỒ GỐC (Giữ nguyên phía dưới) ---
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
        
        const targetScale = new Vec3(
            originalScale.x * this.pressedScaleFactor,
            originalScale.y * this.pressedScaleFactor,
            1
        );

        tween(btnNode)
            .to(0.05, { scale: targetScale }, { easing: 'sineOut' })
            .start();
    }

    private onBtnRelease(btnNode: Node, originalScale: Vec3, callback: Function) {
        tween(btnNode).stop();

        tween(btnNode)
            .to(0.08, { scale: originalScale }, { easing: 'sineOut' })
            .call(() => {
                // Sau khi hoàn thành hành trình đàn hồi thì mới kích hoạt logic xử lý của nút
                callback.call(this);
            })
            .start();
    }

    private onBtnCancel(btnNode: Node, originalScale: Vec3) {
        tween(btnNode).stop();
        tween(btnNode)
            .to(0.08, { scale: originalScale }, { easing: 'sineOut' })
            .start();
    }

    public resetTimer() {
        this.currentTime = this.totalTime;
        this._isTimerStarted = false;
        this._isPaused = false;
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
        // ToDo: Kích hoạt UI Win Panel của bạn hiện lên ở đây
    }

    public startTimer() {
        if (this._isTimerStarted) return; 
        this._isTimerStarted = true;
        console.log("⏰ [TimeManager]: Người chơi đã đi nước đầu tiên. Đồng hồ bắt đầu chạy!");
    }

    // protected update(dt: number) {
    //     if (!this._isTimerStarted || this._isPaused) return;

    //     if (this.currentTime > 0) {
    //         this.currentTime -= dt;
    //         if (this.currentTime <= 0) {
    //             this.currentTime = 0;
    //             this._isTimerStarted = false;
    //             this.onTimeOut();
    //         }
    //         this.updateLabelDisplay();
    //     }
    // }

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
        
        const currentSceneName = director.getScene()?.name;
        if (currentSceneName) {
            director.loadScene(currentSceneName);
        }
    }
}