import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
    loadAidGapData,
    computeRegionScores,
    getTopOrgs,
    getAidTypeBreakdown,
    getCoverageVariance
} from '../core';
import { getCoverageColor, formatPopulation, formatCoverage } from '../components/map/MapUtils';
import MapView from '../components/map/MapView';
import HeatmapLayer from '../components/map/HeatmapLayer';

export default function CountryPage() {
    const { countryId } = useParams<{ countryId: string }>();
    const navigate = useNavigate();

    const { country, regionScores, topOrgs, aidBreakdown, variance } = useMemo(() => {
        if (!countryId) return { country: null, regionScores: [], topOrgs: [], aidBreakdown: [], variance: null };

        const data = loadAidGapData();
        const country = data.countriesById.get(countryId);
        const regionScores = computeRegionScores(data, countryId);
        const topOrgs = getTopOrgs(data, countryId, 5);
        const aidBreakdown = getAidTypeBreakdown(data, countryId);
        const variance = getCoverageVariance(data, countryId);

        return { country, regionScores, topOrgs, aidBreakdown, variance };
    }, [countryId]);

    if (!country) {
        return (
            <div className="loading">
                Country not found
            </div>
        );
    }

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            {/* Main Map View */}
            <MapView selectedCountryId={country.id}>
                <HeatmapLayer
                    data={regionScores}
                    level="region"
                />
            </MapView>

            {/* Sidebar */}
            <div className="sidebar">
                <button className="back-button" onClick={() => navigate('/')}>
                    ← Back to World
                </button>

                <h1>{country.name}</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--spacing-md)' }}>
                    Population: {formatPopulation(country.population)}
                </p>

                {/* Coverage Variance Indicator */}
                {variance && (
                    <div style={{
                        background: 'var(--color-surface-hover)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                            COVERAGE DISTRIBUTION
                        </div>
                        <div style={{
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            color: variance.spread === 'high' ? '#ef4444' : variance.spread === 'medium' ? '#fbbf24' : '#10b981'
                        }}>
                            {variance.spread === 'high' ? '⚠️ High Inequality' :
                                variance.spread === 'medium' ? '⚡ Moderate Spread' :
                                    '✓ Relatively Even'}
                        </div>
                    </div>
                )}

                <h2>Regions by Coverage</h2>
                {regionScores.map((score) => (
                    <div key={score.regionId} className="score-card" style={{ cursor: 'default' }}>
                        <div className="name">{score.regionName}</div>
                        <div className="stats">
                            <span>Pop: {formatPopulation(score.population)}</span>
                            <span>{score.overlapOrgCount} orgs</span>
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
                    {topOrgs.map((org) => (
                        <li key={org.orgId} className="org-item">
                            <span className="org-name">{org.orgName}</span>
                            <span className="org-projects">{org.projectCountTotal} projects</span>
                        </li>
                    ))}
                </ul>

                <h2>Aid Types</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {aidBreakdown.map((stat) => (
                        <span key={stat.aidType} className={`aid-chip ${stat.aidType}`}>
                            {stat.aidType}: {stat.projectCountTotal}
                        </span>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="legend">
                <div className="legend-title">Regional Coverage</div>
                <div className="legend-scale">
                    <div style={{ flex: 1, background: '#ef4444' }} />
                    <div style={{ flex: 1, background: '#fbbf24' }} />
                    <div style={{ flex: 1, background: '#10b981' }} />
                </div>
                <div className="legend-labels">
                    <span>Underserved</span>
                    <span>Well Covered</span>
                </div>
            </div>
        </div>
    );
}
