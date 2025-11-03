import { useState, useEffect } from 'react';
import { Play, Pause, Info, Maximize, Minimize, Monitor, Glasses } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import defaultCover from '@/assets/default-theatre.jpg';

/**
 * VRPlayer component - Immersive VR content player
 * Features: Play/pause, VR mode toggle, fullscreen, orientation controls
 * Note: Ready for React Three Fiber integration - see comments below
 */
export default function VRPlayer({ content }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVRMode, setIsVRMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [orientation, setOrientation] = useState('horizontal'); // horizontal | vertical

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (!showControls) return;
    
    const timer = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls, isPlaying]);

  const toggleVRMode = () => {
    setIsVRMode(!isVRMode);
    if (!isVRMode) {
      setIsFullscreen(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      className={`relative ${isVRMode ? 'fixed inset-0 z-50 bg-black' : 'w-full'}`}
      onMouseMove={() => setShowControls(true)}
      data-testid="vr-player"
    >
      {/* VR Content Area - placeholder for React Three Fiber */}
      <div className={`${isVRMode ? 'h-screen' : 'aspect-video'} bg-gradient-to-br from-vr-overlay to-black relative overflow-hidden`}>
        {/* 
          TODO: Integrate React Three Fiber here
          
          import { Canvas } from '@react-three/fiber';
          import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
          
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 0, 5]} />
            <OrbitControls enableZoom={false} />
            <ambientLight intensity={0.5} />
            <Your3DScene vrUrl={content.vrUrl} />
          </Canvas>
        */}
        
        {/* Placeholder Video/Image */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src={content.imageUrl || content.image_url || defaultCover} 
            alt={content.title}
            className={`${isVRMode ? 'w-full h-full object-cover' : 'w-full h-full object-contain'}`}
            data-testid="vr-content-display"
            onError={(e) => { e.currentTarget.src = defaultCover; }}
          />
        </div>

        {/* VR Mode Indicator */}
        {isVRMode && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-spotlight-gold/90 backdrop-blur-sm text-black animate-pulse">
              <Glasses className="h-3 w-3 mr-1" />
              VR Mode Active
            </Badge>
          </div>
        )}

        {/* ESC to Exit (VR Mode) */}
        {isVRMode && showControls && (
          <div className="absolute top-4 right-4">
            <Badge variant="outline" className="bg-black/60 backdrop-blur-sm text-white border-white/30">
              Press ESC to exit
            </Badge>
          </div>
        )}

        {/* Controls - Glass morphism bottom bar */}
        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/80 via-black/50 to-transparent backdrop-blur-md">
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Main Controls Row */}
              <div className="flex items-center justify-between gap-4">
                {/* Play/Pause */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white"
                  data-testid="button-play-pause"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 fill-white" />
                  )}
                </Button>

                {/* Title (desktop only) */}
                <div className="hidden md:block flex-1">
                  <h3 className="text-white font-medium" data-testid="text-vr-title">
                    {content.title}
                  </h3>
                </div>

                {/* Secondary Controls */}
                <div className="flex items-center gap-2">
                  {/* Orientation Toggle */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')}
                    className="h-10 w-10 text-white hover:bg-white/20"
                    data-testid="button-orientation"
                    aria-label="Toggle orientation"
                  >
                    <Monitor className={`h-5 w-5 ${orientation === 'vertical' ? 'rotate-90' : ''} transition-transform`} />
                  </Button>

                  {/* Info Button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-white hover:bg-white/20"
                    data-testid="button-info"
                    aria-label="Show info"
                  >
                    <Info className="h-5 w-5" />
                  </Button>

                  {/* VR Mode Toggle */}
                  <Button
                    size="icon"
                    variant={isVRMode ? "default" : "ghost"}
                    onClick={toggleVRMode}
                    className={`h-10 w-10 ${isVRMode ? 'bg-spotlight-gold text-black hover:bg-spotlight-gold/90' : 'text-white hover:bg-white/20'}`}
                    data-testid="button-vr-mode"
                    aria-label="Toggle VR mode"
                  >
                    <Glasses className="h-5 w-5" />
                  </Button>

                  {/* Fullscreen Toggle */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleFullscreen}
                    className="h-10 w-10 text-white hover:bg-white/20"
                    data-testid="button-fullscreen"
                    aria-label="Toggle fullscreen"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-5 w-5" />
                    ) : (
                      <Maximize className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Progress Bar Placeholder */}
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-spotlight-gold transition-all duration-300"
                  style={{ width: isPlaying ? '45%' : '0%' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Info Panel (outside player in normal mode) */}
      {!isVRMode && (
        <Card className="mt-6 p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-serif font-bold mb-2" data-testid="text-content-title">
                  {content.title}
                </h2>
                <p className="text-muted-foreground" data-testid="text-content-description">
                  {content.description}
                </p>
              </div>
              <Badge variant="outline" className="font-mono">
                {content.duration} min
              </Badge>
            </div>

            {content.tags && content.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {content.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
