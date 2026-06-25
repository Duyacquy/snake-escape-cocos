import { _decorator, Component, Node, tween, Vec3, director, UIOpacity, sp } from 'cc';
import { AudioManager } from './AudioManager'; // Import để dùng chung tiếng click nút
import { TimeManager } from './TimeManager';
import { ConfettiManager } from './ConfettiManager';

const { ccclass, property } = _decorator;

@ccclass('WinPanelManager')
export class WinPanelManager extends Component {
    public static Instance: WinPanelManager = null!;

    @property(Node)
    private backgroundMask: Node = null!; // Tấm nền đen tràn màn hình

    @property(Node)
    private winPanelFrame: Node = null!; // Khung chứa nội dung bảng

    @property(sp.Skeleton)
    private winSkeleton: sp.Skeleton = null!; // Component hoạt ảnh Spine "well done"

    @property(Node)
    private playAgainButton: Node = null!; // Nút Play Again

    @property({ group: { name: 'Hiệu ứng Nút' }, displayName: "Tỉ lệ thu nhỏ nút" })
    private pressedScaleFactor: number = 0.93;

    private buttonOriginalScale: Vec3 = new Vec3(1, 1, 1);

    protected onLoad() {
        WinPanelManager.Instance = this;

        // Lưu kích thước gốc và đăng ký bộ sự kiện nhấn nhả cho nút Play Again
        if (this.playAgainButton) {
            this.buttonOriginalScale = this.playAgainButton.getScale();
            this.playAgainButton.on(Node.EventType.TOUCH_START, this.onBtnPress, this);
            this.playAgainButton.on(Node.EventType.TOUCH_END, this.onBtnRelease, this);
            this.playAgainButton.on(Node.EventType.TOUCH_CANCEL, this.onBtnCancel, this);
        }

        // Đảm bảo ban đầu ẩn hoàn toàn bảng đi
        this.node.active = false;
        if (this.backgroundMask) this.backgroundMask.active = false;
    }

    public showWinPanel() {
        // 1. Kích hoạt cờ chặn game đếm ngược (nếu chưa khóa hẳn)
        if (TimeManager.Instance) {
            TimeManager.Instance.isGameOver = true;
        }

        // 2. Bật Node tổng chứa Panel lên và đặt scale siêu nhỏ ban đầu (0.1) giống y hệt Map
        this.node.active = true;
        this.node.setScale(new Vec3(0.1, 0.1, 1));

        if (AudioManager.Instance) {
            AudioManager.Instance.playSFX(AudioManager.Instance.seWinPopup);
        }

        if (ConfettiManager.Instance) {
            ConfettiManager.Instance.playWinConfetti();
        }

        // 3. ĐIỀU KHIỂN NỀN ĐEN: Xuất hiện mượt mà
        if (this.backgroundMask) {
            this.backgroundMask.active = true;
            let maskOpacity = this.backgroundMask.getComponent(UIOpacity) || this.backgroundMask.addComponent(UIOpacity);
            maskOpacity.opacity = 0;
            tween(maskOpacity).to(0.2, { opacity: 255 }).start(); 
        }

        tween(this.node)
            .stop()
            .to(1, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        if (this.winSkeleton) {
            const randomSkinIndex = Math.floor(Math.random() * 5) + 1;
            this.winSkeleton.setSkin(randomSkinIndex.toString()); 
            this.winSkeleton.setToSetupPose();
            this.winSkeleton.setAnimation(0, 'appear', false);
            this.winSkeleton.addAnimation(0, 'loop', true, 0);
        }
    }

    // ========================================================
    // --- LOGIC ĐIỀU KHIỂN HIỆU ỨNG NÚT PLAY AGAIN ---
    // ========================================================
    private onBtnPress() {
        if (!this.playAgainButton) return;
        tween(this.playAgainButton).stop();
        const targetScale = new Vec3(this.buttonOriginalScale.x * this.pressedScaleFactor, this.buttonOriginalScale.y * this.pressedScaleFactor, 1);
        tween(this.playAgainButton).to(0.05, { scale: targetScale }, { easing: 'sineOut' }).start();
    }

    private onBtnRelease() {
        if (!this.playAgainButton) return;
        tween(this.playAgainButton).stop();

        // Phát tiếng click nút chung từ AudioManager đã làm ở phần trước
        if (AudioManager.Instance) {
            AudioManager.Instance.playSFX(AudioManager.Instance.seClick);
        }

        tween(this.playAgainButton)
            .to(0.08, { scale: this.buttonOriginalScale }, { easing: 'sineOut' })
            .call(() => { this.onPlayAgainExecuted(); })
            .start();
    }

    private onBtnCancel() {
        if (!this.playAgainButton) return;
        tween(this.playAgainButton).stop();
        tween(this.playAgainButton).to(0.08, { scale: this.buttonOriginalScale }, { easing: 'sineOut' }).start();
    }

    private onPlayAgainExecuted() {
        const currentSceneName = director.getScene()?.name;
        if (currentSceneName) {
            director.loadScene(currentSceneName);
        } else {
            director.loadScene("main");
        }
    }
}