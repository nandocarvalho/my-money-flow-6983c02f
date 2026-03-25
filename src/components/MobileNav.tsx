import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, CalendarDays, BarChart3, Settings, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/despesas', icon: List, label: 'Despesas' },
  { to: '/mensalidades', icon: CalendarDays, label: 'Mensalid.' },
  { to: '/historico', icon: History, label: 'Histórico' },
  { to: '/relatorios', icon: BarChart3, label: 'Gráficos' },
  { to: '/configuracoes', icon: Settings, label: 'Config' },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border">
      <div className="flex justify-around items-center py-1.5 px-1">
        {menuItems.map(item => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-[48px]',
                active ? 'text-primary bg-primary/10' : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
