import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GridManager')
export class GridManager extends Component {
    public static Instance: GridManager = null!;

    @property
    public cols: number = 20; 
    @property
    public rows: number = 30; 

    private gridMatrix: string[][] = [];

    protected onLoad() {
        GridManager.Instance = this;
        this.clearGrid();
    }

    public clearGrid() {
        this.gridMatrix = [];
        for (let x = 0; x < this.cols; x++) {
            this.gridMatrix[x] = [];
            for (let y = 0; y < this.rows; y++) {
                this.gridMatrix[x][y] = null!;
            }
        }
    }

    // Kiểm tra ô (x, y) có hợp lệ và trống hay không
    public isCellEmpty(x: number, y: number, ignoreSnakeId?: string): boolean {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
            return false; // Đụng tường biên -> Coi như không trống
        }
        const cellValue = this.gridMatrix[x][y];
        if (cellValue === null! || cellValue === undefined) return true;
        if (ignoreSnakeId && cellValue === ignoreSnakeId) return true; // Bỏ qua chính thân mình khi tính toán tương lai

        return false;
    }

    // Chiếm giữ ô lưới
    public setCell(x: number, y: number, snakeId: string) {
        if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
            this.gridMatrix[x][y] = snakeId;
        }
    }

    // Giải phóng ô lưới
    public removeCell(x: number, y: number) {
        if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
            this.gridMatrix[x][y] = null!;
        }
    }
}