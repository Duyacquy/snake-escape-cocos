import { _decorator, Component, Node, Sprite, SpriteFrame, Vec3, tween, UIOpacity, math, UITransform, Layers } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ConfettiManager')
export class ConfettiManager extends Component {
    public static Instance: ConfettiManager = null!;

    @property([SpriteFrame])
    private confettiSprites: SpriteFrame[] = []; // Nơi chứa mảng 6 mảnh ảnh endgame_effect

    @property({ displayName: "Số mảnh mỗi đợt" })
    private piecesPerWave: number = 45; // Số lượng mảnh phun cho mỗi đợt

    @property({ displayName: "Tổng số đợt bắn pháo" })
    private totalWaves: number = 3; // Bắn 3 đợt liên tiếp

    @property({ displayName: "Thời gian giãn cách giữa các đợt" })
    private waveInterval: number = 0.7; // Cứ sau 0.7 giây sẽ kích hoạt đợt tiếp theo

    protected onLoad() {
        ConfettiManager.Instance = this;
    }

    /**
     * 🔥 HÀM CÔNG KHAI: Kích nổ pháo hoa liên hoàn xuyên màn hình với quỹ đạo dài hơn
     */
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
            this.scheduleOnce(() => {
                this.spawnSingleConfettiPiece(viewWidth, viewHeight);
            }, math.randomRange(0, 0.3));
        }
    }

    private spawnSingleConfettiPiece(viewWidth: number, viewHeight: number) {
        if (this.confettiSprites.length === 0) return;

        const pieceNode = new Node('ConfettiPiece');
        pieceNode.layer = Layers.Enum.UI_2D;

        const pieceTransform = pieceNode.addComponent(UITransform);
        this.node.addChild(pieceNode);

        const sprite = pieceNode.addComponent(Sprite);
        const randomIdx = Math.floor(Math.random() * this.confettiSprites.length);
        sprite.spriteFrame = this.confettiSprites[randomIdx];
        sprite.sizeMode = Sprite.SizeMode.RAW;

        const uiOpacity = pieceNode.addComponent(UIOpacity);
        uiOpacity.opacity = 255;

        // 1. Vị trí xuất phát từ rìa Trái hoặc rìa Phải
        const isLeftSide = Math.random() > 0.5;
        const startX = isLeftSide ? -(viewWidth / 2 + 100) : (viewWidth / 2 + 100);
        // Xuất phát từ nửa dưới màn hình
        const startY = math.randomRange(-viewHeight * 0.35, -viewHeight * 0.05);

        pieceNode.setPosition(new Vec3(startX, startY, 0));

        const randomScale = math.randomRange(0.4, 1.2);
        pieceNode.setScale(new Vec3(randomScale, randomScale, 1));

        // ========================================================
        // 🔥 QUỸ ĐẠO MỚI: CẦU VỒNG PARABOL DÀI VÀ CAO HƠN KHI RƠI
        // ========================================================
        const targetX = isLeftSide ? (viewWidth / 2 + 50) : -(viewWidth / 2 + 50);

        // Đỉnh cao nhất trục Y khống chế VỪA PHẢI, ôm quanh khu vực Well Done
        const peakY = math.randomRange(viewHeight * 0.12, viewHeight * 0.28);

        // 🔥 ĐÃ SỬA: Nâng góc rơi ở cạnh kia màn hình cao hơn, tạo hình vòng cung xa hơn
        // Thay vì rơi xuống thấp hơn startY, endY giờ đây nằm gần hoặc thậm chí cao hơn startY
        const endY = startY + math.randomRange(300, 350); // Lands between slightly lower and significantly higher than start

        // Thời gian sống dài để hạt có "đủ thời gian" di chuyển quỹ đạo dài
        const duration = math.randomRange(2.0, 2.8);
        const randomAngle = math.randomRange(720, 2160) * (Math.random() > 0.5 ? 1 : -1);

        let progressObj = { value: 0 };

        tween(progressObj)
            .to(duration, { value: 1 }, {
                onUpdate: () => {
                    if (!pieceNode || !pieceNode.isValid) return;

                    let p = progressObj.value;

                    // A. Trục X di chuyển tịnh tiến xuyên màn hình
                    let currentX = startX + (targetX - startX) * p;

                    // B. Trục Y uốn hình vòng cung mượt mà (Lao lên đỉnh rồi hạ độ cao dần theo endY mới)
                    let currentY = startY;
                    if (p < 0.45) {
                        let normP = p / 0.45;
                        currentY = startY + (peakY - startY) * Math.sin(normP * Math.PI / 2);
                    } else {
                        let normP = (p - 0.45) / 0.55;
                        currentY = peakY + (endY - peakY) * (1 - Math.cos(normP * Math.PI / 2));
                    }

                    pieceNode.setPosition(currentX, currentY, 0);

                    // C. Xoay tròn lấp lánh
                    pieceNode.setRotationFromEuler(0, 0, randomAngle * p);

                    // D. Fade Out muộn ở cuối hành trình
                    if (p > 0.75) {
                        let opacityProgress = (p - 0.75) / 0.25;
                        uiOpacity.opacity = Math.floor(255 * (1 - opacityProgress));
                    } else {
                        uiOpacity.opacity = 255;
                    }
                }
            })
            .call(() => {
                if (pieceNode && pieceNode.isValid) {
                    pieceNode.destroy();
                }
            })
            .start();
    }
}