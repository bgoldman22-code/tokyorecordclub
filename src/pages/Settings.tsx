import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';

export default function Settings() {
  const [cadence, setCadence] = useState<'weekly' | 'biweekly' | 'monthly' | 'manual'>('weekly');
  const [continuity, setContinuity] = useState(30);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            cadence,
            continuity
          }
        })
      });

      if (res.ok) {
        alert('Settings saved!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grain-overlay" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Settings</h1>
            <p className="text-neutral-400">
              Customize your Tokyo Record Club experience
            </p>
          </div>

          {/* Refresh Cadence */}
          <Card className="bg-neutral-900 border-neutral-800 p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Refresh Cadence</h3>
            <p className="text-neutral-400 text-sm mb-4">
              How often should we regenerate your playlists?
            </p>

            <div className="space-y-3">
              {[
                { value: 'weekly', label: 'Weekly', description: 'Every Monday' },
                { value: 'biweekly', label: 'Bi-weekly', description: 'Every other Monday' },
                { value: 'monthly', label: 'Monthly', description: 'First Monday of the month' },
                { value: 'manual', label: 'Manual', description: 'Only when you click regenerate' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setCadence(option.value as any)}
                  className={`w-full p-4 rounded-lg border text-left transition ${
                    cadence === option.value
                      ? 'bg-emerald-900/30 border-emerald-600'
                      : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-neutral-400">{option.description}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Continuity */}
          <Card className="bg-neutral-900 border-neutral-800 p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Playlist Continuity</h3>
            <p className="text-neutral-400 text-sm mb-4">
              How much of each playlist should stay the same when refreshing?
            </p>

            <div className="space-y-4">
              <div>
                <Label className="text-neutral-300 mb-2 block">
                  Keep {continuity}% of existing tracks
                </Label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="10"
                  value={continuity}
                  onChange={(e) => setContinuity(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>All new (0%)</span>
                  <span>Balanced (30%)</span>
                  <span>Familiar (50%)</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Account */}
          <Card className="bg-neutral-900 border-neutral-800 p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Account</h3>
            
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = '/seeds'}
              >
                🔄 Rebuild World from Scratch
              </Button>
              
              <Button
                variant="outline"
                className="w-full text-red-400 border-red-800 hover:bg-red-900/30"
                onClick={() => {
                  if (confirm('Are you sure? This will delete your world and all playlists.')) {
                    // TODO: Implement delete
                    alert('Delete not implemented yet');
                  }
                }}
              >
                🗑️ Delete My World
              </Button>
            </div>
          </Card>

          {/* Save button */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/results'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
