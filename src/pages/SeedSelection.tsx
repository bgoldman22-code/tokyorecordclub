import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import type { SpotifyPlaylist, SpotifyTrack } from '../types';

type SeedType = 'history' | 'playlists' | 'tracks';
type HistoryRange = 'recent' | '6mo' | '12mo' | 'alltime';

export default function SeedSelection() {
  const navigate = useNavigate();
  const [seedType, setSeedType] = useState<SeedType>('history');
  const [historyRange, setHistoryRange] = useState<HistoryRange>('6mo');
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<SpotifyTrack[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's playlists on mount
  useEffect(() => {
    if (seedType === 'playlists') {
      fetchPlaylists();
    }
  }, [seedType]);

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists', {
        credentials: 'include'
      });
      const data = await res.json();
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch(`/api/search-tracks?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      const data = await res.json();
      setSearchResults(data.tracks || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const togglePlaylist = (playlistId: string) => {
    if (selectedPlaylists.includes(playlistId)) {
      setSelectedPlaylists(selectedPlaylists.filter(id => id !== playlistId));
    } else if (selectedPlaylists.length < 5) {
      setSelectedPlaylists([...selectedPlaylists, playlistId]);
    }
  };

  const toggleTrack = (track: SpotifyTrack) => {
    if (selectedTracks.find(t => t.id === track.id)) {
      setSelectedTracks(selectedTracks.filter(t => t.id !== track.id));
    } else if (selectedTracks.length < 10) {
      setSelectedTracks([...selectedTracks, track]);
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);

    try {
      let seedIds: string[] = [];

      if (seedType === 'history') {
        // Map history range to Spotify API period
        let period: 'short_term' | 'medium_term' | 'long_term' = 'medium_term';
        if (historyRange === 'recent') {
          period = 'short_term';
        } else if (historyRange === '6mo') {
          period = 'medium_term';
        } else if (historyRange === '12mo' || historyRange === 'alltime') {
          period = 'long_term';
        }

        // Fetch from history
        const res = await fetch('/api/fetch-seeds', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: 'history',
            historyPeriod: period
          })
        });
        const data = await res.json();
        seedIds = data.trackIds;
      } else if (seedType === 'playlists') {
        // Fetch from playlists
        const res = await fetch('/api/fetch-seeds', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: 'playlists', 
            playlistIds: selectedPlaylists 
          })
        });
        const data = await res.json();
        seedIds = data.trackIds;
      } else if (seedType === 'tracks') {
        // Use selected tracks
        seedIds = selectedTracks.map(t => t.id);
      }

      // Store seeds in session storage
      sessionStorage.setItem('seedTrackIds', JSON.stringify(seedIds));

      // Navigate to onboarding
      navigate('/onboarding');
    } catch (error) {
      console.error('Failed to continue:', error);
      setIsLoading(false);
    }
  };

  const canContinue = () => {
    if (seedType === 'history') return true;
    if (seedType === 'playlists') return selectedPlaylists.length > 0;
    if (seedType === 'tracks') return selectedTracks.length >= 3;
    return false;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grain-overlay" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-white">Choose Your Starting Point</h1>
            <p className="text-neutral-300">
              Select the seeds we'll use to understand your taste
            </p>
          </div>

          {/* Seed type tabs */}
          <div className="flex gap-4 mb-8">
            <Button
              variant={seedType === 'history' ? 'default' : 'outline'}
              onClick={() => setSeedType('history')}
              className="flex-1"
            >
              📊 Listening History
            </Button>
            <Button
              variant={seedType === 'playlists' ? 'default' : 'outline'}
              onClick={() => setSeedType('playlists')}
              className="flex-1"
            >
              🎵 Playlists
            </Button>
            <Button
              variant={seedType === 'tracks' ? 'default' : 'outline'}
              onClick={() => setSeedType('tracks')}
              className="flex-1"
            >
              🔍 Individual Tracks
            </Button>
          </div>

          {/* History selection */}
          {seedType === 'history' && (
            <Card className="bg-neutral-900 border-neutral-800 p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">Select Time Range</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={historyRange === 'recent' ? 'default' : 'outline'}
                  onClick={() => setHistoryRange('recent')}
                  className="h-20 flex flex-col items-center justify-center text-white"
                >
                  <div className="text-2xl mb-1">⏱️</div>
                  <div className="font-semibold">Recent</div>
                  <div className="text-xs text-neutral-400">Last 50 tracks</div>
                </Button>
                <Button
                  variant={historyRange === '6mo' ? 'default' : 'outline'}
                  onClick={() => setHistoryRange('6mo')}
                  className="h-20 flex flex-col items-center justify-center text-white"
                >
                  <div className="text-2xl mb-1">📅</div>
                  <div className="font-semibold">6 Months</div>
                  <div className="text-xs text-neutral-400">Medium term</div>
                </Button>
                <Button
                  variant={historyRange === '12mo' ? 'default' : 'outline'}
                  onClick={() => setHistoryRange('12mo')}
                  className="h-20 flex flex-col items-center justify-center text-white"
                >
                  <div className="text-2xl mb-1">📆</div>
                  <div className="font-semibold">12 Months</div>
                  <div className="text-xs text-neutral-400">Long term</div>
                </Button>
                <Button
                  variant={historyRange === 'alltime' ? 'default' : 'outline'}
                  onClick={() => setHistoryRange('alltime')}
                  className="h-20 flex flex-col items-center justify-center text-white"
                >
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="font-semibold">All Time</div>
                  <div className="text-xs text-neutral-400">Top tracks</div>
                </Button>
              </div>
            </Card>
          )}

          {/* Playlist selection */}
          {seedType === 'playlists' && (
            <Card className="bg-neutral-900 border-neutral-800 p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">
                Select Playlists ({selectedPlaylists.length}/5)
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => togglePlaylist(playlist.id)}
                    className={`w-full p-4 rounded-lg border text-left transition ${
                      selectedPlaylists.includes(playlist.id)
                        ? 'bg-emerald-900/30 border-emerald-600'
                        : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {playlist.images?.[0] && (
                        <img
                          src={playlist.images[0].url}
                          alt={playlist.name}
                          className="w-12 h-12 rounded"
                        />
                      )}
                      <div>
                        <div className="font-medium text-white">{playlist.name}</div>
                        <div className="text-sm text-neutral-400">
                          {playlist.tracks.total} tracks
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Track selection */}
          {seedType === 'tracks' && (
            <Card className="bg-neutral-900 border-neutral-800 p-6">
              <h3 className="text-xl font-semibold mb-4 text-white">
                Search Tracks ({selectedTracks.length}/10)
              </h3>
              
              {/* Search */}
              <div className="flex gap-2 mb-4">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for songs or artists..."
                  className="bg-neutral-800 border-neutral-700"
                />
                <Button onClick={handleSearch}>Search</Button>
              </div>

              {/* Selected tracks */}
              {selectedTracks.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-neutral-400 mb-2">Selected:</div>
                  <div className="space-y-2">
                    {selectedTracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-2 bg-emerald-900/30 border border-emerald-600 rounded"
                      >
                        <div className="flex items-center gap-2">
                          {track.album.images?.[0] && (
                            <img
                              src={track.album.images[0].url}
                              alt={track.album.name}
                              className="w-8 h-8 rounded"
                            />
                          )}
                          <div className="text-sm">
                            <div className="font-medium">{track.name}</div>
                            <div className="text-neutral-400">
                              {track.artists.map(a => a.name).join(', ')}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleTrack(track)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => toggleTrack(track)}
                      disabled={
                        selectedTracks.length >= 10 &&
                        !selectedTracks.find(t => t.id === track.id)
                      }
                      className="w-full p-3 rounded-lg border bg-neutral-800 border-neutral-700 hover:border-neutral-600 text-left disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        {track.album.images?.[0] && (
                          <img
                            src={track.album.images[0].url}
                            alt={track.album.name}
                            className="w-8 h-8 rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-white">{track.name}</div>
                          <div className="text-sm text-neutral-400">
                            {track.artists.map(a => a.name).join(', ')}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Continue button */}
          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleContinue}
              disabled={!canContinue() || isLoading}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? 'Loading...' : 'Continue to Onboarding'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
