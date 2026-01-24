import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './state/appContext';
import Header from './components/layout/Header';
import WorldPage from './pages/WorldPage';
import CountryPage from './pages/CountryPage';

function App() {
    return (
        <AppProvider>
            <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                <Header />
                <Routes>
                    <Route path="/" element={<WorldPage />} />
                    <Route path="/country/:countryId" element={<CountryPage />} />
                </Routes>
            </div>
        </AppProvider>
    );
}

export default App;
