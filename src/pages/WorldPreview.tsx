import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';

export default function WorldPreview() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    const jobId = sessionStorage.getItem('worldJobId');
    if (!jobId) {
      navigate('/seeds');
      return;
    }

    // Poll for job status
    const interval = setInterval(() => {
      checkStatus(jobId);
    }, 2000);

    checkStatus(jobId);

    return () => clearInterval(interval);
  }, [navigate]);

  const checkStatus = async (jobId: string) => {
    try {
      const res = await fetch(`/api/world-status?jobId=${jobId}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(data);

        if (data.status === 'complete') {
          // Navigate to playlist generation
          setTimeout(() => {
            startPlaylistGeneration();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const startPlaylistGeneration = async () => {
    try {
      const res = await fetch('/api/generate-playlists', {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('playlistJobId', data.jobId);
        
        // For now, just navigate to results
        // In production, we'd poll this job too
        setTimeout(() => {
          navigate('/results');
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to start playlist generation:', error);
    }
  };

  const progress = status?.progress || 0;
  const currentStep = status?.currentStep || 'Starting...';

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="grain-overlay" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-neutral-900 border-neutral-800 p-12 text-center">
            {/* Animated icon */}
            <div className="text-8xl mb-8 animate-pulse">
              🌍
            </div>

            <h1 className="text-4xl font-bold mb-4">
              {status?.status === 'complete'
                ? 'Your World is Ready!'
                : 'Building Your World...'}
            </h1>

            <p className="text-xl text-neutral-400 mb-8">
              {status?.status === 'complete'
                ? 'Generating your playlists now...'
                : currentStep}
            </p>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="h-3 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-sm text-neutral-500 mt-2">
                {progress}%
              </div>
            </div>

            {/* Steps */}
            <div className="text-left space-y-3 text-sm text-neutral-400">
              <div className={progress >= 10 ? 'text-emerald-500' : ''}>
                ✓ Analyzing seed tracks
              </div>
              <div className={progress >= 35 ? 'text-emerald-500' : ''}>
                ✓ Computing audio features
              </div>
              <div className={progress >= 55 ? 'text-emerald-500' : ''}>
                ✓ Extracting taste patterns
              </div>
              <div className={progress >= 70 ? 'text-emerald-500' : ''}>
                ✓ Generating semantic embeddings
              </div>
              <div className={progress >= 90 ? 'text-emerald-500' : ''}>
                ✓ Defining your musical world
              </div>
              <div className={progress >= 100 ? 'text-emerald-500' : ''}>
                ✓ Complete!
              </div>
            </div>
          </Card>

          <p className="text-center text-neutral-500 mt-8 text-sm">
            This usually takes 30-60 seconds. Don't close this page.
          </p>
        </div>
      </div>
    </div>
  );
}
