import { Link } from 'react-router-dom';
import { Github, Twitter, Globe, Heart } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="relative mt-auto">
            <div className="glass border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Brand */}
                        <div className="md:col-span-2">
                            <Link to="/" className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-white">Astral</span>
                            </Link>
                            <p className="text-white/50 max-w-md mb-4">
                                Real-time Near-Earth Object monitoring platform.
                                Track asteroids, analyze risks, and stay informed about our cosmic neighborhood.
                            </p>
                            <div className="flex gap-4">
                                <a
                                    href="https://github.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                                >
                                    <Github className="w-5 h-5" />
                                </a>
                                <a
                                    href="https://twitter.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                                >
                                    <Twitter className="w-5 h-5" />
                                </a>
                                <a
                                    href="https://nasa.gov"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                                >
                                    <Globe className="w-5 h-5" />
                                </a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
                            <ul className="space-y-2">
                                <li>
                                    <Link to="/" className="text-white/50 hover:text-white transition-colors">
                                        Dashboard
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/asteroids" className="text-white/50 hover:text-white transition-colors">
                                        All Asteroids
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/watchlist" className="text-white/50 hover:text-white transition-colors">
                                        Watchlist
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/alerts" className="text-white/50 hover:text-white transition-colors">
                                        Alerts
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Resources */}
                        <div>
                            <h3 className="text-white font-semibold mb-4">Resources</h3>
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="https://api.nasa.gov"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white/50 hover:text-white transition-colors"
                                    >
                                        NASA API
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://cneos.jpl.nasa.gov"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white/50 hover:text-white transition-colors"
                                    >
                                        CNEOS
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://ssd.jpl.nasa.gov"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white/50 hover:text-white transition-colors"
                                    >
                                        JPL Small-Body Database
                                    </a>
                                </li>
                                <li>
                                    <Link to="/settings" className="text-white/50 hover:text-white transition-colors">
                                        Settings
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-white/40 text-sm">
                            © 2024 Astral NEO Monitoring. Data provided by NASA NeoWs API.
                        </p>
                        <p className="text-white/40 text-sm flex items-center gap-1">
                            Made with <Heart className="w-4 h-4 text-risk-high" /> for space enthusiasts
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
