import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import AdRotator from '../shared/AdRotator';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 container max-w-2xl mx-auto px-4 py-6">
        <AdRotator />
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}