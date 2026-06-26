import { _decorator, Component, Node, Sprite, SpriteFrame, Vec3, tween, UIOpacity, math, UITransform, Layers } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ConfettiManager')
export class ConfettiManager extends Component {
    public static Instance: ConfettiManager = null!;

    @property([SpriteFrame])
    private confettiSprites: SpriteFrame[] = []; 

    @property({ displayName: "Số mảnh mỗi đợt" })
    private piecesPerWave: number = 60; 

    @property({ displayName: "Tổng số đợt bắn" })
    private totalWaves: number = 3; 

    @property({ displayName: "Thời gian giãn cách đợt" })
    private waveInterval: number = 0.5; 

    @property({ group: { name: 'Cấu hình Kích Thước' }, displayName: "Scale nhỏ nhất" })
    private minScale: number = 1.2; // Đã tăng mặc định từ 0.5 lên 1.2

    @property({ group: { name: 'Cấu hình Kích Thước' }, displayName: "Scale lớn nhất" })
    private maxScale: number = 2.2; // Đã tăng mặc định từ 1.2 lên 2.2

    protected onLoad() {
        ConfettiManager.Instance = this;
    }

    public playWinConfetti() {
        const uiTransform = this.getComponent(UITransform);
        if (!uiTransform) return;

        const viewWidth = uiTransform.contentSize.width;
        const viewHeight = uiTransform.contentSize.height;

        for (let wave = 0; wave < this.totalWaves; wave++) {
            this.scheduleOnce(() => {
                this.fireSingleWave(viewWidth, viewHeight);
            }, wave * this.waveInterval);
        }
    }

    private fireSingleWave(viewWidth: number, viewHeight: number) {
        for (let i = 0; i < this.piecesPerWave; i++) {
            this.spawnSingleConfettiPiece(viewWidth, viewHeight);
        }
    }

    private spawnSingleConfettiPiece(viewWidth: number, viewHeight: number) {
        if (this.confettiSprites.length === 0) return;

        const pieceNode = new Node('ConfettiPiece');
        pieceNode.layer = Layers.Enum.UI_2D; 
        this.node.addChild(pieceNode);

        const sprite = pieceNode.addComponent(Sprite);
        const randomIdx = Math.floor(Math.random() * this.confettiSprites.length);
        sprite.spriteFrame = this.confettiSprites[randomIdx];
        sprite.sizeMode = Sprite.SizeMode.RAW;

        const uiOpacity = pieceNode.addComponent(UIOpacity);
        uiOpacity.opacity = 255;

        const startX = math.randomRange(-viewWidth * 0.55, viewWidth * 0.55);
        const startY = -viewHeight * 0.5 - 200;

        pieceNode.setPosition(new Vec3(startX, startY, 0));

        const scaleBase = math.randomRange(this.minScale, this.maxScale);
        
        // Vẫn giữ scale = 0 ban đầu để chống giật nhấp nháy khung hình
        pieceNode.setScale(new Vec3(0, 0, 0));

        const targetX = startX + math.randomRange(-viewWidth * 0.3, viewWidth * 0.3);
        const targetY = math.randomRange(-viewHeight * 0.1, viewHeight * 0.7);

        const duration = math.randomRange(1.0, 1.8);
        const rotationAngle = math.randomRange(-540, 540);
        const delay = math.randomRange(0, 0.25); 

        tween(pieceNode)
            .delay(delay)
            .call(() => { 
                if (pieceNode && pieceNode.isValid) {
                    // Áp dụng kích thước to hơn sau khi hết delay
                    pieceNode.setScale(new Vec3(scaleBase, scaleBase, 1));
                }
            })
            .to(duration, { position: new Vec3(targetX, targetY, 0) }, { easing: 'quadOut' })
            .call(() => {
                const fallDuration = duration * 1.4;
                const finalFallY = -viewHeight * 0.6; 
                
                tween(pieceNode)
                    .to(fallDuration, { position: new Vec3(targetX + math.randomRange(-60, 60), finalFallY, 0) }, { easing: 'quadIn' })
                    .start();

                tween(uiOpacity)
                    .to(fallDuration, { opacity: 0 })
                    .call(() => {
                        if (pieceNode && pieceNode.isValid) {
                            pieceNode.destroy();
                        }
                    })
                    .start();
            })
            .start();

        tween(pieceNode)
            .delay(delay)
            .to(duration * 2.2, { angle: rotationAngle })
            .start();
    }
}