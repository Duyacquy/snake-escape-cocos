import { _decorator, Component, Node, EventTouch, Vec2, Vec3 } from 'cc';
import { TimeManager } from './TimeManager';
import { GameZoomController } from './GameZoomController'; 

const { ccclass, property } = _decorator;

@ccclass('MobileTouchController')
export class MobileTouchController extends Component {

    @property(Node)
    private targetMapNode: Node = null!; 

    @property({ displayName: "Tốc độ Zoom bằng ngón tay" })
    private zoomSensitivity: number = 0.2;

    @property({ displayName: "Tỉ lệ Zoom nhỏ nhất (Dự phòng)" })
    private minScale: number = 0.5;

    @property({ displayName: "Tỉ lệ Zoom lớn nhất (Dự phòng)" })
    private maxScale: number = 2.0;

    @property({ displayName: "Tốc độ vuốt di chuyển map" })
    private panSpeed: number = 0.55;

    private isZoomingMode: boolean = false;

    protected onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    protected onDestroy() {
        if (this.node) {
            this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
            this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        }
    }

    private onTouchStart(event: EventTouch) { 
        const touches = event.getTouches();
        // Nếu ngay khi chạm xuống đã có từ 2 ngón trở lên, kích hoạt khóa chế độ Zoom lập tức
        if (touches.length >= 2) {
            this.isZoomingMode = true;
        }
    }

    private onTouchMove(event: EventTouch) {
        if (!this.targetMapNode || (TimeManager.Instance && TimeManager.Instance.isGameOver)) return;

        const touches = event.getTouches();

        // Kể cả đang di chuyển, nếu xuất hiện ngón thứ 2 thì bật khóa chế độ Zoom
        if (touches.length >= 2) {
            this.isZoomingMode = true;
        }

        // ========================================================
        // 🔒 BỘ LỌC CHỐNG RUNG LẮC: NẾU ĐANG ZOOM THÌ CẤM VUỐT DI CHUYỂNMAP
        // ========================================================
        if (this.isZoomingMode) {
            // Chỉ xử lý Zoom khi có đủ dữ liệu 2 ngón trong frame đó
            if (touches.length >= 2) {
                const touch1 = touches[0];
                const touch2 = touches[1];

                const pos1 = touch1.getLocation();
                const pos2 = touch2.getLocation();
                const prevPos1 = touch1.getPreviousLocation();
                const prevPos2 = touch2.getPreviousLocation();

                const currentDistance = Vec2.distance(pos1, pos2);
                const previousDistance = Vec2.distance(prevPos1, prevPos2);

                if (previousDistance === 0) return;

                let rawRatio = currentDistance / previousDistance;
                let scaleFactor = 1.0 + (rawRatio - 1.0) * this.zoomSensitivity;

                let finalMinScale = this.minScale;
                let finalMaxScale = this.maxScale;
                
                if (GameZoomController.Instance) {
                    finalMinScale = GameZoomController.Instance.MinScale;
                    finalMaxScale = GameZoomController.Instance.MaxScale;
                }

                const currentScaleX = this.targetMapNode.getScale().x;
                let newScale = currentScaleX * scaleFactor;

                if (newScale < finalMinScale) newScale = finalMinScale;
                if (newScale > finalMaxScale) newScale = finalMaxScale;

                this.targetMapNode.setScale(new Vec3(newScale, newScale, 1));

                if (GameZoomController.Instance) {
                    GameZoomController.Instance.syncZoomFromScale(newScale);
                }
            }
            
            // Chặn đứng hoàn toàn không cho code chạy xuống phần Vuốt 1 ngón bên dưới
            return; 
        }

        // ========================================================
        // 👆 TRƯỜNG HỢP 1: VUỐT 1 NGÓN TAY -> DI CHUYỂN BẢN ĐỒ (PAN)
        // (Chỉ được chạy khi cờ hiệu isZoomingMode bằng false)
        // ========================================================
        if (touches.length === 1 && !this.isZoomingMode) {
            const touch = touches[0];
            const delta = touch.getDelta(); 

            const currentPos = this.targetMapNode.getPosition();
            this.targetMapNode.setPosition(new Vec3(
                currentPos.x + delta.x * this.panSpeed,
                currentPos.y + delta.y * this.panSpeed,
                0
            ));
        }
    }

    private onTouchEnd(event: EventTouch) { 
        const touches = event.getTouches();
        // Chỉ mở khóa chế độ khi người chơi nhấc TRỌN VẸN toàn bộ các ngón tay ra khỏi màn hình
        if (touches.length === 0) {
            this.isZoomingMode = false;
        }
    }
}