import { Link, useLocation } from 'wouter';
import { useUserStore } from '@/store/useUserStore';
import { Button } from '@/components/ui/button';
import { Menu, X, User, LogOut, Home, Film, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '@/store/useCartStore';

/**
 * Navbar component - Fixed top navigation with backdrop blur
 * Features: Logo, main navigation, auth buttons, mobile menu
 */
export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useUserStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartCount = useCartStore((s) => Object.values(s.items).reduce((a,b)=>a+b.quantity,0));

  const handleVrClick = (e) => {
    e?.preventDefault?.();
    const scroll = () => {
      try {
        const el = document.getElementById('spettacoli');
        if (el) {
          const offset = 80; // navbar height
          const y = el.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          return;
        }
      } catch {}
      // Fallback: set hash so Home effect can pick it up
      try { window.location.hash = '#spettacoli'; } catch {}
    };
    // If already on Home (location doesn't include hash), just scroll
    if (location === '/' || location === '/#spettacoli') {
      scroll();
    } else {
      setLocation('/#spettacoli');
      setTimeout(scroll, 50);
    }
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    // Use hash to jump directly to content section
    { href: '/#spettacoli', label: 'VR Experiences', icon: Film },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/90 dark:bg-card/90 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" data-testid="link-home">
            <div className="flex items-center space-x-2 hover-elevate px-3 py-2 rounded-md transition-all cursor-pointer">
              <Film className="h-6 w-6 text-primary" />
              <span className="text-xl font-serif font-bold text-primary">VR Theatre</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} data-testid={`link-${link.label.toLowerCase().replace(' ', '-')}`}>
                <div onClick={link.href.includes('#spettacoli') ? handleVrClick : undefined} className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all hover-elevate cursor-pointer ${
                  (location === link.href || location === link.href.replace(/#.*/, '')) ? 'bg-accent text-accent-foreground' : 'text-foreground'
                }`}>
                  <link.icon className="h-4 w-4" />
                  <span className="font-medium">{link.label}</span>
                </div>
              </Link>
            ))}
            {user?.isAdmin && (
              <Link href="/admin/settings" data-testid="link-admin-settings">
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all hover-elevate cursor-pointer ${
                  location === '/admin/settings' ? 'bg-accent text-accent-foreground' : 'text-foreground'
                }`}>
                  <span className="font-medium">Admin</span>
                </div>
              </Link>
            )}
            <Link href="/cart" data-testid="link-cart">
              <div className={`relative flex items-center space-x-2 px-4 py-2 rounded-md transition-all hover-elevate cursor-pointer ${
                location === '/cart' ? 'bg-accent text-accent-foreground' : 'text-foreground'
              }`}>
                <ShoppingCart className="h-4 w-4" />
                <span>Carrello</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full px-1">{cartCount}</span>
                )}
              </div>
            </Link>
          </div>

          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex items-center space-x-2">
            {user ? (
              <>
                <Link href="/profile" data-testid="link-profile">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{user.name}</span>
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  data-testid="button-logout"
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" data-testid="link-login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/register" data-testid="link-register">
                  <Button variant="default" size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover-elevate"
            data-testid="button-mobile-menu"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-card border-b border-border shadow-xl animate-fade-in">
          <div className="px-4 py-6 space-y-3">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <div
                  onClick={link.href.includes('#spettacoli') ? handleVrClick : () => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-all hover-elevate cursor-pointer ${
                    (location === link.href || location === link.href.replace(/#.*/, '')) ? 'bg-accent text-accent-foreground' : ''
                  }`}
                  data-testid={`mobile-link-${link.label.toLowerCase().replace(' ', '-')}`}
                >
                  <link.icon className="h-5 w-5" />
                  <span className="font-medium">{link.label}</span>
                </div>
              </Link>
            ))}
            <Link href="/cart">
              <div
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-all hover-elevate cursor-pointer ${
                  location === '/cart' ? 'bg-accent text-accent-foreground' : ''
                }`}
                data-testid="mobile-link-cart"
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="font-medium">Carrello{cartCount ? ` (${cartCount})` : ''}</span>
              </div>
            </Link>
            {user?.isAdmin && (
              <Link href="/admin/settings">
                <div
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-all hover-elevate cursor-pointer ${
                    location === '/admin/settings' ? 'bg-accent text-accent-foreground' : ''
                  }`}
                  data-testid="mobile-link-admin-settings"
                >
                  <span className="font-medium">Admin</span>
                </div>
              </Link>
            )}
            
            <div className="pt-4 border-t border-border space-y-2">
              {user ? (
                <>
                  <Link href="/profile">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="mobile-link-profile"
                    >
                      <User className="h-4 w-4 mr-2" />
                      {user.name}
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={handleLogout}
                    data-testid="mobile-button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="mobile-link-login"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button 
                      variant="default" 
                      className="w-full"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="mobile-link-register"
                    >
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
