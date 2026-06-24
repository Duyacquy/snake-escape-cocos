import { _decorator, Component, Node, Sprite, SpriteFrame, Vec3, UITransform, Size, math } from 'cc';
import { SnakeColor, SnakeNodeData, MoveDirection } from './SnakeCommon';
import { GridManager } from './GridManager';
const { ccclass, property } = _decorator;

interface InterpNodeData {
    x: number;
    y: number;
    dir: MoveDirection;
    type: 'head' | 'body' | 'tail1' | 'tail2' | 'eye';
    id: number;
}

@ccclass('SnakeController')
export class SnakeController extends Component {
    @property({ type: SpriteFrame }) private headSprite: SpriteFrame = null!;
    @property({ type: SpriteFrame }) private bodySprite: SpriteFrame = null!;
    @property({ type: SpriteFrame }) private tail1Sprite: SpriteFrame = null!;
    @property({ type: SpriteFrame }) private tail2Sprite: SpriteFrame = null!;
    @property({ type: SpriteFrame }) private headEyeSprite: SpriteFrame = null!;

    public snakeId: string = "";
    private static nextSnakeId = 0;
    
    private snakeSegments: SnakeNodeData[] = [];
    
    // MẢNG ĐƯỜNG MÒN: Lưu vị trí Pixel chính xác của TẤT CẢ các đốt (Cả đốt phụ)
    private renderPathCurrent: { x: number, y: number, dir: MoveDirection }[] = [];
    private renderPathPrevious: { x: number, y: number, dir: MoveDirection }[] = [];

    private gridSpacing: number = 64;
    private isMoving: boolean = false;

    private moveProgress: number = 0; 
    private isStepTransitioning: boolean = false;
    private stepDuration: number = 0.15; // Thời gian bò qua 1 ô (giây)
    private currentStep: number = 0;
    private totalSteps: number = 0;
    private hasCollision: boolean = false;
    private isEscaping: boolean = false;

    protected onLoad() {
        this.snakeId = `snake_${SnakeController.nextSnakeId++}`;
        const rootSprite = this.node.getComponent(Sprite);
        if (rootSprite) rootSprite.enabled = false;

        this.node.on(Node.EventType.TOUCH_END, this.onSnakeClicked, this);
    }

    public initSnake(color: SnakeColor, path: SnakeNodeData[], spacing: number) {
        this.gridSpacing = spacing;
        this.snakeSegments = path;
        
        this.registerToGrid();
        
        // Khởi tạo đường mòn pixel tĩnh ban đầu
        this.generateRenderPathFromSegments();
        this.renderPathPrevious = JSON.parse(JSON.stringify(this.renderPathCurrent));
        
        this.drawSnake(0);
    }

    private registerToGrid() {
        this.snakeSegments.forEach(seg => {
            if (Number.isInteger(seg.gridX) && Number.isInteger(seg.gridY)) {
                GridManager.Instance.setCell(seg.gridX, seg.gridY, this.snakeId);
            }
        });
    }

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
        if (this.isMoving) return;
        this.isMoving = true;
        this.clearFromGrid();

        const simulation = this.predictMovement();
        
        this.currentStep = 0;
        this.totalSteps = simulation.steps;
        this.hasCollision = simulation.hasCollision;
        this.isEscaping = !simulation.hasCollision;
        
        this.moveProgress = 0;
        this.isStepTransitioning = true;
        
