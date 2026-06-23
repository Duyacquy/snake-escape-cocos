// 1. Thêm "Node" vào đoạn import ở dòng đầu tiên
import { _decorator, Component, EventTouch, Vec3, math, view, UITransform, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BackgroundPanResponsive')
export class BackgroundPanResponsive extends Component {

    private minX: number = 0;
    private maxX: number = 0;
    private minY: number = 0;
    private maxY: number = 0;

    protected onLoad() {
        this.calculateBounds();

        if (this.node._uiProps) {
            this.node._uiProps.uiTransformDirty = true; 
        }

        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);

        view.on('canvas-resize', this.calculateBounds, this);
    }

    protected onDestroy() {
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        view.off('canvas-resize', this.calculateBounds, this);
    }

    private calculateBounds() {
        const paddingX = 500; 
        const paddingY = 500;

        this.minX = -paddingX;
        this.maxX = paddingX;
        this.minY = -paddingY;
        this.maxY = paddingY;
    }

    private onTouchMove(event: EventTouch) {
        const delta = event.getDelta();
        let currentPos = this.node.getPosition();

        let targetX = currentPos.x + delta.x;
        let targetY = currentPos.y + delta.y;

        targetX = math.clamp(targetX, this.minX, this.maxX);
        targetY = math.clamp(targetY, this.minY, this.maxY);

        this.node.setPosition(new Vec3(targetX, targetY, currentPos.z));
    }
}