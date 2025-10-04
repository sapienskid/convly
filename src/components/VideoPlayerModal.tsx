import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  Maximize, 
  Minimize, 
  SkipBack, 
  SkipForward,
  X,
  Settings
} from 'lucide-react';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  videoTitle?: string;
}

export function VideoPlayerModal({ isOpen, onClose, videoUrl, videoTitle = "Discord Chat Animation" }: VideoPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([75]);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(62); // 62 seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Simulate video playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentTime < duration) {
      interval = setInterval(() => {
        setCurrentTime(prev => Math.min(prev + 1, duration));
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration, playbackSpeed]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSeek = (newTime: number[]) => {
    setCurrentTime(newTime[0]);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    setIsMuted(newVolume[0] === 0);
  };

  const handleDownload = () => {
    // Create a mock download
    const link = document.createElement('a');
    link.href = videoUrl || '#';
    link.download = `${videoTitle}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const skipForward = () => {
    setCurrentTime(prev => Math.min(prev + 10, duration));
  };

  const skipBackward = () => {
    setCurrentTime(prev => Math.max(prev - 10, 0));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`p-0 border-0 bg-black ${isFullscreen ? 'max-w-[100vw] max-h-[100vh] w-full h-full' : 'max-w-4xl'}`}>
        <div className="relative group">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white border-0"
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Video Area */}
          <div className={`bg-[#36393f] ${isFullscreen ? 'h-screen' : 'h-[400px]'} flex items-center justify-center relative overflow-hidden`}>
            {/* Phone Frame in center */}
            <div className="w-80 h-[600px] bg-black rounded-[2.5rem] p-2 shadow-2xl relative">
              {/* Screen */}
              <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
                {/* Status Bar */}
                <div className="bg-black h-6 flex items-center justify-between px-6 text-white text-xs">
                  <span>9:41</span>
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                      <div className="w-1 h-1 bg-white rounded-full opacity-30"></div>
                    </div>
                    <div className="w-6 h-3 border border-white rounded-sm">
                      <div className="w-4 h-1.5 bg-white rounded-sm m-0.5"></div>
                    </div>
                  </div>
                </div>

                {/* Discord Chat Content */}
                <div className="h-[calc(100%-24px)] bg-[#36393f] flex flex-col">
                  {/* Discord Header */}
                  <div className="bg-[#2f3136] p-3 border-b border-[#202225] flex items-center">
                    <div className="w-6 h-6 bg-[#7289da] rounded-full mr-3 flex items-center justify-center">
                      <span className="text-white text-xs">#</span>
                    </div>
                    <span className="text-[#dcddde] text-sm">general</span>
                  </div>

                  {/* Animated Messages */}
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    <div className="flex items-start space-x-3 animate-fade-in">
                      <div className="w-10 h-10 bg-[#7289da] rounded-full flex items-center justify-center text-white text-xs">
                        U1
                      </div>
                      <div>
                        <div className="flex items-baseline space-x-2 mb-1">
                          <span className="text-sm font-medium text-[#5865f2]">User1</span>
                          <span className="text-xs text-[#72767d]">Today at 2:30 PM</span>
                        </div>
                        <p className="text-[#dcddde] text-sm">Hey everyone! 👋</p>
                      </div>
                    </div>

                    {currentTime > 5 && (
                      <div className="flex items-start space-x-3 animate-fade-in">
                        <div className="w-10 h-10 bg-[#f47470] rounded-full flex items-center justify-center text-white text-xs">
                          U2
                        </div>
                        <div>
                          <div className="flex items-baseline space-x-2 mb-1">
                            <span className="text-sm font-medium text-[#f47470]">User2</span>
                            <span className="text-xs text-[#72767d]">Today at 2:30 PM</span>
                          </div>
                          <p className="text-[#dcddde] text-sm">Hello! How's everyone doing?</p>
                        </div>
                      </div>
                    )}

                    {currentTime > 10 && (
                      <div className="flex items-start space-x-3 animate-fade-in">
                        <div className="w-10 h-10 bg-[#43b581] rounded-full flex items-center justify-center text-white text-xs">
                          U3
                        </div>
                        <div>
                          <div className="flex items-baseline space-x-2 mb-1">
                            <span className="text-sm font-medium text-[#43b581]">User3</span>
                            <span className="text-xs text-[#72767d]">Today at 2:31 PM</span>
                          </div>
                          <p className="text-[#dcddde] text-sm">Great! Just finished my project 🎉</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Discord Input */}
                  <div className="p-4 bg-[#2f3136]">
                    <div className="bg-[#40444b] rounded-lg p-3">
                      <span className="text-[#72767d] text-sm">Message #general</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Home Indicator */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white rounded-full"></div>
            </div>

            {/* Play Overlay */}
            {!isPlaying && (
              <button
                onClick={togglePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors"
              >
                <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                  <Play className="w-8 h-8 text-black ml-1" />
                </div>
              </button>
            )}
          </div>

          {/* External Controls Bar */}
          <div className="bg-gray-900 text-white p-4 space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{videoTitle}</span>
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              <Slider
                value={[currentTime]}
                onValueChange={handleSeek}
                max={duration}
                step={1}
                className="w-full"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipBackward}
                  className="text-white hover:bg-white/20"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlayPause}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipForward}
                  className="text-white hover:bg-white/20"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>

                {/* Volume */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted || volume[0] === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <Slider
                    value={isMuted ? [0] : volume}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="w-20"
                  />
                </div>

                {/* Playback Speed */}
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="bg-transparent text-white text-sm border border-gray-600 rounded px-2 py-1"
                >
                  <option value={0.5} className="bg-gray-900">0.5x</option>
                  <option value={0.75} className="bg-gray-900">0.75x</option>
                  <option value={1} className="bg-gray-900">1x</option>
                  <option value={1.25} className="bg-gray-900">1.25x</option>
                  <option value={1.5} className="bg-gray-900">1.5x</option>
                  <option value={2} className="bg-gray-900">2x</option>
                </select>
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="text-white hover:bg-white/20"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>

                <Button
                  onClick={handleDownload}
                  className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}