        this.prepareNextStep();
    }

    // Cơ chế dịch chuyển mảng pixel: Đốt sau tiến lên đúng vị trí đốt trước đã đi qua
    private prepareNextStep() {
        // 1. Lưu lại đường mòn cũ làm mốc Lerp xuất phát
        this.renderPathPrevious = JSON.parse(JSON.stringify(this.renderPathCurrent));

        // 2. Cập nhật ma trận ô lưới logic (Đi trước 1 ô)
        const head = this.snakeSegments[0];
        const nextCoords = this.getNextCoordinate(head.gridX, head.gridY, head.direction);
        
        for (let i = this.snakeSegments.length - 1; i > 0; i--) {
            this.snakeSegments[i].gridX = this.snakeSegments[i - 1].gridX;
            this.snakeSegments[i].gridY = this.snakeSegments[i - 1].gridY;
            this.snakeSegments[i].direction = this.snakeSegments[i - 1].direction;
        }
        this.snakeSegments[0].gridX = nextCoords.x;
        this.snakeSegments[0].gridY = nextCoords.y;

        // 3. Tái tạo lại đường mòn ĐÍCH cho bước này
        this.generateRenderPathFromSegments();
    }

    protected update(dt: number) {
        if (!this.isStepTransitioning) return;

        this.moveProgress += dt / this.stepDuration;

        if (this.moveProgress >= 1) {
            this.moveProgress = 0;
            this.currentStep++;

            if (this.isEscaping) {
                // Thoát map hoàn toàn: chạy cho đến khi toàn bộ các đốt phụ chui ra ngoài
                const totalEscapeSteps = this.totalSteps + this.snakeSegments.length + 2;
                if (this.currentStep < totalEscapeSteps) {
                    this.prepareNextStep();
                } else {
                    this.isStepTransitioning = false;
                    this.node.destroy();
                    return;
                }
            } else {
                if (this.currentStep < this.totalSteps) {
                    this.prepareNextStep();
                } else {
                    this.isStepTransitioning = false;
                    this.isMoving = false;
                    this.registerToGrid();
                    this.drawSnake(0);
                    return;
                }
            }
        }

        this.drawSnake(this.moveProgress);
    }

    // HÀM CỐT LÕI: Rải toàn bộ đốt chính và đốt phụ lên một danh sách tọa độ Pixel cố định phẳng
    private generateRenderPathFromSegments() {
        const cols = GridManager.Instance.cols;
        const rows = GridManager.Instance.rows;
        const dotDistance = this.gridSpacing * 2;
        const totalDots = this.snakeSegments.length;

        this.renderPathCurrent = [];

        for (let i = 0; i < totalDots; i++) {
            const curr = this.snakeSegments[i];
            
            // Lấy vị trí Pixel thực tế trên màn hình của ô lưới logic
            const posX = (curr.gridX - cols / 2) * dotDistance;
            const posY = (curr.gridY - rows / 2) * dotDistance;

            // Đưa đốt chính vào đường mòn
            this.renderPathCurrent.push({ x: posX, y: posY, dir: curr.direction });

            // Nếu chưa phải đốt cuối, chèn thêm 2 đốt phụ nối đuôi thẳng hàng
            if (i < totalDots - 1) {
                const next = this.snakeSegments[i + 1];
                const nextX = (next.gridX - cols / 2) * dotDistance;
                const nextY = (next.gridY - rows / 2) * dotDistance;

                const dx = nextX - posX;
                const dy = nextY - posY;

                // Đốt phụ 1 (chiếm 1/3 khoảng cách)
                this.renderPathCurrent.push({
                    x: posX + dx / 3,
                    y: posY + dy / 3,
                    dir: curr.direction
                });

                // Đốt phụ 2 (chiếm 2/3 khoảng cách)
                this.renderPathCurrent.push({
                    x: posX + dx * 2 / 3,
                    y: posY + dy * 2 / 3,
                    dir: curr.direction
                });
            }
        }
    }

    // Hàm vẽ mới: Đốt nào đi theo vị trí pixel của đốt đó, trượt tuyến tính 1 chiều mượt mà
    public drawSnake(progress: number) {
        this.node.removeAllChildren();

        const totalDots = this.snakeSegments.length;
        if (totalDots < 2) return;

        const segmentSize = this.gridSpacing * 1.3;
        const totalRenderNodes = this.renderPathCurrent.length;

        // Xây dựng danh sách các mảnh cần vẽ dựa trên chỉ số index cố định của mảng đường mòn
        for (let i = 0; i < totalRenderNodes; i++) {
            const currPath = this.renderPathCurrent[i];
            const prevPath = this.renderPathPrevious[i] || currPath;

            // NỘI SUY PHẲNG: Trượt mượt từ vị trí pixel cũ sang vị trí pixel mới
            const interpX = math.lerp(prevPath.x, currPath.x, progress);
            const interpY = math.lerp(prevPath.y, currPath.y, progress);
            const finalDir = progress < 0.5 ? prevPath.dir : currPath.dir;

            // Xác định loại Sprite tương ứng với vị trí index trong chuỗi
            let spriteFrame = this.bodySprite;
            let name = `Body_${i}`;
            let sizeFactor = 1.0;
            let zOrder = i * 10;

            if (i === 0) {
                // ĐẦU RẮN
                spriteFrame = this.headSprite;
                name = "Head";
                sizeFactor = 1.15;
                zOrder = 0;

                // MẮT RẮN (Nằm đè lên đầu)
                if (this.headEyeSprite) {
                    this.createSegmentNode("HeadEye", this.headEyeSprite, interpX, interpY, finalDir, segmentSize * 1.1, -1);
                }
            } else if (i === totalRenderNodes - 1) {
                // ĐUÔI PHỤ TAIL2
                spriteFrame = this.tail2Sprite;
                name = "Tail2";
                sizeFactor = 0.7;
                zOrder = zOrder + 5;
            } else if (i === totalRenderNodes - 2) {
                // ĐUÔI CHÍNH TAIL1
                spriteFrame = this.tail1Sprite;
                name = "Tail1";
                sizeFactor = 0.85;
                zOrder = zOrder + 4;
            } else if (i % 3 === 0) {
                // Các đốt chính (Nằm đúng vị trí dấu chấm tròn)
                spriteFrame = this.bodySprite;
                name = `DotSegment_${i}`;
                sizeFactor = 1.0;
            } else {
                // Các đốt phụ nằm giữa
                spriteFrame = this.bodySprite;
                name = `BetweenSegment_${i}`;
                sizeFactor = 1.0;
            }

            this.createSegmentNode(name, spriteFrame, interpX, interpY, finalDir, segmentSize * sizeFactor, zOrder);
        }

        // Sắp xếp lại thứ tự vẽ (Đầu trên cùng, đuôi dưới cùng)
        const children = [...this.node.children];
        children.sort((a: any, b: any) => (b.customZOrder || 0) - (a.customZOrder || 0));
        this.node.removeAllChildren();
        children.forEach(child => this.node.addChild(child));
    }

    // Hàm tiện ích khởi tạo Node con nhanh gọn
    private createSegmentNode(name: string, spriteFrame: SpriteFrame, x: number, y: number, dir: MoveDirection, size: number, zOrder: number) {
        const segmentNode = new Node(name);
        (segmentNode as any).customZOrder = zOrder;

        const sprite = segmentNode.addComponent(Sprite);
        sprite.spriteFrame = spriteFrame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;

        const uiTransform = segmentNode.addComponent(UITransform);
        uiTransform.setContentSize(new Size(size, size));

        segmentNode.setPosition(new Vec3(x, y, 0));
        segmentNode.setRotationFromEuler(new Vec3(0, 0, this.getRotationAngle(dir)));

        segmentNode.on(Node.EventType.TOUCH_END, this.onSnakeClicked, this);
        this.node.addChild(segmentNode);
    }

    private predictMovement() {
        let tempSegments = JSON.parse(JSON.stringify(this.snakeSegments)) as SnakeNodeData[];
        let steps = 0;
        let hasCollision = false;
        let collisionDir = MoveDirection.UP;

        while (true) {
            const head = tempSegments[0];
            const nextCoords = this.getNextCoordinate(head.gridX, head.gridY, head.direction);

            if (!GridManager.Instance.isCellEmpty(nextCoords.x, nextCoords.y, this.snakeId)) {
                if (nextCoords.x < 0 || nextCoords.x >= GridManager.Instance.cols || 
                    nextCoords.y < 0 || nextCoords.y >= GridManager.Instance.rows) {
                    hasCollision = false;
                } else {
                    hasCollision = true;
                    collisionDir = head.direction;
                }
                break;
            }

            for (let i = tempSegments.length - 1; i > 0; i--) {
                tempSegments[i].gridX = tempSegments[i - 1].gridX;
                tempSegments[i].gridY = tempSegments[i - 1].gridY;
                tempSegments[i].direction = tempSegments[i - 1].direction;
            }
            tempSegments[0].gridX = nextCoords.x;
            tempSegments[0].gridY = nextCoords.y;

            steps++;
            if (steps > 100) break;
        }

        return { steps, hasCollision, collisionDir };
    }

    private getNextCoordinate(x: number, y: number, dir: MoveDirection) {
        switch (dir) {
            case MoveDirection.UP: return { x, y: y + 1 };
            case MoveDirection.DOWN: return { x, y: y - 1 };
            case MoveDirection.LEFT: return { x: x - 1, y };
            case MoveDirection.RIGHT: return { x: x + 1, y };
        }
    }

    private getRotationAngle(dir: MoveDirection): number {
        switch (dir) {
            case MoveDirection.UP: return 180;     
            case MoveDirection.RIGHT: return 90;   
            case MoveDirection.DOWN: return 0;     
            case MoveDirection.LEFT: return -90;   
        }
    }
}