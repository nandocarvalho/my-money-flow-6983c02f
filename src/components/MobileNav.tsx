import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, MinusCircle, CalendarDays, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/despesas', icon: List, label: 'Despesas' },
  { to: '/nova-despesa', icon: MinusCircle, label: 'Despesa' },
  { to: '/mensalidades', icon: CalendarDays, label: 'Mensalid.' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/configuracoes', icon: Settings, label: 'Config' },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex justify-around items-center py-2">
        {menuItems.map(item => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
