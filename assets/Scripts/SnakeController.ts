import { _decorator, Component, Node, Sprite, SpriteFrame, Vec3, UITransform, Size, tween, math } from 'cc';
import { SnakeColor, SnakeNodeData, MoveDirection } from './SnakeCommon';
import { GridManager } from './GridManager';
const { ccclass, property } = _decorator;

@ccclass('SnakeController')
export class SnakeController extends Component {
    @property({ type: SpriteFrame }) private headSprite: SpriteFrame = null!;
    @property({ type: SpriteFrame }) private bodySprite: SpriteFrame = null!;
    @property({ type: SpriteFrame }) private tail1Sprite: SpriteFrame = null!;
    @property({ type: SpriteFrame }) private tail2Sprite: SpriteFrame = null!;

    public snakeId: string = "";
    private snakeSegments: SnakeNodeData[] = [];
    private gridSpacing: number = 64;
    private isMoving: boolean = false;

protected onLoad() {
    this.snakeId = `snake_${math.generateUUID()}`;

    const rootSprite = this.node.getComponent(Sprite);
    if (rootSprite) {
        rootSprite.enabled = false;
    }

    this.node.on(Node.EventType.TOUCH_END, this.onSnakeClicked, this);
}

    public initSnake(color: SnakeColor, path: SnakeNodeData[], spacing: number) {
        this.gridSpacing = spacing;
        this.snakeSegments = path;
        this.registerToGrid();
        this.drawSnake();
    }

    // Đăng ký các đốt của mình lên hệ thống Grid chung
    private registerToGrid() {
        this.snakeSegments.forEach(seg => {
            if (Number.isInteger(seg.gridX) && Number.isInteger(seg.gridY)) {
                GridManager.Instance.setCell(seg.gridX, seg.gridY, this.snakeId);
            }
        });
    }

    // Xóa các đốt khỏi Grid khi di chuyển
    private clearFromGrid() {
        this.snakeSegments.forEach(seg => {
            if (Number.isInteger(seg.gridX) && Number.isInteger(seg.gridY)) {
                GridManager.Instance.removeCell(seg.gridX, seg.gridY);
            }
        });
    }

    private onSnakeClicked() {
        if (this.isMoving) return;
        this.startMoving();
    }

    private startMoving() {
        this.isMoving = true;
        
        // Giải phóng grid hiện tại để phục vụ tính toán không bị đụng chính mình
        this.clearFromGrid();

        // 1. DỰ ĐOÁN TƯƠNG LAI: Kiểm tra xem đi được tối đa bao nhiêu bước
        const simulation = this.predictMovement();
        
        if (simulation.hasCollision) {
            // Trường hợp TRONG TƯƠNG LAI CÓ VA CHẠM: Đi tới điểm va chạm rồi giật lại
            this.executeMoveWithCollision(simulation.steps, simulation.collisionDir);
        } else {
            // Trường hợp TRONG TƯƠNG LAI KHÔNG VA CHẠM: Đi thẳng ra khỏi map (Win/Escape)
            this.executeEscape();
        }
    }

    // Hàm mô phỏng bước đi trong tương lai
    private predictMovement() {
        // Sao chép mảng segments để giả lập chạy thử
        let tempSegments = JSON.parse(JSON.stringify(this.snakeSegments)) as SnakeNodeData[];
        let steps = 0;
        let hasCollision = false;
        let collisionDir = MoveDirection.UP;

        // Cho rắn chạy giả lập từng bước cho đến khi thoát hẳn hoặc đụng độ
        while (true) {
            const head = tempSegments[0];
            const nextCoords = this.getNextCoordinate(head.gridX, head.gridY, head.direction);

            // Kiểm tra xem ô tiếp theo có trống không
            if (!GridManager.Instance.isCellEmpty(nextCoords.x, nextCoords.y, this.snakeId)) {
                // Nếu ô tiếp theo nằm NGOÀI BIÊN bản đồ -> Nghĩa là rắn đã TRỐN THOÁT THÀNH CÔNG (Không tính là va chạm)
                if (nextCoords.x < 0 || nextCoords.x >= GridManager.Instance.cols || 
                    nextCoords.y < 0 || nextCoords.y >= GridManager.Instance.rows) {
                    hasCollision = false;
                } else {
                    // Đụng phải rắn khác hoặc chướng ngại vật trong map
                    hasCollision = true;
                    collisionDir = head.direction;
                }
                break;
            }

            // Di chuyển mảng giả lập tiến lên 1 bước
            for (let i = tempSegments.length - 1; i > 0; i--) {
                tempSegments[i].gridX = tempSegments[i - 1].gridX;
                tempSegments[i].gridY = tempSegments[i - 1].gridY;
                tempSegments[i].direction = tempSegments[i - 1].direction;
            }
            tempSegments[0].gridX = nextCoords.x;
            tempSegments[0].gridY = nextCoords.y;
            // Giữ nguyên hướng đầu hoặc cập nhật theo thiết kế (ở đây đi thẳng nên giữ nguyên hướng đầu)

            steps++;
            
            // Safety check đề phòng vòng lặp vô hạn ngoài ý muốn
            if (steps > 100) break;
        }

        return { steps, hasCollision, collisionDir };
    }

