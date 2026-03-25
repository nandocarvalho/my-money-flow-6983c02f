import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import MobileNav from './MobileNav';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 pb-20 md:pb-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
