import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.tsx';
import SeedSelection from './pages/SeedSelection.tsx';
import Onboarding from './pages/Onboarding.tsx';
import WorldPreview from './pages/WorldPreview.tsx';
import Results from './pages/Results.tsx';
import Settings from './pages/Settings.tsx';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/seeds" element={<SeedSelection />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/world" element={<WorldPreview />} />
        <Route path="/results" element={<Results />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  );
}

export default App;
