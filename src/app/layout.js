import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata = {
  title: 'Forex Trading Journal',
  description: 'Private trading dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="page-container">
          <header className="header" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, whiteSpace: 'nowrap' }}>FX Journal</h1>
            </div>
            <Navigation />
          </header>
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
