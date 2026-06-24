import { _decorator, Component, Node, Sprite, SpriteFrame, Vec3, UITransform, Size, math, tween } from 'cc';
import { SnakeColor, SnakeNodeData, MoveDirection } from './SnakeCommon';
import { GridManager } from './GridManager';
import { TimeManager } from './TimeManager';
import { HealthManager } from './HealthManager';

const { ccclass, property } = _decorator;

@ccclass('SnakeController')
export class SnakeController extends Component {
    @property({ type: SpriteFrame }) private headSprite: SpriteFrame = null!;
    @property({ type: SpriteFrame }) private bodySprite: SpriteFrame = null!;
    @property({ type: SpriteFrame }) private tail1Sprite: SpriteFrame = null!;
    @property({ type: SpriteFrame }) private tail2Sprite: SpriteFrame = null!;
    @property({ type: SpriteFrame }) private headEyeSprite: SpriteFrame = null!;
    @property({ displayName: "Số ô chạy thêm khi thoát" }) 
    private extraEscapeSteps: number = 12;

    public snakeId: string = "";
    private static nextSnakeId = 0;
    
    private snakeSegments: SnakeNodeData[] = [];
    
    private renderPathCurrent: { x: number, y: number, dir: MoveDirection }[] = [];
    private renderPathPrevious: { x: number, y: number, dir: MoveDirection }[] = [];

    private gridSpacing: number = 64;
    private isMoving: boolean = false;

    private moveProgress: number = 0; 
    private isStepTransitioning: boolean = false;
    private stepDuration: number = 0.04; // Thời gian bò qua 1 ô (giây)
    private currentStep: number = 0;
    private totalSteps: number = 0;
    private hasCollision: boolean = false;
    private isEscaping: boolean = false;

    private isReversing: boolean = false;
    private victimSnakeId: string = "";
    private originalPathBackup: string = ""; // Dùng để khôi phục chuẩn 100% vị trí ban đầu
    private originalScale: Vec3 = new Vec3(1, 1, 1);
    private visualOffset: Vec3 = new Vec3(0, 0, 0);

    protected onLoad() {
        this.snakeId = `snake_${SnakeController.nextSnakeId++}`;
        const rootSprite = this.node.getComponent(Sprite);
        if (rootSprite) rootSprite.enabled = false;

        this.originalScale = this.node.getScale();
        this.node.on(Node.EventType.TOUCH_END, this.onSnakeClicked, this);
    }

    public initSnake(color: SnakeColor, path: SnakeNodeData[], spacing: number) {
        this.gridSpacing = spacing;
        this.snakeSegments = path;
        
        this.registerToGrid();
        
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
        if (TimeManager.Instance && TimeManager.Instance.isGamePaused) return;

        this.clearFromGrid();

        // Sao lưu lại tọa độ ban đầu đề phòng trường hợp phải đi lùi về
        this.originalPathBackup = JSON.stringify(this.snakeSegments);

        this.isMoving = true;
        this.clearFromGrid();
        
        if (TimeManager.Instance) {
            TimeManager.Instance.startTimer();
        }

        const simulation = this.predictMovement();
        
        this.currentStep = 0;
        this.totalSteps = simulation.steps;
        this.hasCollision = simulation.hasCollision;
        this.isEscaping = !simulation.hasCollision;
        this.victimSnakeId = simulation.victimSnakeId; // Lưu lại ID con rắn bị đâm
        
        this.isReversing = false; // Ban đầu luôn là tiến lên
        this.moveProgress = 0;
        this.isStepTransitioning = true;
        
        this.prepareNextStep();
    }

    private prepareNextStep() {
        this.renderPathPrevious = JSON.parse(JSON.stringify(this.renderPathCurrent));
    
        // Đồng bộ mảng xương tiến lên nấc tiếp theo từ dữ liệu chuẩn để tránh sai số
        this.snakeSegments = this.getSegmentsAtStep(this.currentStep + 1);
    
        this.generateRenderPathFromSegments();
    }

