import { _decorator, Component, Node, EventTouch, Label, Vec3, math, UITransform, Color, Sprite, tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameZoomController')
export class GameZoomController extends Component {

    @property(Node)
    private zoomFrame: Node = null!; 

    @property(Node)
    private zoomButton: Node = null!;

    @property(Label)
    private zoomLabel: Node = null! as any; // Tạm thời để kiểu Node hoặc Label tùy bạn, giữ nguyên logic cũ của bạn

    @property(Node)
    private backgroundNode: Node = null!; 

    @property({ displayName: "Độ nhạy kéo nút" })
    private sensitivity: number = 1.5;

    @property({ group: { name: 'Cấu hình Zoom' } })
    private minScale: number = 1.0;
    
    @property({ group: { name: 'Cấu hình Zoom' } })
    private maxScale: number = 2.0;

    @property({ group: { name: 'Hiệu ứng Nhấn Icon' }, displayName: "Tỉ lệ thu nhỏ", min: 0.1, max: 1.0 })
    private pressedScaleFactor: number = 0.85;

    @property({ group: { name: 'Hiệu ứng Nhấn Icon' }, displayName: "Màu khi nhấn" })
    private pressedColor: Color = new Color(180, 180, 180, 255);
    

    private isFrameVisible: boolean = false;
    private maxMoveDistance: number = 0;
    
    private iconOriginalScale: Vec3 = new Vec3(1, 1, 1);
    private iconSprite: Sprite = null!;

    protected onLoad() {
        const frameHeight = this.zoomFrame.getComponent(UITransform)!.height;
        const buttonHeight = this.zoomButton.getComponent(UITransform)!.height;
        
        this.maxMoveDistance = (frameHeight - buttonHeight) / 2;

        this.iconOriginalScale = this.node.getScale();
        this.iconSprite = this.node.getComponent(Sprite)!;

        this.zoomButton.on(Node.EventType.TOUCH_MOVE, this.onButtonDrag, this);
        
        this.zoomButton.on(Node.EventType.TOUCH_END, (event) => { event.propagationStopped = true; }, this);
        this.zoomButton.on(Node.EventType.TOUCH_CANCEL, (event) => { event.propagationStopped = true; }, this);

        this.node.on(Node.EventType.TOUCH_START, this.onIconPress, this);
        this.node.on(Node.EventType.TOUCH_END, this.onIconRelease, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onIconCancel, this); // Tách riêng cancel ra
    }

    protected start() {
        this.zoomFrame.active = false;
        
        let currentPos = this.zoomButton.getPosition();
        this.zoomButton.setPosition(new Vec3(currentPos.x, -this.maxMoveDistance, currentPos.z));
        this.updateZoom(0);
    }

    // HIỆU ỨNG ICON: Nhấn xuống thì thu nhỏ + tối đi chớp nhoáng
    private onIconPress() {
        tween(this.node).stop();
        if (this.iconSprite) tween(this.iconSprite).stop();

        const targetScale = new Vec3(
            this.iconOriginalScale.x * this.pressedScaleFactor,
            this.iconOriginalScale.y * this.pressedScaleFactor,
            1
        );

        tween(this.node)
            .to(0.05, { scale: targetScale }, { easing: 'sineOut' })
            .start();

        if (this.iconSprite) {
            tween(this.iconSprite)
                .to(0.05, { color: this.pressedColor })
                .start();
        }
    }

    private onIconRelease() {
        tween(this.node).stop();
        if (this.iconSprite) tween(this.iconSprite).stop();

        tween(this.node)
            .to(0.1, { scale: this.iconOriginalScale }, { easing: 'sineOut' })
            .call(() => {
                this.toggleZoomFrame();
            })
            .start();

        if (this.iconSprite) {
            tween(this.iconSprite)
                .to(0.1, { color: Color.WHITE })
                .start();
        }
    }

    private onIconCancel() {
        tween(this.node).stop();
        if (this.iconSprite) tween(this.iconSprite).stop();

        tween(this.node)
            .to(0.1, { scale: this.iconOriginalScale }, { easing: 'sineOut' })
            .start();

        if (this.iconSprite) {
            tween(this.iconSprite)
                .to(0.1, { color: Color.WHITE })
                .start();
        }
    }

    private toggleZoomFrame() {
        this.isFrameVisible = !this.isFrameVisible;
        this.zoomFrame.active = this.isFrameVisible;
    }

    private onButtonDrag(event: EventTouch) {
        const deltaY = event.getDeltaY();
        let currentPos = this.zoomButton.getPosition();

        let targetY = currentPos.y + (deltaY * this.sensitivity);

        targetY = math.clamp(targetY, -this.maxMoveDistance, this.maxMoveDistance);
        this.zoomButton.setPosition(new Vec3(currentPos.x, targetY, currentPos.z));

        const progress = (targetY + this.maxMoveDistance) / (this.maxMoveDistance * 2);
        this.updateZoom(progress);
    }

    private updateZoom(progress: number) {
        const percent = Math.round(progress * 100);
        if (this.zoomLabel instanceof Label) {
            this.zoomLabel.string = `${percent}%`;
        }

        const targetScaleValue = math.lerp(this.minScale, this.maxScale, progress);
        this.backgroundNode.setScale(new Vec3(targetScaleValue, targetScaleValue, 1));
    }

    protected onDestroy() {
        if (this.zoomButton) {
            this.zoomButton.targetOff(this);
        }
        this.node.off(Node.EventType.TOUCH_START, this.onIconPress, this);
        this.node.off(Node.EventType.TOUCH_END, this.onIconRelease, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onIconCancel, this);
    }
}