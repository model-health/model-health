interface PlaybackControlsProps {
    currentTime: number;
    duration: number;
    playing: boolean;
    playbackSpeed: number;
    onTimeChange: (time: number) => void;
    onPlayingChange: (playing: boolean) => void;
    onPlaybackSpeedChange: (speed: number) => void;
    onStep: (deltaFrames: number) => void;
}
export declare function PlaybackControls({ currentTime, duration, playing, playbackSpeed, onTimeChange, onPlayingChange, onPlaybackSpeedChange, onStep, }: PlaybackControlsProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=PlaybackControls.d.ts.map