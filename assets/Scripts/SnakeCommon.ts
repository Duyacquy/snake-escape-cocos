export enum SnakeColor {
    RED,
    VIOLET,
    BLUE,
    GREEN,
    YELLOW
}

export enum MoveDirection {
    UP,
    DOWN,
    LEFT,
    RIGHT
}

export interface SnakeNodeData {
    gridX: number;
    gridY: number;
    direction: MoveDirection;
}