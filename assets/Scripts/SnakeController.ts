import { _decorator, Component, Node, Sprite, SpriteFrame, Vec3, UITransform, Size, math, tween, sp } from 'cc';
import { SnakeColor, SnakeNodeData, MoveDirection } from './SnakeCommon';
import { GridManager } from './GridManager';
import { TimeManager } from './TimeManager';
import { HealthManager } from './HealthManager';
import { AudioManager } from './AudioManager';

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

    @property(sp.Skeleton)
    private faceSkeleton: sp.Skeleton = null!;

    @property({ displayName: "Tỉ lệ Scale Mắt gốc", min: 0.01, max: 2.0 })
    private eyeScaleFactor: number = 0.3;

    @property({ displayName: "Đẩy mắt lên trước (Pixel)" })
    private eyeOffsetForward: number = 25;

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
    private visualOffset: Vec3 = new Vec3(0, 0, 0);
    private visualScale: number = 1.0;  
    private collidedSnakeIds: string[] = [];

    private isStunned: boolean = false;
    private stunTimer: number = 0;
    private readonly STUN_DURATION: number = 2.0;

    protected onLoad() {
        this.snakeId = `snake_${SnakeController.nextSnakeId++}`;
        const rootSprite = this.node.getComponent(Sprite);
        if (rootSprite) rootSprite.enabled = false;

        this.node.on(Node.EventType.TOUCH_END, this.onSnakeClicked, this);
    }

    private changeFaceAnimation(animName: string, loop: boolean = true) {
        if (!this.faceSkeleton) return;
        if (this.faceSkeleton.animation === animName) return;
        this.faceSkeleton.setAnimation(0, animName, loop);
    }

    public initSnake(color: SnakeColor, path: SnakeNodeData[], spacing: number) {
        this.gridSpacing = spacing;
        this.snakeSegments = path;
        
        this.registerToGrid();
        
        this.generateRenderPathFromSegments();
        this.renderPathPrevious = JSON.parse(JSON.stringify(this.renderPathCurrent));
        
        this.drawSnake(0);

        this.changeFaceAnimation('idle', true);
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

        if (TimeManager.Instance) {
            if (TimeManager.Instance.isGamePaused || TimeManager.Instance.isGameOver) {
                return; 
            }
        }

        if (AudioManager.Instance) {
            AudioManager.Instance.playSFX(AudioManager.Instance.seSnakeTap);
        }

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
        this.victimSnakeId = simulation.victimSnakeId; 
        
        if (this.isEscaping) {
            if (TimeManager.Instance) {
                TimeManager.Instance.addEscapedSnake(); 
            }
            this.changeFaceAnimation('happy', true);
        }

        if (AudioManager.Instance) {
            AudioManager.Instance.playSFX(AudioManager.Instance.seSnakeMove);
        }

        this.isReversing = false; 
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
        if (this.isStunned) {
            this.stunTimer -= dt;
            if (this.stunTimer <= 0) {
                this.isStunned = false;
                
                // Nếu thời gian 3 giây đã hết VÀ con rắn đã hoàn tất quá trình bò lùi về vạch xuất phát ban đầu
                if (!this.isStepTransitioning && this.isMoving) {
                    this.isMoving = false; // Mở khóa chính thức cho phép người chơi click lại con rắn này
                    this.changeFaceAnimation('idle', true); // Trả hoạt ảnh mắt về trạng thái đảo mắt bình thường
                }
            }
        }

        if (!this.isStepTransitioning) return;
        if (TimeManager.Instance && TimeManager.Instance.isGamePaused) return;

        let maxProgress = 1.0;
        const COLLISION_NUDGE = 0.30; 

        if (!this.isEscaping && this.hasCollision && this.totalSteps === 0) {
            maxProgress = COLLISION_NUDGE;
        }

        // Tăng/Giảm tiến trình moveProgress dựa vào trạng thái tiến hay lùi
        if (!this.isReversing) {
            this.moveProgress += dt / this.stepDuration;
        } else {
            this.moveProgress -= dt / (this.stepDuration * 1.5); // Đi lùi về chậm hơn một chút nhìn sẽ tự nhiên hơn
        }

        // ========================================================
        // --- KHỐI XỬ LÝ KHI TIẾN ĐẠT GIỚI HẠN MỐC TIẾN ---
        // ========================================================
        if (!this.isReversing && this.moveProgress >= maxProgress) {
            if (!this.isEscaping && this.hasCollision && this.totalSteps === 0) {
                this.changeFaceAnimation('dizzy', true);
                this.isStunned = true;
                this.stunTimer = this.STUN_DURATION;

                // 2. Kích hoạt hiệu ứng phồng to giật mình cho con rắn nạn nhân tại chỗ
                this.triggerVictimAnimation();
                
                // 3. Kiểm tra lịch sử đụng độ hai chiều để trừ mạng / nháy đỏ
                if (this.victimSnakeId && !this.collidedSnakeIds.includes(this.victimSnakeId)) {
                    if (TimeManager.Instance) TimeManager.Instance.playRedAura();
                    if (HealthManager.Instance) HealthManager.Instance.loseHeart();

                    this.addCollisionRecord(this.victimSnakeId);
                    const snakeContainer = this.node.parent;
                    if (snakeContainer) {
                        const victimNode = snakeContainer.children.find(child => {
                            const comp = child.getComponent(SnakeController);
                            return comp && comp.snakeId === this.victimSnakeId;
                        });
                        if (victimNode) {
                            const victimComp = victimNode.getComponent(SnakeController);
                            if (victimComp) victimComp.addCollisionRecord(this.snakeId);
                        }
                    }

                    if (TimeManager.Instance) TimeManager.Instance.hideRedAura();
                } else {
                    console.log(`💫 [Stun Effect]: Rắn ${this.snakeId} và Rắn ${this.victimSnakeId} tái đụng độ! Chỉ kích hoạt hiệu ứng choáng và tự động đi lùi.`);
                }

                // Phát lệnh quay xe đi lùi (moveProgress đang ở mức 0.30 sẽ tự động tụt mượt mà về 0)
                this.isReversing = true;
            } 
            else {
                this.moveProgress = 0;
                this.currentStep++;

                // Trường hợp 1: Rắn đang trên đường thoát màn thành công (Escape)
                if (this.isEscaping) {
                    const totalEscapeSteps = this.totalSteps + this.snakeSegments.length + 2 + this.extraEscapeSteps;
                    if (this.currentStep < totalEscapeSteps) {
                        this.prepareNextStep();
                    } else {
                        this.isStepTransitioning = false;
                        this.node.destroy(); // Hủy node khi đã bò ra khỏi map hoàn toàn
                        return;
                    }
                } 
                // Trường hợp 2: Rắn bò từ xa và có lộ trình va chạm (totalSteps > 0)
                else {
                    // Nếu chưa bò tới ô va chạm cuối cùng -> Tiếp tục bước tiến tiếp theo
                    if (this.currentStep < this.totalSteps) {
                        this.prepareNextStep();
                    } 
                    // ĐÃ ĐẾN Ô VA CHẠM CUỐI CÙNG (Dừng ở rìa thân nạn nhân chuẩn 100% theo bản gốc của bạn)
                    else {
                        this.changeFaceAnimation('dizzy', true);
                        this.isStunned = true;
                        this.stunTimer = this.STUN_DURATION;

                        // 2. Kích hoạt hiệu ứng phồng to giật mình cho con rắn nạn nhân tại chỗ
                        this.triggerVictimAnimation();
                        
                        // 3. Kiểm tra lịch sử đụng độ hai chiều để trừ mạng / nháy đỏ
                        if (this.victimSnakeId && !this.collidedSnakeIds.includes(this.victimSnakeId)) {
                            if (TimeManager.Instance) TimeManager.Instance.playRedAura();
                            if (HealthManager.Instance) HealthManager.Instance.loseHeart();

                            this.addCollisionRecord(this.victimSnakeId);
                            const snakeContainer = this.node.parent;
                            if (snakeContainer) {
                                const victimNode = snakeContainer.children.find(child => {
                                    const comp = child.getComponent(SnakeController);
                                    return comp && comp.snakeId === this.victimSnakeId;
                                });
                                if (victimNode) {
                                    const victimComp = victimNode.getComponent(SnakeController);
                                    if (victimComp) victimComp.addCollisionRecord(this.snakeId);
                                }
                            }

                            if (TimeManager.Instance) {
                                TimeManager.Instance.hideRedAura();
                            }
                        } else {
                            console.log(`💫 [Stun Effect]: Rắn ${this.snakeId} và Rắn ${this.victimSnakeId} tái đụng độ! Chỉ kích hoạt hiệu ứng choáng và tự động đi lùi.`);
                        }

                        this.isReversing = true;
                        this.moveProgress = 1; // Giữ nguyên nấc lùi trọn vẹn từ 1 về 0 ban đầu của bạn
                    }
                }
            }
        }

        // ========================================================
        // --- KHỐI XỬ LÝ KHI LÙI HẾT TIẾN TRÌNH ---
        // ========================================================
        if (this.isReversing && this.moveProgress <= 0) {
            
            // Dứt điểm riêng cho trường hợp ở cạnh nhau (totalSteps = 0): Kết thúc lùi lập tức từ mốc 0.3 về 0
            if (this.totalSteps === 0) {
                this.isReversing = false;
                this.moveProgress = 0;

                this.snakeSegments = JSON.parse(this.originalPathBackup);
                this.registerToGrid();
                
                this.generateRenderPathFromSegments();
                this.renderPathPrevious = JSON.parse(JSON.stringify(this.renderPathCurrent));
                this.drawSnake(0);
                
                if (this.isStunned) {
                    // Nếu chưa đủ 3 giây, tắt di chuyển đồ họa nhưng giữ nguyên trạng thái khóa click (isMoving = true)
                    this.isStepTransitioning = false;
                } else {
                    // Nếu thời gian choáng 3 giây đã hết trước đó, giải phóng hoàn toàn và tỉnh lại luôn
                    this.isStepTransitioning = false;
                    this.isMoving = false;
                    this.changeFaceAnimation('idle', true);
                }
                return;
            }

            // Logic đi lùi từ xa (totalSteps > 0) giữ nguyên 100% bản gốc của bạn để đuôi chuyển động chuẩn
            this.moveProgress = 1;
            this.currentStep--;

            if (this.currentStep > 0) {
                this.prepareNextReverseStep();
            } else {
                this.isReversing = false;
                this.moveProgress = 0;

                this.snakeSegments = JSON.parse(this.originalPathBackup);
                this.registerToGrid();
                
                this.generateRenderPathFromSegments();
                this.renderPathPrevious = JSON.parse(JSON.stringify(this.renderPathCurrent));
                this.drawSnake(0);
                
                if (this.isStunned) {
                    this.isStepTransitioning = false;
                } else {
                    this.isStepTransitioning = false;
                    this.isMoving = false;
                    this.changeFaceAnimation('idle', true);
                }
                return;
            }
        }

        // Thực hiện render đồ họa mượt mà dựa trên tiến trình moveProgress thực tế
        this.drawSnake(this.moveProgress);
    }

    // File: SnakeController.ts
    private triggerVictimAnimation() {
        if (!this.victimSnakeId) return;

        const snakeContainer = this.node.parent;
        if (!snakeContainer) return;

        const victimNode = snakeContainer.children.find(child => {
            const comp = child.getComponent(SnakeController);
            return comp && comp.snakeId === this.victimSnakeId;
        });

        if (victimNode) {
            const victimComp = victimNode.getComponent(SnakeController);
            if (victimComp) {
                // Dừng các tween cũ nếu có để tránh chồng chéo hiệu ứng
                tween(victimComp).stop();
                victimComp.visualOffset.set(0, 0, 0);
                victimComp.visualScale = 1.0; // Reset về kích thước chuẩn trước khi phồng

                const targetZoom = 1.4; // Tỉ lệ phóng to (Phồng to lên 125%)

                tween(victimComp)
                    // Nhịp 1: Phồng to lên nhanh chóng trong 0.06 giây (Tạo cảm giác bị đâm giật mình)
                    .to(0.1, { visualScale: targetZoom }, { 
                        easing: 'sineOut', 
                        onUpdate: () => victimComp.drawSnake(0) 
                    })
                    .to(0.1, { visualScale: 1.0 }, { 
                        easing: 'backOut', 
                        onUpdate: () => victimComp.drawSnake(0) 
                    })
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
            
            // 🔥 SỬA TẠI ĐÂY: Đổi từ cols / 2 thành (cols - 1) / 2
            const posX = (curr.gridX - (cols - 1) / 2) * dotDistance;
            const posY = (curr.gridY - (rows - 1) / 2) * dotDistance;

            this.renderPathCurrent.push({ x: posX, y: posY, dir: curr.direction });

            if (i < totalDots - 1) {
                const next = this.snakeSegments[i + 1];
                
                const nextX = (next.gridX - (cols - 1) / 2) * dotDistance;
                const nextY = (next.gridY - (rows - 1) / 2) * dotDistance;

                const dx = nextX - posX;
                const dy = nextY - posY;

                this.renderPathCurrent.push({ x: posX + dx / 3, y: posY + dy / 3, dir: curr.direction });
                this.renderPathCurrent.push({ x: posX + dx * 2 / 3, y: posY + dy * 2 / 3, dir: curr.direction });
            }
        }
    }

    public addCollisionRecord(otherSnakeId: string) {
        if (!this.collidedSnakeIds.includes(otherSnakeId)) {
            this.collidedSnakeIds.push(otherSnakeId);
        }
    }

    public drawSnake(progress: number) {
        for (let i = this.node.children.length - 1; i >= 0; i--) {
            const child = this.node.children[i];
            if (this.faceSkeleton && child === this.faceSkeleton.node) {
                continue;
            }
            child.destroy();
            this.node.removeChild(child);
        }

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

                if (this.faceSkeleton) {
                    this.faceSkeleton.node.active = true;

                    // 1. Lấy vị trí tâm đầu rắn hiện tại
                    let eyeX = interpX;
                    let eyeY = interpY;

                    switch (finalDir) {
                        case MoveDirection.UP: 
                            eyeY += this.eyeOffsetForward; // Bò lên thì cộng thêm Y
                            break;
                        case MoveDirection.DOWN: 
                            eyeY -= this.eyeOffsetForward; // Bò xuống thì trừ bớt Y
                            break;
                        case MoveDirection.LEFT: 
                            eyeX -= this.eyeOffsetForward; // Bò qua trái thì trừ bớt X
                            break;
                        case MoveDirection.RIGHT: 
                            eyeX += this.eyeOffsetForward; // Bò qua phải thì cộng thêm X
                            break;
                    }

                    this.faceSkeleton.node.setPosition(new Vec3(eyeX, eyeY, 0));
                    this.faceSkeleton.node.angle = this.getRotationAngle(finalDir);
                    
                    const finalScale = this.eyeScaleFactor * this.visualScale;
                    this.faceSkeleton.node.setScale(new Vec3(finalScale, finalScale, 1));

                    (this.faceSkeleton.node as any).customZOrder = -10; 
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

            this.createSegmentNode(name, spriteFrame, interpX, interpY, finalDir, segmentSize * sizeFactor * this.visualScale, zOrder);
        }

        const children = [...this.node.children];
        children.sort((a: any, b: any) => (b.customZOrder || 0) - (a.customZOrder || 0));

        children.forEach(child => this.node.removeChild(child)); // Tháo ra tạm thời
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