import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
import { GridManager } from './GridManager';
import { SnakeController } from './SnakeController';
import { SnakeColor, MoveDirection } from './SnakeCommon';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    @property(Prefab) 
    private dotPrefab: Prefab = null!;

    @property({ type: Prefab, group: { name: 'Cấu hình Rắn theo Màu' }, displayName: "Rắn Xanh Dương (Blue)" }) 
    private snakeBluePrefab: Prefab = null!;

    @property({ type: Prefab, group: { name: 'Cấu hình Rắn theo Màu' }, displayName: "Rắn Đỏ (Red)" }) 
    private snakeRedPrefab: Prefab = null!;

    @property({ type: Prefab, group: { name: 'Cấu hình Rắn theo Màu' }, displayName: "Rắn Xanh Lá (Green)" }) 
    private snakeGreenPrefab: Prefab = null!;

    @property({ type: Prefab, group: { name: 'Cấu hình Rắn theo Màu' }, displayName: "Rắn Vàng (Yellow)" }) 
    private snakeYellowPrefab: Prefab = null!;

    @property({ type: Prefab, group: { name: 'Cấu hình Rắn theo Màu' }, displayName: "Rắn Tím (Violet)" }) 
    private snakeVioletPrefab: Prefab = null!;

    @property(Node) 
    private gridContainer: Node = null!;
    
    @property(Node) 
    private snakeContainer: Node = null!;

    @property({ displayName: "Khoảng cách Sprite (1/2 ô lưới)" })
    public spacing: number = 20; 

    protected start() {
        this.generateGridVisuals();
        this.spawnLevel();
    }

    // Tự động sinh ma trận các dấu chấm tròn trực quan lên màn hình
    private generateGridVisuals() {
        const cols = GridManager.Instance.cols;
        const rows = GridManager.Instance.rows;
        
        // Khoảng cách giữa 2 chấm tròn bằng 2 lần spacing của sprite
        const dotDistance = this.spacing * 2; 

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const dot = instantiate(this.dotPrefab);
                // Căn giữa ma trận lưới xung quanh tâm (0,0) của Container
                const posX = (x - cols / 2) * dotDistance;
                const posY = (y - rows / 2) * dotDistance;
                
                dot.setPosition(posX, posY, 0);
                this.gridContainer.addChild(dot);
            }
        }
    }

    // Hàm tiện ích lấy đúng Prefab dựa theo Enum SnakeColor
    private getSnakePrefabByColor(color: SnakeColor): Prefab {
        switch (color) {
            case SnakeColor.BLUE: 
                return this.snakeBluePrefab;
            case SnakeColor.RED: 
                return this.snakeRedPrefab;
            case SnakeColor.GREEN: 
                return this.snakeGreenPrefab;
            case SnakeColor.YELLOW: 
                return this.snakeYellowPrefab;
            case SnakeColor.VIOLET: 
                return this.snakeVioletPrefab;
            default:
                return this.snakeBluePrefab;
        }
    }

    private spawnLevel() {
        for (const snakeData of this.levelData) {
            const prefabToSpawn = this.getSnakePrefabByColor(snakeData.color);

            if (!prefabToSpawn) {
                console.error("Thiếu prefab màu:", snakeData.color);
                continue;
            }

            const snakeNode = instantiate(prefabToSpawn);
            this.snakeContainer.addChild(snakeNode);

            const snakeComp = snakeNode.getComponent(SnakeController);
            if (!snakeComp) {
                console.error("Prefab chưa có SnakeController");
                continue;
            }

            const independentPath = JSON.parse(JSON.stringify(snakeData.path));

            snakeComp.initSnake(
                snakeData.color,
                independentPath, // Truyền mảng độc lập vào đây
                this.spacing
            );
        }
    }

    private levelData = [
        {
            color: SnakeColor.BLUE,
            path: [
                { gridX: 0, gridY: 22, direction: MoveDirection.UP },
                { gridX: 0, gridY: 21, direction: MoveDirection.UP },
                { gridX: 0, gridY: 20, direction: MoveDirection.UP },
                { gridX: 0, gridY: 19, direction: MoveDirection.UP },
                { gridX: 0, gridY: 18, direction: MoveDirection.UP },
                { gridX: 0, gridY: 17, direction: MoveDirection.UP },
                { gridX: 0, gridY: 16, direction: MoveDirection.LEFT },
                { gridX: 1, gridY: 16, direction: MoveDirection.DOWN },
                { gridX: 1, gridY: 17, direction: MoveDirection.DOWN },
            ]
        },

        {
            color: SnakeColor.YELLOW,
            path: [
                { gridX: 2, gridY: 17, direction: MoveDirection.DOWN },
                { gridX: 2, gridY: 18, direction: MoveDirection.RIGHT },
                { gridX: 1, gridY: 18, direction: MoveDirection.DOWN },
                { gridX: 1, gridY: 18, direction: MoveDirection.DOWN },
                { gridX: 1, gridY: 19, direction: MoveDirection.DOWN },
                { gridX: 1, gridY: 20, direction: MoveDirection.DOWN },
                { gridX: 1, gridY: 21, direction: MoveDirection.DOWN },
                { gridX: 1, gridY: 22, direction: MoveDirection.DOWN },
            ]
        },

        {
            color: SnakeColor.RED,
            path: [
                { gridX: 0, gridY: 15, direction: MoveDirection.UP },
                { gridX: 0, gridY: 14, direction: MoveDirection.UP },
                { gridX: 0, gridY: 13, direction: MoveDirection.UP },
                { gridX: 0, gridY: 12, direction: MoveDirection.UP },
                { gridX: 0, gridY: 11, direction: MoveDirection.UP },
                { gridX: 0, gridY: 10, direction: MoveDirection.UP },
                { gridX: 0, gridY: 9, direction: MoveDirection.UP },
                { gridX: 0, gridY: 8, direction: MoveDirection.UP },
                { gridX: 0, gridY: 7, direction: MoveDirection.UP },
                { gridX: 0, gridY: 6, direction: MoveDirection.UP },
                { gridX: 0, gridY: 5, direction: MoveDirection.UP },
                { gridX: 0, gridY: 4, direction: MoveDirection.LEFT },
                { gridX: 1, gridY: 4, direction: MoveDirection.LEFT },
                { gridX: 2, gridY: 4, direction: MoveDirection.UP },
                { gridX: 2, gridY: 3, direction: MoveDirection.UP },
                { gridX: 2, gridY: 2, direction: MoveDirection.UP },
            ]
        },

        {
            color: SnakeColor.GREEN,
            path: [
                { gridX: 2, gridY: 15, direction: MoveDirection.RIGHT },
                { gridX: 1, gridY: 15, direction: MoveDirection.RIGHT },
            ]
        },

        {
            color: SnakeColor.VIOLET,
            path: [
                { gridX: 7, gridY: 21, direction: MoveDirection.UP },
                { gridX: 7, gridY: 20, direction: MoveDirection.UP },
                { gridX: 7, gridY: 19, direction: MoveDirection.UP },
                { gridX: 7, gridY: 18, direction: MoveDirection.UP },
                { gridX: 7, gridY: 17, direction: MoveDirection.UP },
                { gridX: 7, gridY: 16, direction: MoveDirection.UP },
                { gridX: 7, gridY: 15, direction: MoveDirection.RIGHT },
                { gridX: 6, gridY: 15, direction: MoveDirection.RIGHT },
                { gridX: 5, gridY: 15, direction: MoveDirection.RIGHT },
                { gridX: 4, gridY: 15, direction: MoveDirection.RIGHT },
                { gridX: 3, gridY: 15, direction: MoveDirection.RIGHT },
            ]
        },

        {
            color: SnakeColor.RED,
            path: [
                { gridX: 2, gridY: 19, direction: MoveDirection.DOWN },
                { gridX: 2, gridY: 20, direction: MoveDirection.DOWN },
                { gridX: 2, gridY: 21, direction: MoveDirection.LEFT },
                { gridX: 3, gridY: 21, direction: MoveDirection.LEFT },
                { gridX: 4, gridY: 21, direction: MoveDirection.LEFT },
                { gridX: 5, gridY: 21, direction: MoveDirection.LEFT },
                { gridX: 6, gridY: 21, direction: MoveDirection.UP },
                { gridX: 6, gridY: 20, direction: MoveDirection.UP },
                { gridX: 6, gridY: 19, direction: MoveDirection.UP },
                { gridX: 6, gridY: 18, direction: MoveDirection.UP },
                { gridX: 6, gridY: 17, direction: MoveDirection.UP },
                { gridX: 6, gridY: 16, direction: MoveDirection.RIGHT },
                { gridX: 5, gridY: 16, direction: MoveDirection.RIGHT },
                { gridX: 4, gridY: 16, direction: MoveDirection.RIGHT },
                { gridX: 3, gridY: 16, direction: MoveDirection.DOWN },
                { gridX: 3, gridY: 17, direction: MoveDirection.DOWN },
                { gridX: 3, gridY: 18, direction: MoveDirection.DOWN },
                { gridX: 3, gridY: 19, direction: MoveDirection.DOWN },
                { gridX: 3, gridY: 20, direction: MoveDirection.LEFT },
                { gridX: 4, gridY: 20, direction: MoveDirection.LEFT },
                { gridX: 5, gridY: 20, direction: MoveDirection.UP },
                { gridX: 5, gridY: 19, direction: MoveDirection.UP },
                { gridX: 5, gridY: 18, direction: MoveDirection.RIGHT },
                { gridX: 4, gridY: 18, direction: MoveDirection.UP },
                { gridX: 4, gridY: 17, direction: MoveDirection.LEFT },
                { gridX: 5, gridY: 17, direction: MoveDirection.LEFT },
            ]
        },

        {
            color: SnakeColor.BLUE,
            path: [
                { gridX: 8, gridY: 16, direction: MoveDirection.DOWN },
                { gridX: 8, gridY: 17, direction: MoveDirection.DOWN },
                { gridX: 8, gridY: 18, direction: MoveDirection.DOWN },
                { gridX: 8, gridY: 19, direction: MoveDirection.DOWN },
                { gridX: 8, gridY: 20, direction: MoveDirection.DOWN },
                { gridX: 8, gridY: 21, direction: MoveDirection.DOWN },
            ]
        },

        {
            color: SnakeColor.VIOLET,
            path: [
                { gridX: 5, gridY: 11, direction: MoveDirection.DOWN },
                { gridX: 5, gridY: 12, direction: MoveDirection.DOWN },
                { gridX: 5, gridY: 13, direction: MoveDirection.DOWN },
                { gridX: 5, gridY: 14, direction: MoveDirection.RIGHT },
                { gridX: 4, gridY: 14, direction: MoveDirection.RIGHT },
                { gridX: 3, gridY: 14, direction: MoveDirection.RIGHT },
                { gridX: 2, gridY: 14, direction: MoveDirection.RIGHT },
                { gridX: 1, gridY: 14, direction: MoveDirection.UP },
                { gridX: 1, gridY: 13, direction: MoveDirection.LEFT },
                { gridX: 2, gridY: 13, direction: MoveDirection.UP },
                { gridX: 2, gridY: 12, direction: MoveDirection.UP },
                { gridX: 2, gridY: 11, direction: MoveDirection.RIGHT },
                { gridX: 1, gridY: 11, direction: MoveDirection.DOWN },
                { gridX: 1, gridY: 12, direction: MoveDirection.DOWN },
            ]
        },

        {
            color: SnakeColor.BLUE,
            path: [
                { gridX: 3, gridY: 13, direction: MoveDirection.LEFT },
                { gridX: 4, gridY: 13, direction: MoveDirection.LEFT },
            ]
        },

        {
            color: SnakeColor.GREEN,
            path: [
                { gridX: 3, gridY: 12, direction: MoveDirection.LEFT },
                { gridX: 4, gridY: 12, direction: MoveDirection.UP },
                { gridX: 4, gridY: 11, direction: MoveDirection.RIGHT },
                { gridX: 3, gridY: 11, direction: MoveDirection.RIGHT },
            ]
        },

        {
            color: SnakeColor.RED,
            path: [
                { gridX: 4, gridY: 9, direction: MoveDirection.DOWN },
                { gridX: 4, gridY: 10, direction: MoveDirection.RIGHT },
                { gridX: 3, gridY: 10, direction: MoveDirection.UP },
                { gridX: 3, gridY: 9, direction: MoveDirection.RIGHT },
                { gridX: 2, gridY: 9, direction: MoveDirection.DOWN },
                { gridX: 2, gridY: 10, direction: MoveDirection.RIGHT },
                { gridX: 1, gridY: 10, direction: MoveDirection.UP },
                { gridX: 1, gridY: 9, direction: MoveDirection.UP },
            ]
        },

        {
            color: SnakeColor.YELLOW,
            path: [
                { gridX: 5, gridY: 9, direction: MoveDirection.DOWN },
                { gridX: 5, gridY: 10, direction: MoveDirection.LEFT },
                { gridX: 6, gridY: 10, direction: MoveDirection.DOWN },
                { gridX: 6, gridY: 11, direction: MoveDirection.DOWN },
            ]
        },

        {
            color: SnakeColor.BLUE,
            path: [
                { gridX: 7, gridY: 11, direction: MoveDirection.LEFT },
                { gridX: 8, gridY: 11, direction: MoveDirection.DOWN },
                { gridX: 8, gridY: 12, direction: MoveDirection.RIGHT },
                { gridX: 7, gridY: 12, direction: MoveDirection.RIGHT },
                { gridX: 6, gridY: 12, direction: MoveDirection.DOWN },
                { gridX: 6, gridY: 13, direction: MoveDirection.DOWN },
                { gridX: 6, gridY: 14, direction: MoveDirection.LEFT },
                { gridX: 7, gridY: 14, direction: MoveDirection.LEFT },
                { gridX: 8, gridY: 14, direction: MoveDirection.UP },
                { gridX: 8, gridY: 13, direction: MoveDirection.RIGHT },
                { gridX: 7, gridY: 13, direction: MoveDirection.RIGHT },
            ]
        },

        {
            color: SnakeColor.YELLOW,
            path: [
                { gridX: 10, gridY: 21, direction: MoveDirection.UP },
                { gridX: 10, gridY: 20, direction: MoveDirection.UP },
                { gridX: 10, gridY: 19, direction: MoveDirection.UP },
                { gridX: 10, gridY: 18, direction: MoveDirection.UP },
                { gridX: 10, gridY: 17, direction: MoveDirection.UP },
                { gridX: 10, gridY: 16, direction: MoveDirection.UP },
                { gridX: 10, gridY: 15, direction: MoveDirection.UP },
                { gridX: 10, gridY: 14, direction: MoveDirection.UP },
                { gridX: 10, gridY: 13, direction: MoveDirection.UP },
                { gridX: 10, gridY: 12, direction: MoveDirection.RIGHT },
                { gridX: 9, gridY: 12, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 13, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 14, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 15, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 16, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 17, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 18, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 19, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 20, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 21, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 22, direction: MoveDirection.RIGHT },
                { gridX: 8, gridY: 22, direction: MoveDirection.RIGHT },
                { gridX: 7, gridY: 22, direction: MoveDirection.RIGHT },
                { gridX: 6, gridY: 22, direction: MoveDirection.RIGHT },
                { gridX: 5, gridY: 22, direction: MoveDirection.RIGHT },
                { gridX: 4, gridY: 22, direction: MoveDirection.RIGHT },
                { gridX: 3, gridY: 22, direction: MoveDirection.RIGHT },
                { gridX: 2, gridY: 22, direction: MoveDirection.RIGHT },
            ]
        },

        {
            color: SnakeColor.YELLOW,
            path: [
                { gridX: 1, gridY: 3, direction: MoveDirection.RIGHT },
                { gridX: 0, gridY: 3, direction: MoveDirection.RIGHT },
            ]
        },

        {
            color: SnakeColor.RED,
            path: [
                { gridX: 6, gridY: 2, direction: MoveDirection.RIGHT },
                { gridX: 5, gridY: 2, direction: MoveDirection.RIGHT },
                { gridX: 4, gridY: 2, direction: MoveDirection.UP },
                { gridX: 4, gridY: 1, direction: MoveDirection.UP },
                { gridX: 4, gridY: 0, direction: MoveDirection.RIGHT },
                { gridX: 3, gridY: 0, direction: MoveDirection.RIGHT },
                { gridX: 2, gridY: 0, direction: MoveDirection.RIGHT },
                { gridX: 1, gridY: 0, direction: MoveDirection.RIGHT },
                { gridX: 0, gridY: 0, direction: MoveDirection.DOWN },
                { gridX: 0, gridY: 1, direction: MoveDirection.DOWN },
                { gridX: 0, gridY: 2, direction: MoveDirection.LEFT },
                { gridX: 1, gridY: 2, direction: MoveDirection.UP },
                { gridX: 1, gridY: 1, direction: MoveDirection.LEFT },
                { gridX: 2, gridY: 1, direction: MoveDirection.LEFT },
                { gridX: 3, gridY: 1, direction: MoveDirection.DOWN},
                { gridX: 3, gridY: 2, direction: MoveDirection.DOWN},
                { gridX: 3, gridY: 3, direction: MoveDirection.DOWN},
                { gridX: 3, gridY: 4, direction: MoveDirection.DOWN},
                { gridX: 3, gridY: 5, direction: MoveDirection.DOWN},
            ]
        },

        {
            color: SnakeColor.GREEN,
            path: [
                { gridX: 1, gridY: 6, direction: MoveDirection.LEFT },
                { gridX: 2, gridY: 6, direction: MoveDirection.UP },
                { gridX: 2, gridY: 5, direction: MoveDirection.RIGHT },
                { gridX: 1, gridY: 5, direction: MoveDirection.RIGHT },
            ]
        },

        {
            color: SnakeColor.VIOLET,
            path: [
                { gridX: 1, gridY: 7, direction: MoveDirection.LEFT },
                { gridX: 2, gridY: 7, direction: MoveDirection.LEFT },
            ]
        },

        {
            color: SnakeColor.BLUE,
            path: [
                { gridX: 2, gridY: 8, direction: MoveDirection.LEFT },
                { gridX: 3, gridY: 8, direction: MoveDirection.LEFT },
                { gridX: 4, gridY: 8, direction: MoveDirection.LEFT },
                { gridX: 5, gridY: 8, direction: MoveDirection.LEFT },
                { gridX: 6, gridY: 8, direction: MoveDirection.UP },
                { gridX: 6, gridY: 7, direction: MoveDirection.UP },
                { gridX: 6, gridY: 6, direction: MoveDirection.UP },
                { gridX: 6, gridY: 5, direction: MoveDirection.RIGHT },
                { gridX: 5, gridY: 5, direction: MoveDirection.DOWN },
                { gridX: 5, gridY: 6, direction: MoveDirection.RIGHT },
                { gridX: 4, gridY: 6, direction: MoveDirection.RIGHT },
                { gridX: 3, gridY: 6, direction: MoveDirection.DOWN },
                { gridX: 3, gridY: 7, direction: MoveDirection.LEFT },
                { gridX: 4, gridY: 7, direction: MoveDirection.LEFT },
                { gridX: 5, gridY: 7, direction: MoveDirection.LEFT },
            ]
        },

        {
            color: SnakeColor.GREEN,
            path: [
                { gridX: 11, gridY: 22, direction: MoveDirection.LEFT },
                { gridX: 12, gridY: 22, direction: MoveDirection.LEFT },
                { gridX: 13, gridY: 22, direction: MoveDirection.LEFT },
                { gridX: 14, gridY: 22, direction: MoveDirection.LEFT },
                { gridX: 15, gridY: 22, direction: MoveDirection.UP },
                { gridX: 15, gridY: 21, direction: MoveDirection.UP },
                { gridX: 15, gridY: 20, direction: MoveDirection.UP },
                { gridX: 15, gridY: 19, direction: MoveDirection.RIGHT },
                { gridX: 14, gridY: 19, direction: MoveDirection.DOWN },
                { gridX: 14, gridY: 20, direction: MoveDirection.RIGHT },
                { gridX: 13, gridY: 20, direction: MoveDirection.RIGHT },
                { gridX: 12, gridY: 20, direction: MoveDirection.RIGHT },
                { gridX: 11, gridY: 20, direction: MoveDirection.DOWN },
                { gridX: 11, gridY: 21, direction: MoveDirection.LEFT },
                { gridX: 12, gridY: 21, direction: MoveDirection.LEFT },
                { gridX: 13, gridY: 21, direction: MoveDirection.LEFT },
                { gridX: 14, gridY: 21, direction: MoveDirection.LEFT },
            ]
        },

        {
            color: SnakeColor.VIOLET,
            path: [
                { gridX: 17, gridY: 22, direction: MoveDirection.RIGHT },
                { gridX: 16, gridY: 22, direction: MoveDirection.UP },
                { gridX: 16, gridY: 21, direction: MoveDirection.UP },
                { gridX: 16, gridY: 20, direction: MoveDirection.UP },
                { gridX: 16, gridY: 19, direction: MoveDirection.LEFT },
                { gridX: 17, gridY: 19, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 20, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 21, direction: MoveDirection.DOWN },
            ]
        },

        {
            color: SnakeColor.RED,
            path: [
                { gridX: 12, gridY: 19, direction: MoveDirection.LEFT },
                { gridX: 13, gridY: 19, direction: MoveDirection.LEFT },      
            ]
        },

        {
            color: SnakeColor.BLUE,
            path: [
                { gridX: 8, gridY: 7, direction: MoveDirection.LEFT },
                { gridX: 9, gridY: 7, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 8, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 9, direction: MoveDirection.DOWN },
                { gridX: 9, gridY: 10, direction: MoveDirection.LEFT },
                { gridX: 10, gridY: 10, direction: MoveDirection.LEFT }, 
                { gridX: 11, gridY: 10, direction: MoveDirection.LEFT }, 
                { gridX: 12, gridY: 10, direction: MoveDirection.LEFT },
                { gridX: 13, gridY: 10, direction: MoveDirection.LEFT }, 
                { gridX: 14, gridY: 10, direction: MoveDirection.LEFT }, 
                { gridX: 15, gridY: 10, direction: MoveDirection.DOWN },
                { gridX: 15, gridY: 11, direction: MoveDirection.LEFT },  
                { gridX: 16, gridY: 11, direction: MoveDirection.LEFT },
                { gridX: 17, gridY: 11, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 12, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 13, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 14, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 15, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 16, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 17, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 18, direction: MoveDirection.RIGHT },
                { gridX: 16, gridY: 18, direction: MoveDirection.RIGHT },
                { gridX: 15, gridY: 18, direction: MoveDirection.RIGHT },
                { gridX: 14, gridY: 18, direction: MoveDirection.RIGHT },
                { gridX: 13, gridY: 18, direction: MoveDirection.RIGHT },
                { gridX: 12, gridY: 18, direction: MoveDirection.RIGHT },
                { gridX: 11, gridY: 18, direction: MoveDirection.UP },
                { gridX: 11, gridY: 17, direction: MoveDirection.UP },
                { gridX: 11, gridY: 16, direction: MoveDirection.UP },
                { gridX: 11, gridY: 15, direction: MoveDirection.LEFT },
                { gridX: 12, gridY: 15, direction: MoveDirection.LEFT },
                { gridX: 13, gridY: 15, direction: MoveDirection.LEFT },
                { gridX: 14, gridY: 15, direction: MoveDirection.LEFT },
                { gridX: 15, gridY: 15, direction: MoveDirection.LEFT },
                { gridX: 16, gridY: 15, direction: MoveDirection.DOWN }, 
                { gridX: 16, gridY: 16, direction: MoveDirection.DOWN }, 
                { gridX: 16, gridY: 17, direction: MoveDirection.RIGHT },
                { gridX: 15, gridY: 17, direction: MoveDirection.RIGHT },
                { gridX: 14, gridY: 17, direction: MoveDirection.RIGHT },
                { gridX: 13, gridY: 17, direction: MoveDirection.RIGHT },
                { gridX: 12, gridY: 17, direction: MoveDirection.UP },
                { gridX: 12, gridY: 16, direction: MoveDirection.LEFT },
                { gridX: 13, gridY: 16, direction: MoveDirection.LEFT },
                { gridX: 14, gridY: 16, direction: MoveDirection.LEFT },
                { gridX: 15, gridY: 16, direction: MoveDirection.LEFT },         
            ]
        },

        {
            color: SnakeColor.RED,
            path: [
                { gridX: 11, gridY: 14, direction: MoveDirection.UP },
                { gridX: 11, gridY: 13, direction: MoveDirection.LEFT },  
                { gridX: 12, gridY: 13, direction: MoveDirection.DOWN }, 
                { gridX: 12, gridY: 14, direction: MoveDirection.LEFT },
                { gridX: 13, gridY: 14, direction: MoveDirection.LEFT },
                { gridX: 14, gridY: 14, direction: MoveDirection.LEFT },      
            ]
        },

        {
            color: SnakeColor.YELLOW,
            path: [
                { gridX: 16, gridY: 14, direction: MoveDirection.RIGHT },
                { gridX: 15, gridY: 14, direction: MoveDirection.UP },
                { gridX: 15, gridY: 13, direction: MoveDirection.UP },
                { gridX: 15, gridY: 12, direction: MoveDirection.LEFT },
                { gridX: 16, gridY: 12, direction: MoveDirection.DOWN },
                { gridX: 16, gridY: 13, direction: MoveDirection.DOWN },     
            ]
        },

        {
            color: SnakeColor.GREEN,
            path: [
                { gridX: 14, gridY: 12, direction: MoveDirection.UP },
                { gridX: 14, gridY: 11, direction: MoveDirection.RIGHT },
                { gridX: 13, gridY: 11, direction: MoveDirection.DOWN },
                { gridX: 13, gridY: 12, direction: MoveDirection.DOWN },
                { gridX: 13, gridY: 13, direction: MoveDirection.DOWN },    
            ]
        },

        {
            color: SnakeColor.VIOLET,
            path: [
                { gridX: 11, gridY: 12, direction: MoveDirection.LEFT },
                { gridX: 12, gridY: 12, direction: MoveDirection.UP },
                { gridX: 12, gridY: 11, direction: MoveDirection.RIGHT },
                { gridX: 11, gridY: 11, direction: MoveDirection.RIGHT },
                { gridX: 10, gridY: 11, direction: MoveDirection.RIGHT },
                { gridX: 9, gridY: 11, direction: MoveDirection.RIGHT },    
            ]
        },

        {
            color: SnakeColor.YELLOW,
            path: [
                { gridX: 7, gridY: 8, direction: MoveDirection.DOWN },
                { gridX: 7, gridY: 9, direction: MoveDirection.DOWN },
                { gridX: 7, gridY: 10, direction: MoveDirection.LEFT },
                { gridX: 8, gridY: 10, direction: MoveDirection.UP },
                { gridX: 8, gridY: 9, direction: MoveDirection.UP },
                { gridX: 8, gridY: 8, direction: MoveDirection.UP },   
            ]
        },

        {
            color: SnakeColor.YELLOW,
            path: [
                { gridX: 8, gridY: 5, direction: MoveDirection.RIGHT },
                { gridX: 7, gridY: 5, direction: MoveDirection.DOWN }, 
                { gridX: 7, gridY: 6, direction: MoveDirection.LEFT }, 
                { gridX: 8, gridY: 6, direction: MoveDirection.LEFT }, 
                { gridX: 9, gridY: 6, direction: MoveDirection.LEFT },
                { gridX: 10, gridY: 6, direction: MoveDirection.LEFT }, 
                { gridX: 11, gridY: 6, direction: MoveDirection.DOWN },
                { gridX: 11, gridY: 7, direction: MoveDirection.DOWN },
                { gridX: 11, gridY: 8, direction: MoveDirection.RIGHT },
                { gridX: 10, gridY: 8, direction: MoveDirection.RIGHT },   
            ]
        },

        {
            color: SnakeColor.YELLOW,
            path: [
                { gridX: 14, gridY: 8, direction: MoveDirection.RIGHT },
                { gridX: 13, gridY: 8, direction: MoveDirection.RIGHT },
                { gridX: 12, gridY: 8, direction: MoveDirection.UP },
                { gridX: 12, gridY: 7, direction: MoveDirection.UP },
                { gridX: 12, gridY: 6, direction: MoveDirection.LEFT },
                { gridX: 13, gridY: 6, direction: MoveDirection.UP },
                { gridX: 13, gridY: 5, direction: MoveDirection.UP },
                { gridX: 13, gridY: 4, direction: MoveDirection.UP },
                { gridX: 13, gridY: 3, direction: MoveDirection.RIGHT },
                { gridX: 12, gridY: 3, direction: MoveDirection.RIGHT },
                { gridX: 11, gridY: 3, direction: MoveDirection.UP },
                { gridX: 11, gridY: 2, direction: MoveDirection.RIGHT },
                { gridX: 10, gridY: 2, direction: MoveDirection.DOWN },
                { gridX: 10, gridY: 3, direction: MoveDirection.DOWN },
                { gridX: 10, gridY: 4, direction: MoveDirection.RIGHT },
                { gridX: 9, gridY: 4, direction: MoveDirection.RIGHT },
                { gridX: 8, gridY: 4, direction: MoveDirection.RIGHT },
                { gridX: 7, gridY: 4, direction: MoveDirection.RIGHT },
                { gridX: 6, gridY: 4, direction: MoveDirection.RIGHT },
                { gridX: 5, gridY: 4, direction: MoveDirection.RIGHT },
                { gridX: 4, gridY: 4, direction: MoveDirection.UP },
                { gridX: 4, gridY: 3, direction: MoveDirection.LEFT },
                { gridX: 5, gridY: 3, direction: MoveDirection.LEFT },
                { gridX: 6, gridY: 3, direction: MoveDirection.LEFT },
                { gridX: 7, gridY: 3, direction: MoveDirection.LEFT },
                { gridX: 8, gridY: 3, direction: MoveDirection.LEFT },
                { gridX: 9, gridY: 3, direction: MoveDirection.UP },
                { gridX: 9, gridY: 2, direction: MoveDirection.RIGHT },
                { gridX: 8, gridY: 2, direction: MoveDirection.RIGHT }
            ]
        },

        {
            color: SnakeColor.BLUE,
            path: [
                { gridX: 11, gridY: 4, direction: MoveDirection.DOWN },
                { gridX: 11, gridY: 5, direction: MoveDirection.RIGHT },
                { gridX: 10, gridY: 5, direction: MoveDirection.RIGHT },
                { gridX: 9, gridY: 5, direction: MoveDirection.RIGHT }, 
            ]
        },

        {
            color: SnakeColor.RED,
            path: [
                { gridX: 12, gridY: 4, direction: MoveDirection.DOWN },
                { gridX: 12, gridY: 5, direction: MoveDirection.DOWN },
            ]
        },

        {
            color: SnakeColor.VIOLET,
            path: [
                { gridX: 13, gridY: 7, direction: MoveDirection.LEFT },
                { gridX: 14, gridY: 7, direction: MoveDirection.LEFT },
            ]
        },

        {
            color: SnakeColor.GREEN,
            path: [
                { gridX: 13, gridY: 2, direction: MoveDirection.RIGHT },
                { gridX: 12, gridY: 2, direction: MoveDirection.UP },
                { gridX: 12, gridY: 1, direction: MoveDirection.UP },
                { gridX: 12, gridY: 0, direction: MoveDirection.RIGHT },
                { gridX: 11, gridY: 0, direction: MoveDirection.DOWN },
                { gridX: 11, gridY: 1, direction: MoveDirection.RIGHT },
                { gridX: 10, gridY: 1, direction: MoveDirection.RIGHT },
                { gridX: 9, gridY: 1, direction: MoveDirection.RIGHT },
                { gridX: 8, gridY: 1, direction: MoveDirection.RIGHT },
                { gridX: 7, gridY: 1, direction: MoveDirection.UP },
                { gridX: 7, gridY: 0, direction: MoveDirection.RIGHT },
                { gridX: 6, gridY: 0, direction: MoveDirection.RIGHT },
                { gridX: 5, gridY: 0, direction: MoveDirection.DOWN },
                { gridX: 5, gridY: 1, direction: MoveDirection.LEFT },
                { gridX: 6, gridY: 1, direction: MoveDirection.LEFT },
            ]
        },

        {
            color: SnakeColor.BLUE,
            path: [
                { gridX: 9, gridY: 0, direction: MoveDirection.RIGHT },
                { gridX: 8, gridY: 0, direction: MoveDirection.RIGHT },
            ]
        },

        {
            color: SnakeColor.VIOLET,
            path: [
                { gridX: 13, gridY: 0, direction: MoveDirection.DOWN },
                { gridX: 13, gridY: 1, direction: MoveDirection.DOWN },
            ]
        },

        {
            color: SnakeColor.GREEN,
            path: [
                { gridX: 15, gridY: 5, direction: MoveDirection.DOWN },
                { gridX: 15, gridY: 6, direction: MoveDirection.DOWN },
                { gridX: 15, gridY: 7, direction: MoveDirection.DOWN },
                { gridX: 15, gridY: 8, direction: MoveDirection.DOWN },
                { gridX: 15, gridY: 9, direction: MoveDirection.RIGHT },
                { gridX: 14, gridY: 9, direction: MoveDirection.RIGHT },
                { gridX: 13, gridY: 9, direction: MoveDirection.RIGHT },
                { gridX: 12, gridY: 9, direction: MoveDirection.RIGHT },
                { gridX: 11, gridY: 9, direction: MoveDirection.RIGHT },
                { gridX: 10, gridY: 9, direction: MoveDirection.RIGHT },
            ]
        },

        {
            color: SnakeColor.YELLOW,
            path: [
                { gridX: 16, gridY: 10, direction: MoveDirection.UP },
                { gridX: 16, gridY: 9, direction: MoveDirection.UP },
                { gridX: 16, gridY: 8, direction: MoveDirection.UP },
                { gridX: 16, gridY: 7, direction: MoveDirection.UP },
                { gridX: 16, gridY: 6, direction: MoveDirection.LEFT },
                { gridX: 17, gridY: 6, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 7, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 8, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 9, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 10, direction: MoveDirection.DOWN },
            ]
        },

        {
            color: SnakeColor.BLUE,
            path: [
                { gridX: 17, gridY: 5, direction: MoveDirection.RIGHT },
                { gridX: 16, gridY: 5, direction: MoveDirection.RIGHT },
            ]
        },

        {
            color: SnakeColor.RED,
            path: [
                { gridX: 17, gridY: 0, direction: MoveDirection.RIGHT },
                { gridX: 16, gridY: 0, direction: MoveDirection.RIGHT },
                { gridX: 15, gridY: 0, direction: MoveDirection.RIGHT },
                { gridX: 14, gridY: 0, direction: MoveDirection.DOWN },
                { gridX: 14, gridY: 1, direction: MoveDirection.DOWN },
                { gridX: 14, gridY: 2, direction: MoveDirection.LEFT },
                { gridX: 15, gridY: 2, direction: MoveDirection.UP },
                { gridX: 15, gridY: 1, direction: MoveDirection.LEFT },
                { gridX: 16, gridY: 1, direction: MoveDirection.LEFT },
                { gridX: 17, gridY: 1, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 2, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 3, direction: MoveDirection.DOWN },
                { gridX: 17, gridY: 4, direction: MoveDirection.RIGHT },
                { gridX: 16, gridY: 4, direction: MoveDirection.RIGHT },
                { gridX: 15, gridY: 4, direction: MoveDirection.RIGHT },
                { gridX: 14, gridY: 4, direction: MoveDirection.DOWN },
                { gridX: 14, gridY: 5, direction: MoveDirection.DOWN },
                { gridX: 14, gridY: 6, direction: MoveDirection.DOWN },
            ]
        },

        {
            color: SnakeColor.VIOLET,
            path: [
                { gridX: 15, gridY: 3, direction: MoveDirection.RIGHT },
                { gridX: 14, gridY: 3, direction: MoveDirection.RIGHT },
            ]
        },

        {
            color: SnakeColor.GREEN,
            path: [
                { gridX: 16, gridY: 3, direction: MoveDirection.UP },
                { gridX: 16, gridY: 2, direction: MoveDirection.UP },
            ]
        },
    ];
}