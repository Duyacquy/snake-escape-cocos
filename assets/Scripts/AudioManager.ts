import { _decorator, Component, AudioClip, AudioSource } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    public static Instance: AudioManager = null!;

    @property({ type: AudioClip, displayName: "Âm thanh Click Button (SE_Click)" })
    public seClick: AudioClip = null!;

    @property({ type: AudioClip, displayName: "Bảng Thua Hiện Lên (SE_lose_popup)" })
    public seLosePopup: AudioClip = null!;

    @property({ type: AudioClip, displayName: "Rắn Bò Đi (SE_Snake_Move)" })
    public seSnakeMove: AudioClip = null!;

    @property({ type: AudioClip, displayName: "Click Vào Rắn (SE_Snake_Tap)" })
    public seSnakeTap: AudioClip = null!;

    @property({ type: AudioClip, displayName: "Đếm Ngược 15s (TickTock)" })
    public seTickTock: AudioClip = null!;

    @property({ type: AudioClip, displayName: "Hết Giờ Rung Lắc (timeout)" })
    public seTimeout: AudioClip = null!;

    @property({ type: AudioClip, displayName: "Bảng Thắng Hiện Lên (SE_win_popup1)" })
    public seWinPopup: AudioClip = null!;

    private audioSource: AudioSource = null!;

    protected onLoad() {
        AudioManager.Instance = this;

        this.audioSource = this.getComponent(AudioSource) || this.addComponent(AudioSource);
    }

    /**
     * Hàm công khai phát hiệu ứng âm thanh ngắn (OneShot) từ bất kỳ đâu
     */
    public playSFX(clip: AudioClip, volume: number = 1.0) {
        if (clip && this.audioSource) {
            this.audioSource.playOneShot(clip, volume);
        }
    }
}