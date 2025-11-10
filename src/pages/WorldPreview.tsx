import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

interface JobStatus {
  status: 'building' | 'generating' | 'complete' | 'failed';
  progress: number;
  currentStep: string;
  worldId?: string;
  error?: string;
}

export default function WorldPreview() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPlaylists, setIsGeneratingPlaylists] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    const jobId = sessionStorage.getItem('worldJobId');
    if (!jobId) {
      navigate('/seeds');
      return;
    }

    // Poll for job status every 2 seconds
    const interval = setInterval(() => {
      checkStatus(jobId);
      setPollCount((prev) => prev + 1);
    }, 2000);

    // Initial check
    checkStatus(jobId);

    // Cleanup
    return () => clearInterval(interval);
  }, [navigate]);

  // Timeout after 5 minutes (150 polls)
  useEffect(() => {
    if (pollCount > 150 && status?.status !== 'complete') {
      setError('World building is taking longer than expected. Please try again.');
    }
  }, [pollCount, status]);

  const checkStatus = async (jobId: string) => {
    try {
      const res = await fetch(`/api/world-status?jobId=${jobId}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to check status');
      }

      const data = await res.json();
      setStatus(data);

      if (data.status === 'complete' && !isGeneratingPlaylists) {
        // Small delay before starting playlist generation
        setTimeout(() => {
          startPlaylistGeneration();
        }, 1500);
      } else if (data.status === 'failed') {
        setError(data.error || 'Failed to build world. Please try again.');
      }
    } catch (error) {
      console.error('Failed to check status:', error);
      // Don't set error on network issues - keep polling
    }
  };

  const startPlaylistGeneration = async () => {
    setIsGeneratingPlaylists(true);

    try {
      const res = await fetch('/api/generate-playlists', {
        method: 'POST',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to start playlist generation');
      }

      const data = await res.json();
      const playlistJobId = data.jobId;
      
      // Poll playlist generation job
      const checkPlaylistStatus = async () => {
        try {
          const statusRes = await fetch(`/api/world-status?jobId=${playlistJobId}`, {
            credentials: 'include'
          });

          if (statusRes.ok) {
            const statusData = await statusRes.json();
            
            if (statusData.status === 'complete') {
              // Navigate to results
              navigate('/results');
            } else if (statusData.status === 'failed') {
              setError('Failed to generate playlists. Please try again from the results page.');
              setTimeout(() => navigate('/results'), 3000);
            } else {
              // Keep polling
              setTimeout(checkPlaylistStatus, 2000);
            }
          }
        } catch (error) {
          console.error('Error checking playlist status:', error);
          setTimeout(checkPlaylistStatus, 2000);
        }
      };

      // Start polling
      setTimeout(checkPlaylistStatus, 2000);

    } catch (error) {
      console.error('Failed to start playlist generation:', error);
      setError('Failed to start playlist generation. Please try again from the results page.');
      setTimeout(() => navigate('/results'), 3000);
    }
  };

  const handleRetry = () => {
    navigate('/seeds');
  };

  const progress = status?.progress || 0;
  const currentStep = status?.currentStep || 'Starting...';
  const isComplete = status?.status === 'complete';

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="grain-overlay" />
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-neutral-900 border-neutral-800 p-12 text-center">
              <div className="text-6xl mb-6">❌</div>
              <h1 className="text-3xl font-bold mb-4">Something Went Wrong</h1>
              <p className="text-lg text-neutral-400 mb-8">{error}</p>
              <Button onClick={handleRetry} className="bg-emerald-600 hover:bg-emerald-700">
                Start Over
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="grain-overlay" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-neutral-900 border-neutral-800 p-12 text-center">
            {/* Animated icon */}
            <div className="text-8xl mb-8 animate-pulse">
              {isGeneratingPlaylists ? '�' : '�🌍'}
            </div>

            <h1 className="text-4xl font-bold mb-4">
              {isGeneratingPlaylists
                ? 'Generating Your Playlists...'
                : isComplete
                ? 'Your World is Ready!'
                : 'Building Your World...'}
            </h1>

            <p className="text-xl text-neutral-400 mb-8">
              {isGeneratingPlaylists
                ? 'Finding the perfect tracks for each intersection...'
                : isComplete
                ? 'Starting playlist generation...'
                : currentStep}
            </p>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="h-3 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${isGeneratingPlaylists ? 100 : progress}%` }}
                />
              </div>
              <div className="text-sm text-neutral-500 mt-2">
                {isGeneratingPlaylists ? 'Generating playlists...' : `${progress}%`}
              </div>
            </div>

            {/* Steps */}
            {!isGeneratingPlaylists && (
              <div className="text-left space-y-3 text-sm text-neutral-400">
                <div className={progress >= 10 ? 'text-emerald-500' : ''}>
                  {progress >= 10 ? '✓' : '○'} Analyzing seed tracks
                </div>
                <div className={progress >= 35 ? 'text-emerald-500' : ''}>
                  {progress >= 35 ? '✓' : '○'} Computing audio features
                </div>
                <div className={progress >= 55 ? 'text-emerald-500' : ''}>
                  {progress >= 55 ? '✓' : '○'} Extracting taste patterns
                </div>
                <div className={progress >= 70 ? 'text-emerald-500' : ''}>
                  {progress >= 70 ? '✓' : '○'} Generating semantic embeddings
                </div>
                <div className={progress >= 90 ? 'text-emerald-500' : ''}>
                  {progress >= 90 ? '✓' : '○'} Defining your musical world
                </div>
                <div className={progress >= 100 ? 'text-emerald-500' : ''}>
                  {progress >= 100 ? '✓' : '○'} Complete!
                </div>
              </div>
            )}
          </Card>

          <p className="text-center text-neutral-500 mt-8 text-sm">
            This usually takes 1-2 minutes. Don't close this page.
          </p>
        </div>
      </div>
    </div>
  );
}
