import { Link } from 'wouter';
import { 
  FiFilm, 
  FiMail, 
  FiFacebook, 
  FiInstagram,
} from 'react-icons/fi';
import { FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { useQuery } from '@tanstack/react-query';
/**
 * Footer component - Site-wide footer with links and info
 */
export default function Footer() {
  const { data } = useQuery({ queryKey: ['/api/settings'] });
  const settings = data?.settings || {};
  const email = settings.supportEmail || settings.companyEmail || null;
  const links = {
    facebook: settings.facebookUrl,
    instagram: settings.instagramUrl,
    x: settings.twitterUrl, // field stored as twitterUrl, shown as X
    youtube: settings.youtubeUrl,
  };
  return (
    <footer className="bg-card border-t border-card-border mt-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <FiFilm className="h-6 w-6 text-primary" />
              <span className="text-xl font-serif font-bold text-primary">VR Theatre</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Scopri il futuro degli spettacoli teatrali nella realtà virtuale immersiva.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" data-testid="footer-link-home">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Home
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/vr" data-testid="footer-link-vr">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    VR Experiences
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/seller/register" data-testid="footer-link-seller">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Diventa Venditore
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" data-testid="footer-link-privacy">
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Privacy Policy
                  </span>
                </Link>
              </li>
              <li>
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  Termini del Servizio
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  Conformità al GDPR
                </span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <div className="flex space-x-3">
              {email && (
                <a 
                  href={`mailto:${email}`}
                  className="p-2 rounded-md hover-elevate transition-all"
                  aria-label="Email"
                  data-testid="email"
                >
                  <FiMail className="h-5 w-5 text-muted-foreground" />
                </a>
              )}
              {links.facebook && (
                <a 
                  href={links.facebook}
                  target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-md hover-elevate transition-all"
                  aria-label="Facebook"
                  data-testid="social-facebook"
                >
                  <FiFacebook className="h-5 w-5 text-muted-foreground" />
                </a>
              )}
              {links.instagram && (
                <a 
                  href={links.instagram}
                  target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-md hover-elevate transition-all"
                  aria-label="Instagram"
                  data-testid="social-instagram"
                >
                  <FiInstagram className="h-5 w-5 text-muted-foreground" />
                </a>
              )}
              {links.x && (
                <a 
                  href={links.x}
                  target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-md hover-elevate transition-all"
                  aria-label="X"
                  data-testid="social-x"
                >
                  <FaXTwitter className="h-5 w-5 text-muted-foreground" />
                </a>
              )}
              {links.youtube && (
                <a 
                  href={links.youtube}
                  target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-md hover-elevate transition-all"
                  aria-label="YouTube"
                  data-testid="social-youtube"
                >
                  <FaYoutube className="h-5 w-5 text-muted-foreground" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} VR Theatre. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
