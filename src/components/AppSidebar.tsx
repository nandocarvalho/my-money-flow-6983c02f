import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, Tags, TrendingUp, BarChart3, Settings, CalendarDays, History, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const menuItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/despesas', label: 'Despesas', icon: List },
  { to: '/mensalidades', label: 'Mensalidades', icon: CalendarDays },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/patrimonio', label: 'Patrimônio', icon: TrendingUp },
  { to: '/historico', label: 'Histórico', icon: History },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function AppSidebar() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">F</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-foreground leading-none">FinançasPro</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">Gestão Financeira</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {menuItems.map(item => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-[13px] text-muted-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </Button>
      </div>
    </aside>
  );
}
