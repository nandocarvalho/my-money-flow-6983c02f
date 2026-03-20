import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, MinusCircle, PlusCircle, Tags, TrendingUp, BarChart3, Settings, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/despesas', label: 'Despesas', icon: List },
  { to: '/nova-despesa', label: 'Nova Despesa', icon: MinusCircle },
  { to: '/nova-receita', label: 'Nova Receita', icon: PlusCircle },
  { to: '/mensalidades', label: 'Mensalidades', icon: CalendarDays },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/patrimonio', label: 'Patrimônio', icon: TrendingUp },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">
          💰 FinançasPro
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Controle financeiro pessoal</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map(item => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
