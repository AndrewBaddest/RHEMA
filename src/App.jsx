import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Auth from './components/pages/Auth';
import Home from './components/pages/Home';
import About from './components/pages/About';
import Contact from './components/pages/Contact';
import Reader from './components/pages/Reader';
import QuizPlay from './components/pages/QuizPlay';
import Challenge from './components/pages/Challenge';
import Progress from './components/pages/Progress';
import Settings from './components/pages/Settings';
import Donate from './components/pages/Donate';
import TermsOfService from './components/pages/TermsOfService';
import PrivacyPolicy from './components/pages/PrivacyPolicy';
import CookiePolicy from './components/pages/CookiePolicy';

// Admin imports
import AdminLogin from './components/pages/Admin/AdminLogin';
import AdminLayout from './components/pages/Admin/AdminLayout';
import AdminDashboard from './components/pages/Admin/AdminDashboard';
import AdminBible from './components/pages/Admin/AdminBible';
import AdminQuiz from './components/pages/Admin/AdminQuiz';
import AdminUsers from './components/pages/Admin/AdminUsers';
import AdminLeaderboard from './components/pages/Admin/AdminLeaderboard';
import AdminAds from './components/pages/Admin/AdminAds';
import AdminSettings from './components/pages/Admin/AdminSettings';
import AdminContent from './components/pages/Admin/AdminContent';

// Simple auth guard
const AdminRoute = ({ children }) => {
  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
  if (!isLoggedIn) {
    return <Navigate to="/admin" replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      {/* Main app routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Auth />} />
        <Route path="home" element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="reader" element={<Reader />} />
        <Route path="quiz" element={<QuizPlay />} />
        <Route path="challenge" element={<Challenge />} />
        <Route path="progress" element={<Progress />} />
        <Route path="settings" element={<Settings />} />
        <Route path="donate" element={<Donate />} />
        <Route path="terms" element={<TermsOfService />} />
        <Route path="privacy" element={<PrivacyPolicy />} />
        <Route path="cookies" element={<CookiePolicy />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="bible" element={<AdminBible />} />
        <Route path="quiz" element={<AdminQuiz />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="leaderboard" element={<AdminLeaderboard />} />
        <Route path="ads" element={<AdminAds />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="content" element={<AdminContent />} />
      </Route>
    </Routes>
  );
}

export default App;