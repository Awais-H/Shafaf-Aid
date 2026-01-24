import { Link, useLocation } from 'react-router-dom';

export default function Header() {
    const location = useLocation();
    const isHome = location.pathname === '/';

    return (
        <header className="header">
            <Link to="/" className="header-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span>🌍</span>
                <span>AidGap</span>
            </Link>

            {!isHome && (
                <div style={{ pointerEvents: 'auto', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Humanitarian Coverage Analysis
                </div>
            )}
        </header>
    );
}