    private prepareNextReverseStep() {
        // 1. Cập nhật renderPathCurrent ứng với bước currentStep hiện tại
        this.snakeSegments = this.getSegmentsAtStep(this.currentStep);
        this.generateRenderPathFromSegments(); // Ghi dữ liệu vào this.renderPathCurrent
    
        // 2. Cập nhật renderPathPrevious ứng với bước phía sau (currentStep - 1)
        let prevSegments = this.getSegmentsAtStep(this.currentStep - 1);
        
        let tempCurrent = this.renderPathCurrent; 
        this.snakeSegments = prevSegments;
        this.generateRenderPathFromSegments(); // Tạo đường đi cho bước lùi tiếp theo
        
        this.renderPathPrevious = this.renderPathCurrent; // Cất vào renderPathPrevious làm điểm đích lerp
        this.renderPathCurrent = tempCurrent;            // Trả lại renderPathCurrent chuẩn cho bước này
    
        // 3. Đồng bộ lại mảng xương logic của con rắn khớp với vị trí hiện tại
        this.snakeSegments = this.getSegmentsAtStep(this.currentStep);
    }

    protected update(dt: number) {
        if (!this.isStepTransitioning) return;
        if (TimeManager.Instance && TimeManager.Instance.isGamePaused) return;
    
        if (!this.isReversing) {
            this.moveProgress += dt / this.stepDuration;
        } else {
            this.moveProgress -= dt / (this.stepDuration * 1.5); // Đi lùi về chậm hơn một chút nhìn sẽ tự nhiên hơn
        }
    
        // --- XỬ LÝ KHI TIẾN HẾT 1 Ô ---
        if (!this.isReversing && this.moveProgress >= 1) {
            this.moveProgress = 0;
            this.currentStep++;
    
            if (this.isEscaping) {
                if (this.currentStep === this.totalSteps) {
                    if (TimeManager.Instance) TimeManager.Instance.addEscapedSnake();
                }
    
                const totalEscapeSteps = this.totalSteps + this.snakeSegments.length + 2 + this.extraEscapeSteps;
                if (this.currentStep < totalEscapeSteps) {
                    this.prepareNextStep();
                } else {
                    this.isStepTransitioning = false;
                    this.node.destroy();
                    return;
                }
            } else {
                // CHẠY TIẾN ĐẾN ĐIỂM VA CHẠM
                if (this.currentStep < this.totalSteps) {
                    this.prepareNextStep();
                } else {
                    this.triggerVictimAnimation();
                    
                    if (TimeManager.Instance) {
                        TimeManager.Instance.playRedAura();
                    }
    
                    if (HealthManager.Instance) {
                        HealthManager.Instance.loseHeart();
                    }
    
                    this.isReversing = true;
                    this.moveProgress = 1;
    
                    if (TimeManager.Instance) {
                        TimeManager.Instance.hideRedAura();
                    }
                }
            }
        }
    
        // --- XỬ LÝ KHI LÙI HẾT 1 Ô ---
        if (this.isReversing && this.moveProgress <= 0) {
            this.moveProgress = 1;
            this.currentStep--;
    
            if (this.currentStep > 0) {
                // 🔥 Gọi hàm chuẩn bị lùi mượt mà từng ô một
                this.prepareNextReverseStep();
            } else {
                // Đã lùi về đến tận gốc ban đầu!
                this.isStepTransitioning = false;
                this.isMoving = false;
                this.isReversing = false;
    
                // Khôi phục lại chính xác 100% dữ liệu mảng ô lưới ban đầu để tránh sai lệch tích lũy
                this.snakeSegments = JSON.parse(this.originalPathBackup);
                this.registerToGrid();
                
                this.generateRenderPathFromSegments();
                this.renderPathPrevious = JSON.parse(JSON.stringify(this.renderPathCurrent));
                this.drawSnake(0);
                return;
            }
        }
    
        this.drawSnake(this.moveProgress);
    }

