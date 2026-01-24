import { useNavigate } from 'react-router-dom';
import { loadAidGapData, computeCountryScores, getTopOrgs } from '../core';
import { getCoverageColor, formatPopulation, formatCoverage } from '../components/map/MapUtils';
import { useMemo } from 'react';
import MapView from '../components/map/MapView';
import HeatmapLayer from '../components/map/HeatmapLayer';

export default function WorldPage() {
    const navigate = useNavigate();

    // Load and compute data
    const { countryScores, topOrgsGlobal } = useMemo(() => {
        const data = loadAidGapData();
        const scores = computeCountryScores(data);

        // Get top orgs across all countries (aggregate)
        const allOrgs = new Map<string, { name: string; presence: number; projects: number }>();
        for (const score of scores) {
            const orgs = getTopOrgs(data, score.countryId, 10);
            for (const org of orgs) {
                const existing = allOrgs.get(org.orgId) || { name: org.orgName, presence: 0, projects: 0 };
                existing.presence += org.weightedPresence;
                existing.projects += org.projectCountTotal;
                allOrgs.set(org.orgId, existing);
            }
        }

        const topOrgsGlobal = Array.from(allOrgs.entries())
            .map(([id, stats]) => ({ orgId: id, ...stats }))
            .sort((a, b) => b.presence - a.presence)
            .slice(0, 5);

        return { countryScores: scores, topOrgsGlobal };
    }, []);

    const handleCountryClick = (countryId: string) => {
        navigate(`/country/${countryId}`);
    };

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            {/* Main Map View */}
            <MapView onCountryClick={handleCountryClick}>
                <HeatmapLayer
                    data={countryScores}
                    level="country"
                    onFeatureClick={handleCountryClick}
                />
            </MapView>

            {/* Sidebar */}
            <div className="sidebar">
                <h1>🌍 AidGap</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--spacing-lg)' }}>
                    Humanitarian aid coverage analysis
                </p>

                <h2>Countries by Coverage</h2>
                {countryScores.map((score) => (
                    <div
                        key={score.countryId}
                        className="score-card"
                        onClick={() => handleCountryClick(score.countryId)}
                    >
                        <div className="name">{score.countryName}</div>
                        <div className="stats">
                            <span>Pop: {formatPopulation(score.population)}</span>
                            <span>{score.orgCount} orgs active</span>
                        </div>
                        <div className="coverage-bar">
                            <div
                                className="fill"
                                style={{
                                    width: `${score.coverageIndexNorm * 100}%`,
                                    backgroundColor: getCoverageColor(score.coverageIndexNorm)
                                }}
                            />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            Coverage: {formatCoverage(score.coverageIndexNorm)}
                        </div>
                    </div>
                ))}

                <h2>Top Organizations</h2>
                <ul className="org-list">
                    {topOrgsGlobal.map((org) => (
                        <li key={org.orgId} className="org-item">
                            <span className="org-name">{org.name}</span>
                            <span className="org-projects">{org.projects} projects</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Legend */}
            <div className="legend">
                <div className="legend-title">Coverage Index</div>
                <div className="legend-scale">
                    <div style={{ flex: 1, background: '#ef4444' }} />
                    <div style={{ flex: 1, background: '#fbbf24' }} />
                    <div style={{ flex: 1, background: '#10b981' }} />
                </div>
                <div className="legend-labels">
                    <span>Low</span>
                    <span>High</span>
                </div>
            </div>
        </div>
    );
}
