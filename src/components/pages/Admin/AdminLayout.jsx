import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  HelpCircle, 
  Users, 
  Trophy, 
  Image, 
  Settings as SettingsIcon,
  FileText,
  LogOut
} from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/bible', label: 'Bible', icon: BookOpen },
    { path: '/admin/quiz', label: 'Quiz', icon: HelpCircle },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/admin/ads', label: 'Ads', icon: Image },
    { path: '/admin/settings', label: 'Settings', icon: SettingsIcon },
    { path: '/admin/content', label: 'Content', icon: FileText },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('admin_logged_in');
    navigate('/admin');
  };

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-[#2a2a2a] p-4 flex flex-col fixed top-0 left-0 h-screen overflow-y-auto z-50">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-primary text-2xl font-bold">⚡</span>
          <span className="text-primary text-xl font-bold">Admin</span>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted hover:bg-surface-light hover:text-text'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-error hover:bg-error/10 hover:text-error transition-all duration-200 mt-4 border-t border-[#2a2a2a] pt-4"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}