    private triggerVictimAnimation() {
        if (!this.victimSnakeId) return;

        const snakeContainer = this.node.parent;
        if (!snakeContainer) return;

        // Tìm thực thể Script SnakeController của con rắn nạn nhân
        const victimNode = snakeContainer.children.find(child => {
            const comp = child.getComponent(SnakeController);
            return comp && comp.snakeId === this.victimSnakeId;
        });

        if (victimNode) {
            const victimComp = victimNode.getComponent(SnakeController);
            if (victimComp) {
                // Dừng các tween rung cũ nếu có và đưa về vị trí cân bằng
                tween(victimComp).stop();
                victimComp.visualOffset.set(0, 0, 0);

                const shakeIntensity = 5; // Biên độ rung (5 pixel)
                const shakeSpeed = 0.04;  // Tốc độ mỗi nhịp (40 mili-giây)

                tween(victimComp)
                    // Lắc sang trái
                    .to(shakeSpeed, { visualOffset: new Vec3(-shakeIntensity, 0, 0) }, { onUpdate: () => victimComp.drawSnake(0) })
                    // Lắc sang phải
                    .to(shakeSpeed, { visualOffset: new Vec3(shakeIntensity, 0, 0) }, { onUpdate: () => victimComp.drawSnake(0) })
                    // Lắc sang trái lần nữa
                    .to(shakeSpeed, { visualOffset: new Vec3(-shakeIntensity * 0.6, 0, 0) }, { onUpdate: () => victimComp.drawSnake(0) })
                    // Lắc sang phải lần nữa
                    .to(shakeSpeed, { visualOffset: new Vec3(shakeIntensity * 0.6, 0, 0) }, { onUpdate: () => victimComp.drawSnake(0) })
                    // Trả về vị trí cân bằng gốc (0, 0, 0)
                    .to(shakeSpeed, { visualOffset: new Vec3(0, 0, 0) }, { onUpdate: () => victimComp.drawSnake(0) })
                    .start();
            }
        }
    }

    private generateRenderPathFromSegments() {
        const cols = GridManager.Instance.cols;
        const rows = GridManager.Instance.rows;
        const dotDistance = this.gridSpacing * 2;
        const totalDots = this.snakeSegments.length;

        this.renderPathCurrent = [];

        for (let i = 0; i < totalDots; i++) {
            const curr = this.snakeSegments[i];
            const posX = (curr.gridX - cols / 2) * dotDistance;
            const posY = (curr.gridY - rows / 2) * dotDistance;

            this.renderPathCurrent.push({ x: posX, y: posY, dir: curr.direction });

            if (i < totalDots - 1) {
                const next = this.snakeSegments[i + 1];
                const nextX = (next.gridX - cols / 2) * dotDistance;
                const nextY = (next.gridY - rows / 2) * dotDistance;

                const dx = nextX - posX;
                const dy = nextY - posY;

                this.renderPathCurrent.push({ x: posX + dx / 3, y: posY + dy / 3, dir: curr.direction });
                this.renderPathCurrent.push({ x: posX + dx * 2 / 3, y: posY + dy * 2 / 3, dir: curr.direction });
            }
        }
    }

