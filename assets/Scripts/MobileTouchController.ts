import { _decorator, Component, Node, EventTouch, Vec2, Vec3 } from 'cc';
import { TimeManager } from './TimeManager';
import { GameZoomController } from './GameZoomController'; // 🔥 THÊM: Import controller của thanh slider để gọi đồng bộ

const { ccclass, property } = _decorator;

@ccclass('MobileTouchController')
export class MobileTouchController extends Component {

    @property(Node)
    private targetMapNode: Node = null!; 

    @property({ displayName: "Tốc độ Zoom bằng ngón tay" })
    private zoomSensitivity: number = 1.0;

    @property({ displayName: "Tỉ lệ Zoom nhỏ nhất (Dự phòng)" })
    private minScale: number = 0.5;

    @property({ displayName: "Tỉ lệ Zoom lớn nhất (Dự phòng)" })
    private maxScale: number = 2.0;

    @property({ displayName: "Tốc độ vuốt di chuyển map" })
    private panSpeed: number = 1.0;

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

    private onTouchStart(event: EventTouch) { }

    private onTouchMove(event: EventTouch) {
        if (!this.targetMapNode || (TimeManager.Instance && TimeManager.Instance.isGameOver)) return;

        const touches = event.getTouches();

        // 👆 TRƯỜNG HỢP 1: VUỐT 1 NGÓN TAY -> DI CHUYỂN BẢN ĐỒ (PAN)
        if (touches.length === 1) {
            const touch = touches[0];
            const delta = touch.getDelta(); 

            const currentPos = this.targetMapNode.getPosition();
            this.targetMapNode.setPosition(new Vec3(
                currentPos.x + delta.x * this.panSpeed,
                currentPos.y + delta.y * this.panSpeed,
                0
            ));
        }
        // ✌️ TRƯỜNG HỢP 2: BÓP RA/VÀO BẰNG 2 NGÓN -> PHÓNG TO/THU NHỎ (ZOOM)
        else if (touches.length >= 2) {
            const touch1 = touches[0];
            const touch2 = touches[1];

            const pos1 = touch1.getLocation();
            const pos2 = touch2.getLocation();
            const prevPos1 = touch1.getPreviousLocation();
            const prevPos2 = touch2.getPreviousLocation();

            const currentDistance = Vec2.distance(pos1, pos2);
            const previousDistance = Vec2.distance(prevPos1, prevPos2);

            if (previousDistance === 0) return;

            let scaleFactor = currentDistance / previousDistance;
            
            if (this.zoomSensitivity !== 1.0) {
                scaleFactor = 1.0 + (scaleFactor - 1.0) * this.zoomSensitivity;
            }

            // ========================================================
            // 🔥 ĐỒNG BỘ MỐC GIỚI HẠN TỪ THANH ZOOM SLIDER FRAME
            // ========================================================
            let finalMinScale = this.minScale;
            let finalMaxScale = this.maxScale;
            
            if (GameZoomController.Instance) {
                finalMinScale = GameZoomController.Instance.MinScale;
                finalMaxScale = GameZoomController.Instance.MaxScale;
            }

            const currentScaleX = this.targetMapNode.getScale().x;
            let newScale = currentScaleX * scaleFactor;

            // Giới hạn scale nằm đúng mốc của thanh UI Slider
            if (newScale < finalMinScale) newScale = finalMinScale;
            if (newScale > finalMaxScale) newScale = finalMaxScale;

            // Áp dụng scale mới lên bàn cờ
            this.targetMapNode.setScale(new Vec3(newScale, newScale, 1));

            // ========================================================
            // 🔥 ĐỒNG BỘ THANH TRƯỢT NÚT KÉO VÀ CHỮ TRÊN ZOOM LABEL
            // ========================================================
            if (GameZoomController.Instance) {
                GameZoomController.Instance.syncZoomFromScale(newScale);
            }
        }
    }

    private onTouchEnd(event: EventTouch) { }
}