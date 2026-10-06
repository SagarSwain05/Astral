import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { AlertTriangle, Gauge, Target, Orbit } from 'lucide-react';

const Ticker = ({ items = [] }) => {
    const [tickerItems, setTickerItems] = useState([]);

    useEffect(() => {
        // Generate ticker items from asteroids
        if (items.length > 0) {
            setTickerItems(items.slice(0, 10).map((asteroid) => ({
                id: asteroid.neo_reference_id || asteroid._id,
                name: asteroid.name,
                riskScore: asteroid.riskScore,
                riskCategory: asteroid.riskCategory,
                velocity: asteroid.relativeVelocityKmS?.toFixed(1),
                distance: asteroid.missDistanceLunar?.toFixed(2),
            })));
        }
    }, [items]);

    const getRiskIcon = (category) => {
        switch (category) {
            case 'high':
                return <AlertTriangle className="w-4 h-4 text-risk-high" />;
            case 'moderate':
                return <Gauge className="w-4 h-4 text-risk-moderate" />;
            case 'low':
                return <Target className="w-4 h-4 text-risk-low" />;
            default:
                return <Orbit className="w-4 h-4 text-risk-minimal" />;
        }
    };

    const getRiskColor = (category) => {
        switch (category) {
            case 'high': return 'text-risk-high';
            case 'moderate': return 'text-risk-moderate';
            case 'low': return 'text-risk-low';
            default: return 'text-risk-minimal';
        }
    };

    if (tickerItems.length === 0) {
        return (
            <div className="glass py-3 px-4 text-center text-white/50">
                Loading asteroid data...
            </div>
        );
    }

    return (
        <div className="glass py-3 overflow-hidden">
            <div className="ticker-wrapper">
                <motion.div
                    className="ticker-content flex gap-8 items-center"
                    animate={{ x: ['0%', '-50%'] }}
                    transition={{
                        duration: 30,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                >
                    {/* Duplicate items for seamless loop */}
                    {[...tickerItems, ...tickerItems].map((item, index) => (
                        <div
                            key={`${item.id}-${index}`}
                            className="flex items-center gap-3 whitespace-nowrap"
                        >
                            {getRiskIcon(item.riskCategory)}
                            <span className={`font-medium ${getRiskColor(item.riskCategory)}`}>
                                {item.name}
                            </span>
                            <span className="text-white/50">•</span>
                            <span className="text-white/70">
                                {item.velocity} km/s
                            </span>
                            <span className="text-white/50">•</span>
                            <span className="text-white/70">
                                {item.distance} LD
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.riskCategory === 'high' ? 'badge-high' :
                                    item.riskCategory === 'moderate' ? 'badge-moderate' :
                                        item.riskCategory === 'low' ? 'badge-low' : 'badge-minimal'
                                }`}>
                                Risk: {item.riskScore}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export default Ticker;
