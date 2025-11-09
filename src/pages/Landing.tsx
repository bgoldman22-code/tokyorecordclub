import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function Landing() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/.netlify/functions/me', {
        credentials: 'include'
      });

      if (res.ok) {
        // User is authenticated, redirect to seeds
        navigate('/seeds');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    // Redirect to Spotify OAuth
    window.location.href = '/.netlify/functions/auth';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Grain texture overlay */}
      <div className="grain-overlay" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16 pt-20">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tight">
              Tokyo Record Club
            </h1>
            <p className="text-xl md:text-2xl text-neutral-400 mb-4">
              Music recommendations that understand your taste
            </p>
            <p className="text-lg text-neutral-500 max-w-2xl mx-auto">
              We analyze your Spotify history to build a complete picture of your musical world,
              then generate weekly playlists at different intersections of that world.
            </p>
          </div>

          {/* How it works */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <Card className="bg-neutral-900 border-neutral-800 p-6">
              <div className="text-4xl mb-4">🎧</div>
              <h3 className="text-xl font-semibold mb-2">1. Choose Your Seeds</h3>
              <p className="text-neutral-400">
                Start from your listening history, existing playlists, or individual tracks
              </p>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800 p-6">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-semibold mb-2">2. Define Your World</h3>
              <p className="text-neutral-400">
                Answer a few guided questions to help us understand your taste
              </p>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800 p-6">
              <div className="text-4xl mb-4">🎵</div>
              <h3 className="text-xl font-semibold mb-2">3. Get Fresh Playlists</h3>
              <p className="text-neutral-400">
                Receive 3-5 themed playlists with 50 songs each, refreshed weekly
              </p>
            </Card>
          </div>

          {/* Features */}
          <Card className="bg-neutral-900 border-neutral-800 p-8 mb-12">
            <h3 className="text-2xl font-semibold mb-6">What Makes It Different</h3>
            <ul className="space-y-4 text-neutral-300">
              <li className="flex items-start">
                <span className="text-emerald-500 mr-3 text-xl">✓</span>
                <span>
                  <strong className="text-white">Hybrid Intelligence:</strong> Combines Spotify's audio analysis
                  with AI semantic understanding for deeper taste modeling
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-500 mr-3 text-xl">✓</span>
                <span>
                  <strong className="text-white">Multiple Intersections:</strong> Not just one playlist—
                  explore different facets of your taste simultaneously
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-500 mr-3 text-xl">✓</span>
                <span>
                  <strong className="text-white">Smart Diversity:</strong> No repeating artists/albums,
                  balanced genres, guaranteed novelty
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-emerald-500 mr-3 text-xl">✓</span>
                <span>
                  <strong className="text-white">Weekly Refresh:</strong> Automatically updates with new discoveries,
                  or regenerate anytime
                </span>
              </li>
            </ul>
          </Card>

          {/* CTA */}
          <div className="text-center">
            <Button
              onClick={handleSignIn}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-6 text-lg"
            >
              Sign in with Spotify
            </Button>
            <p className="text-sm text-neutral-500 mt-4">
              We only read your listening history. We never modify your library.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-neutral-800 mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-neutral-600 text-sm">
          <p>Built with Spotify + OpenAI + Math</p>
          <p className="mt-2">Your data stays private. No tracking, no ads.</p>
        </div>
      </footer>
    </div>
  );
}
