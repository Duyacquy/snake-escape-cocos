import { _decorator, Component, Node, Vec3, tween, UIOpacity } from 'cc';
import { LossPanelManager, LossReason } from './LossPanelManager';
import { TimeManager } from './TimeManager';
const { ccclass, property } = _decorator;

@ccclass('HealthManager')
export class HealthManager extends Component {
    public static Instance: HealthManager = null!;

    @property(Node)
    private noHeartContainer: Node = null!;

    @property(Node)
    private heartContainer: Node = null!;  

    private maxLives: number = 3;
    private currentLives: number = 3;
    private heartNodes: Node[] = [];

    protected onLoad() {
        HealthManager.Instance = this;
        
        this.heartNodes = this.heartContainer.children;
        this.maxLives = this.heartNodes.length;
    }

    protected start() {
        this.resetHearts();
    }

    public resetHearts() {
        this.currentLives = this.maxLives;

        for (let i = 0; i < this.heartNodes.length; i++) {
            const heart = this.heartNodes[i];
            heart.active = true;

            // Đảm bảo node có component UIOpacity để làm mờ/rõ
            let uiOpacity = heart.getComponent(UIOpacity);
            if (!uiOpacity) {
                uiOpacity = heart.addComponent(UIOpacity);
            }

            // 1. SET TRẠNG THÁI BAN ĐẦU: To gấp 2.5 lần và Mờ tịt (opacity = 0)
            heart.setScale(new Vec3(3, 3, 1));
            uiOpacity.opacity = 0;

            // Dừng các tween cũ đề phòng reset khi đang chạy dở
            tween(heart).stop();
            tween(uiOpacity).stop();

            const delayTime = i * 0.5 + 0.5;

            tween(heart)
                .delay(delayTime)
                .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();

            // Tween làm rõ dần (opacity từ 0 -> 255)
            tween(uiOpacity)
                .delay(delayTime)
                .to(0.4, { opacity: 255 }, { easing: 'sineOut' })
                .start();
        }
    }

    /**
     * HIỆU ỨNG PHÓNG TO VÀ TAN BIẾN KHI MẤT MẠNG
     */
    public loseHeart() {
        if (this.currentLives <= 0) return;

        // Lấy trái tim hiện tại từ phải qua trái (mất dần đốt ngoài cùng trước)
        const targetIndex = this.currentLives - 1;
        const heart = this.heartNodes[targetIndex];
        
        if (!heart) return;

        const uiOpacity = heart.getComponent(UIOpacity);

        // Dừng các hành động tween cũ của node này
        tween(heart).stop();
        if (uiOpacity) tween(uiOpacity).stop();

        tween(heart)
            .to(0.5, { scale: new Vec3(1.8, 1.8, 1) }, { easing: 'sineOut' })
            .start();

        if (uiOpacity) {
            tween(uiOpacity)
                .to(0.5, { opacity: 0 }, { easing: 'sineIn' })
                .start();
        }

        this.currentLives--;

        if (this.currentLives <= 0) {
            if (TimeManager.Instance) {
                TimeManager.Instance.forceStopTimerOnGameOver();
            }

            this.scheduleOnce(() => {
                this.onGameOver();
            }, 0.8);
        }
    }

    private onGameOver() {
        if (LossPanelManager.Instance) {
            LossPanelManager.Instance.showLossPanel(LossReason.OUT_OF_LIVES);
        }
    }
}