    public drawSnake(progress: number) {
        this.node.removeAllChildren();

        const totalDots = this.snakeSegments.length;
        if (totalDots < 2) return;

        const segmentSize = this.gridSpacing * 1.32;
        const totalRenderNodes = this.renderPathCurrent.length;

        for (let i = 0; i < totalRenderNodes; i++) {
            const currPath = this.renderPathCurrent[i];
            let prevPath = currPath;
            let targetPath = currPath;
            let localProgress = 0;

            if (this.isMoving && this.renderPathPrevious.length > 0) {
                if (i >= 3) {
                    if (progress < 1 / 3) {
                        prevPath = this.renderPathPrevious[i] || currPath;
                        targetPath = this.renderPathPrevious[i - 1] || prevPath;
                        localProgress = progress * 3;
                    } else if (progress < 2 / 3) {
                        prevPath = this.renderPathPrevious[i - 1] || currPath;
                        targetPath = this.renderPathPrevious[i - 2] || prevPath;
                        localProgress = (progress - 1 / 3) * 3;
                    } else {
                        prevPath = this.renderPathPrevious[i - 2] || currPath;
                        targetPath = this.renderPathPrevious[i - 3] || currPath;
                        localProgress = (progress - 2 / 3) * 3;
                    }
                } else {
                    prevPath = this.renderPathPrevious[i] || currPath;
                    targetPath = currPath;
                    localProgress = progress;
                }
            }

            let interpX = math.lerp(prevPath.x, targetPath.x, localProgress);
            let interpY = math.lerp(prevPath.y, targetPath.y, localProgress);
            const finalDir = localProgress < 0.5 ? prevPath.dir : targetPath.dir;

            interpX += this.visualOffset.x;
            interpY += this.visualOffset.y;

            let spriteFrame = this.bodySprite;
            let name = `Body_${i}`;
            let sizeFactor = 1.0;
            let zOrder = i * 10;

            if (i === 0) {
                spriteFrame = this.headSprite;
                name = "Head";
                sizeFactor = 1.15;
                zOrder = 0;
                if (this.headEyeSprite) {
                    this.createSegmentNode("HeadEye", this.headEyeSprite, interpX, interpY, finalDir, segmentSize * 1.1, -1);
                }
            } else if (i === totalRenderNodes - 1) {
                spriteFrame = this.tail2Sprite;
                name = "Tail2";
                sizeFactor = 0.75;
                zOrder = zOrder + 5;
            } else if (i === totalRenderNodes - 2) {
                spriteFrame = this.tail1Sprite;
                name = "Tail1";
                sizeFactor = 0.9;
                zOrder = zOrder + 4;
            } else if (i % 3 === 0) {
                spriteFrame = this.bodySprite;
                name = `DotSegment_${i}`;
            } else {
                spriteFrame = this.bodySprite;
                name = `BetweenSegment_${i}`;
            }

            this.createSegmentNode(name, spriteFrame, interpX, interpY, finalDir, segmentSize * sizeFactor, zOrder);
        }

        const children = [...this.node.children];
        children.sort((a: any, b: any) => (b.customZOrder || 0) - (a.customZOrder || 0));
        this.node.removeAllChildren();
        children.forEach(child => this.node.addChild(child));
    }

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
        let victimSnakeId = ""; // Lưu ID nạn nhân

        while (true) {
            const head = tempSegments[0];
            const nextCoords = this.getNextCoordinate(head.gridX, head.gridY, head.direction);

            const cellValue = GridManager.Instance.isCellEmpty(nextCoords.x, nextCoords.y, this.snakeId);
            if (!cellValue) {
                if (nextCoords.x < 0 || nextCoords.x >= GridManager.Instance.cols || 
                    nextCoords.y < 0 || nextCoords.y >= GridManager.Instance.rows) {
                    steps++; 
                    hasCollision = false;
                } else {
                    hasCollision = true;
                    collisionDir = head.direction;
                    // 🌟 LẤY ID: Truy vấn trực tiếp ma trận xem ai đang đứng ô này để gán làm nạn nhân
                    victimSnakeId = GridManager.Instance["gridMatrix"][nextCoords.x][nextCoords.y];
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

        return { steps, hasCollision, collisionDir, victimSnakeId };
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

    private getSegmentsAtStep(step: number): SnakeNodeData[] {
        // Khởi tạo lại từ bản backup ban đầu
        let segments = JSON.parse(this.originalPathBackup) as SnakeNodeData[];
        
        // Giả lập chạy tiến 'step' lần để lấy đúng tọa độ của step đó
        for (let s = 0; s < step; s++) {
            const head = segments[0];
            const nextCoords = this.getNextCoordinate(head.gridX, head.gridY, head.direction);
            
            for (let i = segments.length - 1; i > 0; i--) {
                segments[i].gridX = segments[i - 1].gridX;
                segments[i].gridY = segments[i - 1].gridY;
                segments[i].direction = segments[i - 1].direction;
            }
            segments[0].gridX = nextCoords.x;
            segments[0].gridY = nextCoords.y;
        }
        
        return segments;
    }
}