import { Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { SeedSelection } from './pages/SeedSelection';
import { Onboarding } from './pages/Onboarding';
import { WorldPreview } from './pages/WorldPreview';
import { Results } from './pages/Results';
import { Settings } from './pages/Settings';

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
