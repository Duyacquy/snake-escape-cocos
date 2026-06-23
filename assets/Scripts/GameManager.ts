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

            snakeComp.initSnake(
                snakeData.color,
                snakeData.path,
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
                { gridX: 0, gridY: 16, direction: MoveDirection.UP },
                { gridX: 1, gridY: 16, direction: MoveDirection.LEFT },
                { gridX: 1, gridY: 17, direction: MoveDirection.DOWN },
            ]
        },

        {
            color: SnakeColor.YELLOW,
            path: [
                { gridX: 2, gridY: 17, direction: MoveDirection.DOWN },
                { gridX: 2, gridY: 18, direction: MoveDirection.DOWN },
                { gridX: 1, gridY: 18, direction: MoveDirection.RIGHT },
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
                { gridX: 0, gridY: 4, direction: MoveDirection.UP },
                { gridX: 1, gridY: 4, direction: MoveDirection.LEFT },
                { gridX: 2, gridY: 4, direction: MoveDirection.LEFT },
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
    ];
}