    // Di chuyển tịnh tiến thực tế từng ô (Hàm đệ quy hoặc dùng Tween lặp)
    private executeMoveWithCollision(totalSteps: number, collisionDir: MoveDirection) {
        if (totalSteps === 0) {
            // Bị chặn ngay từ bước đầu tiên -> Thực hiện hiệu ứng giật nhẹ tại chỗ luôn
            this.playBounceEffect(collisionDir);
            return;
        }

        let currentStep = 0;
        const moveOneStep = () => {
            if (currentStep < totalSteps) {
                this.moveAllSegmentsForward();
                currentStep++;
                
                // Di chuyển mượt bằng tween, xong bước này thì gọi bước tiếp theo
                scheduleOnce(() => { moveOneStep(); }, 0.1); 
            } else {
                // Đã đến điểm va chạm -> Giật lại và choáng
                this.playBounceEffect(collisionDir);
            }
        };

        moveOneStep();
    }

    // Di chuyển thẳng ra khỏi màn hình
    private executeEscape() {
        const escapeRoutine = () => {
            // Kiểm tra xem đốt cuối cùng (đuôi) đã ra khỏi màn hình chưa
            const head = this.snakeSegments[0];
            if (head.gridX < -5 || head.gridX > GridManager.Instance.cols + 5 ||
                head.gridY < -5 || head.gridY > GridManager.Instance.rows + 5) {
                
                // Rắn đã biến mất hoàn toàn khỏi màn hình -> Hủy node
                this.node.destroy();
                // TODO: Gửi sự kiện về GameManager để check xem thắng màn chơi chưa
                return;
            }

            this.moveAllSegmentsForward();
            scheduleOnce(() => { escapeRoutine(); }, 0.08); // Tốc độ chạy thoát nhanh hơn tí cho mượt
        };

        escapeRoutine();
    }

    // Hàm thực hiện dịch chuyển mảng tọa độ thực tế tiến lên 1 ô
    private moveAllSegmentsForward() {
        const head = this.snakeSegments[0];
        const nextCoords = this.getNextCoordinate(head.gridX, head.gridY, head.direction);

        for (let i = this.snakeSegments.length - 1; i > 0; i--) {
            this.snakeSegments[i].gridX = this.snakeSegments[i - 1].gridX;
            this.snakeSegments[i].gridY = this.snakeSegments[i - 1].gridY;
            this.snakeSegments[i].direction = this.snakeSegments[i - 1].direction;
        }
        this.snakeSegments[0].gridX = nextCoords.x;
        this.snakeSegments[0].gridY = nextCoords.y;

        // Cập nhật lại UI hiển thị ngay lập tức
        this.drawSnake();
    }

    // Hiệu ứng giật ngược lại khi va chạm (Bounce Back) và kết thúc di chuyển
    private playBounceEffect(dir: MoveDirection) {
        let bounceOffset = new Vec3(0, 0, 0);
        const strength = 15; // Độ thọt/giật tính bằng pixel

        if (dir === MoveDirection.UP) bounceOffset.y = strength;
        if (dir === MoveDirection.DOWN) bounceOffset.y = -strength;
        if (dir === MoveDirection.LEFT) bounceOffset.x = -strength;
        if (dir === MoveDirection.RIGHT) bounceOffset.x = strength;

        const originalPos = this.node.getPosition();

        tween(this.node)
            .by(0.05, { position: bounceOffset }, { easing: 'sineOut' })
            .to(0.1, { position: originalPos }, { easing: 'sineIn' })
            .call(() => {
                this.registerToGrid();
                this.isMoving = false;
                console.log("Rắn bị choáng!");
            })
            .start();
    }

    // Tiện ích tính tọa độ tiếp theo dựa vào hướng
    private getNextCoordinate(x: number, y: number, dir: MoveDirection) {
        switch (dir) {
            case MoveDirection.UP: return { x, y: y + 1 };
            case MoveDirection.DOWN: return { x, y: y - 1 };
            case MoveDirection.LEFT: return { x: x - 1, y };
            case MoveDirection.RIGHT: return { x: x + 1, y };
        }
    }

