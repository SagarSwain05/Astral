import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAsteroidStore from '../../stores/asteroidStore';

const SearchModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const { asteroids, fetchAsteroids } = useAsteroidStore();

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            // Load some asteroids for searching
            if (asteroids.length === 0) {
                fetchAsteroids({ limit: 50 });
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(() => {
            const q = query.toLowerCase();
            const filtered = asteroids.filter(a =>
                a.name?.toLowerCase().includes(q) ||
                a.neo_reference_id?.includes(q)
            ).slice(0, 8);
            setResults(filtered);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, asteroids]);

    const handleSelect = (asteroid) => {
        navigate(`/asteroid/${asteroid.neo_reference_id}`);
        onClose();
        setQuery('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
                onClick={onClose}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-space-900/80 backdrop-blur-sm" />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-2xl glass"
                >
                    {/* Search Input */}
                    <div className="flex items-center gap-3 p-4 border-b border-white/10">
                        <Search className="w-5 h-5 text-white/40" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search asteroids by name or ID..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-transparent text-white text-lg placeholder-white/40 focus:outline-none"
                        />
                        {isSearching && (
                            <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />
                        )}
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-white/50" />
                        </button>
                    </div>

                    {/* Results */}
                    <div className="max-h-96 overflow-y-auto">
                        {query && results.length === 0 && !isSearching && (
                            <div className="p-8 text-center text-white/50">
                                No asteroids found for "{query}"
                            </div>
                        )}

                        {results.map((asteroid, index) => (
                            <motion.button
                                key={asteroid.neo_reference_id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => handleSelect(asteroid)}
                                className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                            >
                                {/* Risk indicator */}
                                <div className={`w-2 h-10 rounded-full ${asteroid.riskCategory === 'high' ? 'bg-risk-high' :
                                        asteroid.riskCategory === 'moderate' ? 'bg-risk-moderate' :
                                            asteroid.riskCategory === 'low' ? 'bg-risk-low' : 'bg-risk-minimal'
                                    }`} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {asteroid.isPotentiallyHazardous && (
                                            <AlertTriangle className="w-4 h-4 text-risk-high flex-shrink-0" />
                                        )}
                                        <p className="font-medium text-white truncate">
                                            {asteroid.name}
                                        </p>
                                    </div>
                                    <p className="text-sm text-white/50">
                                        ID: {asteroid.neo_reference_id} • Risk Score: {asteroid.riskScore}
                                    </p>
                                </div>

                                <ArrowRight className="w-4 h-4 text-white/30" />
                            </motion.button>
                        ))}

                        {!query && (
                            <div className="p-6 text-center text-white/40 text-sm">
                                <p>Start typing to search...</p>
                                <p className="mt-2">Press <kbd className="px-2 py-0.5 bg-space-700 rounded">ESC</kbd> to close</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {query && results.length > 0 && (
                        <div className="p-3 border-t border-white/10 flex items-center justify-between text-sm text-white/40">
                            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
                            <button
                                onClick={() => {
                                    navigate('/asteroids');
                                    onClose();
                                }}
                                className="text-accent-primary hover:underline"
                            >
                                View all asteroids →
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SearchModal;
