import { _decorator, Component, Node, Sprite, SpriteFrame, Label, tween, Vec3, director, UIOpacity } from 'cc';
import { TimeManager } from './TimeManager';
import { AudioManager } from './AudioManager';
const { ccclass, property } = _decorator;

// Định nghĩa 2 lý do thua cuộc bằng Enum
export enum LossReason {
    OUT_OF_LIVES, 
    OUT_OF_TIME
}

@ccclass('LossPanelManager')
export class LossPanelManager extends Component {
    public static Instance: LossPanelManager = null!;

    @property(Node)
    private lossPanelFrame: Node = null!; // Node khung bảng để chạy hiệu ứng phóng to

    @property(Node)
    private backgroundMask: Node = null!;

    @property(Sprite)
    private reasonIcon: Sprite = null!; // Thành phần Sprite để swap ảnh đại diện lý do chết

    @property(Label)
    private reasonLabel: Label = null!; // Thành phần Label để ghi chữ lý do chết

    @property(Node)
    private restartButton: Node = null!; // Nút Restart

    @property({ group: { name: 'Tài nguyên Sprite' }, type: SpriteFrame, displayName: "Icon Tim Vỡ" })
    private brokenHeartSprite: SpriteFrame = null!;

    @property({ group: { name: 'Tài nguyên Sprite' }, type: SpriteFrame, displayName: "Icon Hết Giờ" })
    private timeOutSprite: SpriteFrame = null!;

    @property({ group: { name: 'Hiệu ứng Nút' }, displayName: "Tỉ lệ thu nhỏ nút" })
    private pressedScaleFactor: number = 0.93;

    private buttonOriginalScale: Vec3 = new Vec3(1, 1, 1);

    protected onLoad() {
        LossPanelManager.Instance = this;

        // Lưu lại kích thước gốc của nút bấm
        if (this.restartButton) {
            this.buttonOriginalScale = this.restartButton.getScale();

            // Đăng ký bộ sự kiện nhấn nhả cho nút Restart đồng bộ phong cách game juice của dự án
            this.restartButton.on(Node.EventType.TOUCH_START, this.onBtnPress, this);
            this.restartButton.on(Node.EventType.TOUCH_END, this.onBtnRelease, this);
            this.restartButton.on(Node.EventType.TOUCH_CANCEL, this.onBtnCancel, this);
        }

        // Đảm bảo ban đầu ẩn hoàn toàn bảng đi
        this.node.active = false;
    }

    public showLossPanel(reason: LossReason) {
        if (TimeManager.Instance) {
            TimeManager.Instance.forceStopTimerOnGameOver();
        }

        if (reason === LossReason.OUT_OF_LIVES) {
            if (this.reasonIcon && this.brokenHeartSprite) this.reasonIcon.spriteFrame = this.brokenHeartSprite;
            if (this.reasonLabel) this.reasonLabel.string = "Out of lives";
        } else if (reason === LossReason.OUT_OF_TIME) {
            if (this.reasonIcon && this.timeOutSprite) this.reasonIcon.spriteFrame = this.timeOutSprite;
            if (this.reasonLabel) this.reasonLabel.string = "Out of time!";
        }

        // 2. Kích hoạt hiển thị Node tổng
        this.node.active = true;

        if (AudioManager.Instance) {
            AudioManager.Instance.playSFX(AudioManager.Instance.seLosePopup);
        }

        this.node.setScale(new Vec3(0.1, 0.1, 1));

        if (this.backgroundMask) {
            this.backgroundMask.active = true;
            let maskOpacity = this.backgroundMask.getComponent(UIOpacity) || this.backgroundMask.addComponent(UIOpacity);
            maskOpacity.opacity = 0;
            
            tween(maskOpacity).to(0.2, { opacity: 255 }).start(); 
        }

        // 3. Đảm bảo có component UIOpacity trên Node tổng để chạy hiệu ứng mờ rõ mượt mà
        if (this.lossPanelFrame) {
            let frameOpacity = this.lossPanelFrame.getComponent(UIOpacity) || this.lossPanelFrame.addComponent(UIOpacity);
            frameOpacity.opacity = 0;
            tween(frameOpacity).to(0.2, { opacity: 255 }).start();
            
            this.lossPanelFrame.setScale(new Vec3(1, 1, 1)); 
        }

        tween(this.node)
            .stop() 
            .to(1, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    // ========================================================
    // --- LOGIC ĐIỀU KHIỂN HIỆU ỨNG NÚT RESTART ---
    // ========================================================
    private onBtnPress() {
        if (!this.restartButton) return;
        tween(this.restartButton).stop();
        const targetScale = new Vec3(this.buttonOriginalScale.x * this.pressedScaleFactor, this.buttonOriginalScale.y * this.pressedScaleFactor, 1);
        tween(this.restartButton).to(0.05, { scale: targetScale }, { easing: 'sineOut' }).start();
    }

    private onBtnRelease() {
        if (!this.restartButton) return;
        tween(this.restartButton).stop();

        if (AudioManager.Instance) {
            AudioManager.Instance.playSFX(AudioManager.Instance.seClick);
        }
        
        tween(this.restartButton)
            .to(0.08, { scale: this.buttonOriginalScale }, { easing: 'sineOut' })
            .call(() => { this.onRestartExecuted(); })
            .start();
    }

    private onBtnCancel() {
        if (!this.restartButton) return;
        tween(this.restartButton).stop();
        tween(this.restartButton).to(0.08, { scale: this.buttonOriginalScale }, { easing: 'sineOut' }).start();
    }

    private onRestartExecuted() {
        const currentSceneName = director.getScene()?.name;
        if (currentSceneName) {
            director.loadScene(currentSceneName);
        } else {
            director.loadScene("main"); // Dự phòng tên scene chính của bạn
        }
    }
}