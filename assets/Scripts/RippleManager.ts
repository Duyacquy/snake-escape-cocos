import { _decorator, Component, Node, EventTouch, Vec3, tween, UIOpacity, Prefab, instantiate, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('RippleManager')
export class RippleManager extends Component {

    @property(Prefab)
    private ripplePrefab: Prefab = null!; // Kéo thả file Prefab vòng tròn ở Bước 1 vào đây

    @property({ displayName: "Thời gian lan tỏa (Giây)" })
    private duration: number = 1;

    @property({ displayName: "Độ phóng đại tối đa" })
    private maxScale: number = 10;

    protected onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    }

    protected onDestroy() {
        if (this.node) {
            this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        }
    }

    private onTouchStart(event: EventTouch) {
        // 1. Lấy tọa độ UI của điểm chạm trên màn hình (Screen-UI Space)
        const uiLocation = event.getUILocation();

        // 2. Chuyển đổi tọa độ màn hình sang tọa độ Local chính xác bên trong Node này
        const uiTransform = this.getComponent(UITransform);
        if (!uiTransform) return;

        const localPos2D = uiTransform.convertToNodeSpaceAR(new Vec3(uiLocation.x, uiLocation.y, 0));
        const spawnPos = new Vec3(localPos2D.x, localPos2D.y, 0);

        // 3. Sinh ra hiệu ứng tại đúng điểm chạm vật lý
        this.spawnRipple(spawnPos);
    }

    private spawnRipple(pos: Vec3) {
        if (!this.ripplePrefab) return;

        // Khởi tạo thực thể vòng tròn sóng nước từ Prefab
        const rippleNode = instantiate(this.ripplePrefab);
        this.node.addChild(rippleNode);
        rippleNode.setPosition(pos);

        // Đảm bảo có bộ quản lý độ mờ
        let uiOpacity = rippleNode.getComponent(UIOpacity);
        if (!uiOpacity) uiOpacity = rippleNode.addComponent(UIOpacity);

        // THIẾT LẬP TRẠNG THÁI BAN ĐẦU: Siêu nhỏ (0,0,1) và rõ nét tuyệt đối (255)
        rippleNode.setScale(new Vec3(0, 0, 1));
        uiOpacity.opacity = 255;

        // HIỆU ỨNG SÓNG NƯỚC LAN TỎA
        // Nhịp 1: Vòng tròn phóng to nhanh dần đều ra ngoài rìa (easing: 'sineOut')
        tween(rippleNode)
            .to(this.duration, { scale: new Vec3(this.maxScale, this.maxScale, 1) }, { easing: 'sineOut' })
            .call(() => {
                rippleNode.destroy(); // Tự động hủy giải phóng bộ nhớ sau khi diễn xong hiệu ứng
            })
            .start();

        // Nhịp 2: Song song với phóng to, vòng tròn mờ dần về 0 để tạo hiệu ứng tan biến vào không khí
        tween(uiOpacity)
            .to(this.duration * 0.9, { opacity: 0 }, { easing: 'sineOut' }) // Tan biến sớm hơn một chút nhìn sẽ mượt hơn
            .start();
    }
}