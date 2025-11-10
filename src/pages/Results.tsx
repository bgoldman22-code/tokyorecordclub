import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import type { WorldDefinition } from '../types';

interface PlaylistInfo {
  name: string;
  description: string;
  trackCount: number;
  spotifyUrl?: string;
  spotifyId?: string;
}

export default function Results() {
  const navigate = useNavigate();
  const [world, setWorld] = useState<WorldDefinition | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  useEffect(() => {
    loadWorld();
  }, []);

  const loadWorld = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user and their world
      const userRes = await fetch('/api/me', {
        credentials: 'include'
      });
      
      if (!userRes.ok) {
        throw new Error('Not authenticated');
      }

      const userData = await userRes.json();
      
      // Fetch world blob
      // Note: We need a new endpoint to get world data
      // For now, we'll construct playlists from world definition
      const worldRes = await fetch('/api/world', {
        credentials: 'include'
      });

      if (worldRes.ok) {
        const worldData = await worldRes.json();
        setWorld(worldData);

        // Extract playlist info from world
        const playlistsInfo: PlaylistInfo[] = worldData.intersections?.map((intersection: any) => {
          const playlistData = worldData.playlists?.[intersection.name];
          return {
            name: intersection.name,
            description: intersection.description,
            trackCount: 50, // Default
            spotifyUrl: playlistData?.url,
            spotifyId: playlistData?.id
          };
        }) || [];

        setPlaylists(playlistsInfo);
      } else {
        // No world exists yet
        setError('No world found. Please build your world first.');
      }
    } catch (error) {
      console.error('Failed to load world:', error);
      setError('Failed to load your world. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateOne = async (playlistName: string) => {
    setRegenerating(playlistName);

    try {
      const res = await fetch('/api/regenerate-one', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistName })
      });

      if (res.status === 429) {
        const data = await res.json();
        alert(data.error || 'Please wait before regenerating again.');
      } else if (res.ok) {
        alert(`Regenerating ${playlistName}. This will take a minute...`);
        // Reload after 30 seconds
        setTimeout(() => loadWorld(), 30000);
      } else {
        throw new Error('Failed to regenerate');
      }
    } catch (error) {
      console.error('Failed to regenerate:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setRegenerating(null);
    }
  };

  const handleRegenerateAll = async () => {
    if (!confirm('Regenerate all playlists? This will take a few minutes.')) {
      return;
    }

    try {
      const res = await fetch('/api/generate-playlists', {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        alert('Regenerating all playlists. Check back in a few minutes!');
        // Could navigate to world preview for progress
        navigate('/world');
      } else {
        throw new Error('Failed to start regeneration');
      }
    } catch (error) {
      console.error('Failed to regenerate all:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  const handleStartOver = () => {
    if (confirm('Start over? This will create a new world from scratch.')) {
      navigate('/seeds');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="grain-overlay" />
        <div className="relative z-10">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🎵</div>
            <div className="text-xl text-neutral-400">Loading your world...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !world) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="grain-overlay" />
        <div className="relative z-10 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-4">{error || 'No world found'}</h2>
          <p className="text-neutral-400 mb-6">Build your world to get started</p>
          <Button onClick={() => navigate('/seeds')} className="bg-emerald-600 hover:bg-emerald-700">
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grain-overlay" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold mb-4">{world.name || world.worldName}</h1>
            <p className="text-xl text-neutral-400 mb-6 max-w-3xl">
              {world.description}
            </p>
            <div className="flex gap-4">
              <Button
                onClick={handleRegenerateAll}
                variant="outline"
              >
                🔄 Regenerate All
              </Button>
              <Button
                onClick={handleStartOver}
                variant="outline"
              >
                ✨ Start Over
              </Button>
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
              >
                ⚙️ Settings
              </Button>
            </div>
          </div>

          {/* Playlists */}
          {playlists.length > 0 ? (
            <>
              <h2 className="text-2xl font-semibold mb-6">Your Intersections</h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {playlists.map((playlist) => (
                  <Card
                    key={playlist.name}
                    className="bg-neutral-900 border-neutral-800 p-6 hover:border-emerald-600 transition"
                  >
                    {/* Playlist cover placeholder */}
                    <div className="aspect-square bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-lg mb-4 flex items-center justify-center">
                      <div className="text-6xl">🎵</div>
                    </div>

                    <h3 className="text-xl font-bold mb-2">{playlist.name}</h3>
                    <p className="text-sm text-neutral-400 mb-4">
                      {playlist.description}
                    </p>
                    <div className="text-sm text-neutral-500 mb-4">
                      {playlist.trackCount} tracks
                    </div>

                    <div className="flex gap-2">
                      {playlist.spotifyUrl ? (
                        <Button
                          onClick={() => window.open(playlist.spotifyUrl, '_blank')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          Open in Spotify
                        </Button>
                      ) : (
                        <Button
                          disabled
                          className="flex-1"
                          variant="outline"
                        >
                          Generating...
                        </Button>
                      )}
                      <Button
                        onClick={() => handleRegenerateOne(playlist.name)}
                        disabled={regenerating === playlist.name}
                        variant="outline"
                        size="sm"
                      >
                        {regenerating === playlist.name ? '...' : '🔄'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card className="bg-neutral-900 border-neutral-800 p-12 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-2xl font-bold mb-4">Playlists are being generated</h3>
              <p className="text-neutral-400 mb-6">
                This usually takes a few minutes. Check back soon!
              </p>
              <Button onClick={loadWorld} variant="outline">
                Refresh
              </Button>
            </Card>
          )}

          {/* Stats */}
          {playlists.length > 0 && (
            <Card className="bg-neutral-900 border-neutral-800 p-6 mt-12">
              <h3 className="text-xl font-semibold mb-4">Your World Stats</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-3xl font-bold text-emerald-500">
                    {playlists.length}
                  </div>
                  <div className="text-sm text-neutral-400">Intersections</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-500">
                    {playlists.reduce((sum, p) => sum + p.trackCount, 0)}
                  </div>
                  <div className="text-sm text-neutral-400">Total Tracks</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-500">
                    {world.topGenres?.length || 0}
                  </div>
                  <div className="text-sm text-neutral-400">Genres</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-500">
                    {world.seedTracks?.length || world.seedTrackIds?.length || 0}
                  </div>
                  <div className="text-sm text-neutral-400">Seed Tracks</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
