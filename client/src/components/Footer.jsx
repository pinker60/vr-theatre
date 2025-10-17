import { Link } from 'wouter';
import { 
  FiFilm, 
  FiMail, 
  FiFacebook, 
  FiInstagram 
} from 'react-icons/fi';
/**
 * Footer component - Site-wide footer with links and info
 */
export default function Footer() {
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
              Experience the future of theatrical performances in immersive virtual reality.
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
                    Become a Seller
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
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  GDPR Compliance
                </span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <div className="flex space-x-3">
              <a 
                href="mailto:lauria.mario2@gmail.com" 
                className="p-2 rounded-md hover-elevate transition-all"
                aria-label="Email"
                data-testid="social-email"
              >
                <FiMail className="h-5 w-5 text-muted-foreground" />
              </a>
              <a 
                href="#" 
                className="p-2 rounded-md hover-elevate transition-all"
                aria-label="GitHub"
                data-testid="social-github"
              >
                <FiFacebook className="h-5 w-5 text-muted-foreground" />
              </a>
              <a 
                href="#" 
                className="p-2 rounded-md hover-elevate transition-all"
                aria-label="Twitter"
                data-testid="social-twitter"
              >
                <FiInstagram className="h-5 w-5 text-muted-foreground" />
              </a>
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
