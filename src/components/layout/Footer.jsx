import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="text-center py-5 text-muted text-sm border-t border-[#2a2a2a] mt-8">
      <div className="container max-w-2xl mx-auto px-4">
        <p>© {new Date().getFullYear()} Rhema Bible Quiz. All rights reserved.</p>
        <div className="flex flex-wrap justify-center gap-2 mt-1 text-xs opacity-60">
          <Link to="/donate" className="hover:text-primary hover:underline">  Support</Link>
          <span>|</span>
          <Link to="/terms" className="hover:text-primary hover:underline">Terms</Link>
          <span>|</span>
          <Link to="/privacy" className="hover:text-primary hover:underline">Privacy</Link>
          <span>|</span>
          <Link to="/cookies" className="hover:text-primary hover:underline">Cookies</Link>
        </div>
        <p className="text-xs mt-2 opacity-40">
          Built with ❤️ for exploring the Word.
        </p>
      </div>
    </footer>
  );
}