    // Hàm drawSnake() giữ nguyên logic tạo Sprite/xoay hướng từ bước trước...
    public drawSnake() {
        this.node.removeAllChildren();

        const totalDots = this.snakeSegments.length;
        if (totalDots < 2) return;

        const segmentSize = this.gridSpacing * 1.3;

        const cols = GridManager.Instance.cols;
        const rows = GridManager.Instance.rows;
        const dotDistance = this.gridSpacing * 2;

        type RenderPiece = {
            name: string;
            spriteFrame: SpriteFrame;
            gridX: number;
            gridY: number;
            direction: MoveDirection;
            order: number;
        };

        const pieces: RenderPiece[] = [];

        // 1. Vẽ các phần nằm đúng trên dot
        for (let i = 0; i < totalDots; i++) {
            const data = this.snakeSegments[i];

            let spriteFrame: SpriteFrame;

            if (i === 0) {
                spriteFrame = this.headSprite;
            } else if (i === totalDots - 1) {
                spriteFrame = this.tail1Sprite;
            } else {
                spriteFrame = this.bodySprite;
            }

            pieces.push({
                name: `Dot_${i}`,
                spriteFrame,
                gridX: data.gridX,
                gridY: data.gridY,
                direction: data.direction,
                order: i * 10
            });
        }

        // 2. Mỗi khoảng giữa 2 dot có đúng 2 body
        for (let i = 0; i < totalDots - 1; i++) {
            const current = this.snakeSegments[i];
            const next = this.snakeSegments[i + 1];

            const dx = next.gridX - current.gridX;
            const dy = next.gridY - current.gridY;

            pieces.push({
                name: `BodyBetween_${i}_1`,
                spriteFrame: this.bodySprite,
                gridX: current.gridX + dx / 3,
                gridY: current.gridY + dy / 3,
                direction: current.direction,
                order: i * 10 + 1
            });

            pieces.push({
                name: `BodyBetween_${i}_2`,
                spriteFrame: this.bodySprite,
                gridX: current.gridX + dx * 2 / 3,
                gridY: current.gridY + dy * 2 / 3,
                direction: current.direction,
                order: i * 10 + 2
            });
        }

        // 3. Tail2 nằm sau Tail1, không nằm trong snakeSegments
        const tail1 = this.snakeSegments[totalDots - 1];
        const beforeTail = this.snakeSegments[totalDots - 2];

        const tailDx = tail1.gridX - beforeTail.gridX;
        const tailDy = tail1.gridY - beforeTail.gridY;

        pieces.push({
            name: `Tail2`,
            spriteFrame: this.tail2Sprite,
            gridX: tail1.gridX + tailDx / 3,
            gridY: tail1.gridY + tailDy / 3,
            direction: tail1.direction,
            order: totalDots * 10
        });

        // 4. Vẽ từ đuôi lên đầu
        // Node add sau sẽ nằm trên node add trước
        pieces.sort((a, b) => b.order - a.order);

        for (const piece of pieces) {
            const segmentNode = new Node(piece.name);

            const sprite = segmentNode.addComponent(Sprite);
            sprite.spriteFrame = piece.spriteFrame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;

            const uiTransform = segmentNode.addComponent(UITransform);
            uiTransform.setContentSize(new Size(segmentSize, segmentSize));

            const posX = (piece.gridX - cols / 2) * dotDistance;
            const posY = (piece.gridY - rows / 2) * dotDistance;

            segmentNode.setPosition(new Vec3(posX, posY, 0));
            segmentNode.setRotationFromEuler(
                new Vec3(0, 0, this.getRotationAngle(piece.direction))
            );

            this.node.addChild(segmentNode);
        }
    }

    private getRotationAngle(dir: MoveDirection): number {
        switch (dir) {
            case MoveDirection.UP: return 180;     // Hướng lên: xoay 180 độ để lật ngược ảnh gốc đang cắm xuống đất
            case MoveDirection.RIGHT: return 90;   // Hướng qua phải
            case MoveDirection.DOWN: return 0;     // Hướng xuống: giữ nguyên góc 0 của ảnh gốc
            case MoveDirection.LEFT: return -90;   // Hướng qua trái
        }
    }
}

// Hàm hỗ trợ delay nhanh gọn tương tự setTimeout trong Cocos
function scheduleOnce(callback: () => void, delay: number) {
    tween({}).delay(delay).call(callback).start();
}