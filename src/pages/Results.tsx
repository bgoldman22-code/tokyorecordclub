import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import type { WorldDefinition } from '../types';

interface Playlist {
  name: string;
  description: string;
  trackCount: number;
  spotifyUrl?: string;
}

export default function Results() {
  const [world, setWorld] = useState<WorldDefinition | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  useEffect(() => {
    loadWorld();
  }, []);

  const loadWorld = async () => {
    try {
      const res = await fetch('/api/me', {
        credentials: 'include'
      });
      
      if (res.ok) {
        const userData = await res.json();
        // Load world from user data
        // For now, mock it
        setWorld({
          name: 'Velvet Dirt Cathedral',
          description: 'Your center of gravity sits in warm-grainy territory...',
          intersections: [
            {
              name: 'Ruined Cathedral',
              description: 'Darker, more textural, slower',
              bias_description: 'Lower valence, reduced energy'
            },
            {
              name: 'Late Summer Drift',
              description: 'Warmer, slightly brighter, patient groove',
              bias_description: 'Higher valence, acoustic focus'
            },
            {
              name: 'Midnight Garden',
              description: 'Intimate, organic, contemplative',
              bias_description: 'High acousticness, low energy'
            }
          ]
        } as any);

        setPlaylists([
          {
            name: 'Ruined Cathedral',
            description: 'Darker, more textural, slower',
            trackCount: 50,
            spotifyUrl: 'https://open.spotify.com/playlist/xyz'
          },
          {
            name: 'Late Summer Drift',
            description: 'Warmer, slightly brighter, patient groove',
            trackCount: 50,
            spotifyUrl: 'https://open.spotify.com/playlist/abc'
          },
          {
            name: 'Midnight Garden',
            description: 'Intimate, organic, contemplative',
            trackCount: 50,
            spotifyUrl: 'https://open.spotify.com/playlist/def'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load world:', error);
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
        alert(data.error);
      } else if (res.ok) {
        alert(`Regenerating ${playlistName}. This will take a minute...`);
      }
    } catch (error) {
      console.error('Failed to regenerate:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setRegenerating(null);
    }
  };

  const handleRegenerateAll = async () => {
    try {
      const res = await fetch('/api/generate-playlists', {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        alert('Regenerating all playlists. This will take a few minutes...');
      }
    } catch (error) {
      console.error('Failed to regenerate all:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="grain-overlay" />
        <div className="relative z-10">Loading...</div>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="grain-overlay" />
        <div className="relative z-10 text-center">
          <h2 className="text-2xl font-bold mb-4">No world found</h2>
          <p className="text-neutral-400 mb-6">Build your world first</p>
          <Button onClick={() => window.location.href = '/seeds'}>
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
            <h1 className="text-5xl font-bold mb-4">Your Musical World</h1>
            <p className="text-xl text-neutral-400 mb-6 max-w-3xl">
              {world.description || 'Explore your personalized music intersections'}
            </p>
            <div className="flex gap-4">
              <Button
                onClick={handleRegenerateAll}
                variant="outline"
              >
                🔄 Regenerate All
              </Button>
              <Button
                onClick={() => window.location.href = '/settings'}
                variant="outline"
              >
                ⚙️ Settings
              </Button>
            </div>
          </div>

          {/* Playlists */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Your Intersections</h2>
            
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
                    {playlist.spotifyUrl && (
                      <Button
                        onClick={() => window.open(playlist.spotifyUrl, '_blank')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        Open in Spotify
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
          </div>

          {/* Stats */}
          <Card className="bg-neutral-900 border-neutral-800 p-6 mt-12">
            <h3 className="text-xl font-semibold mb-4">Your World Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold text-emerald-500">
                  {playlists.length}
                </div>
                <div className="text-sm text-neutral-400">Playlists</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-500">
                  {playlists.reduce((sum, p) => sum + p.trackCount, 0)}
                </div>
                <div className="text-sm text-neutral-400">Total Tracks</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-500">
                  Weekly
                </div>
                <div className="text-sm text-neutral-400">Refresh Cadence</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-500">
                  100%
                </div>
                <div className="text-sm text-neutral-400">New Music</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
