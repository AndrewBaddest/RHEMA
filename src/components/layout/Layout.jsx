import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import AdRotator from '../shared/AdRotator';
import Toast from '../shared/Toast';

export default function Layout() {
  const location = useLocation();
  // On /quiz, the quiz renders its own AdRotator inside a fullscreen shell.
  // Suppressing the Layout one avoids a hidden duplicate.
  const hideAd = location.pathname === '/quiz';

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 container max-w-2xl mx-auto px-4 py-6">
        {!hideAd && <AdRotator />}
        <Outlet />
      </main>
      <Footer />
      <Toast />
    </div>
  );
}