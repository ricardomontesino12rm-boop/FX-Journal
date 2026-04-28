'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, List, PlusSquare, Calendar, Wallet, BarChart2, BookOpen } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <Link href="/" className={`nav-link flex-row ${isActive('/') ? 'active' : ''}`}>
        <LayoutDashboard size={18} />
        <span>Dashboard</span>
      </Link>
      <Link href="/trades" className={`nav-link flex-row ${isActive('/trades') ? 'active' : ''}`}>
        <List size={18} />
        <span>Trades</span>
      </Link>
      <Link href="/calendar" className={`nav-link flex-row ${isActive('/calendar') ? 'active' : ''}`}>
        <Calendar size={18} />
        <span>Calendar</span>
      </Link>
      <Link href="/study-cases" className={`nav-link flex-row ${isActive('/study-cases') ? 'active' : ''}`}>
        <BookOpen size={18} />
        <span>Study Cases</span>
      </Link>
      <Link href="/metrics" className={`nav-link flex-row ${isActive('/metrics') ? 'active' : ''}`}>
        <BarChart2 size={18} />
        <span>Metrics</span>
      </Link>
      <Link href="/accounts" className={`nav-link flex-row ${isActive('/accounts') ? 'active' : ''}`}>
        <Wallet size={18} />
        <span>Accounts</span>
      </Link>
      <Link href="/add" className="btn btn-primary" style={{marginLeft: '16px'}}>
        <PlusSquare size={18} />
        <span>New Trade</span>
      </Link>
    </nav>
  );
}
