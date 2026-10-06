import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

const LoadingScreen = ({ message = 'Loading...' }) => {
    return (
        <div className="fixed inset-0 bg-space-900 flex items-center justify-center z-50">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-secondary/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative text-center">
                {/* Animated logo */}
                <motion.div
                    className="relative w-24 h-24 mx-auto mb-8"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    {/* Outer ring */}
                    <motion.div
                        className="absolute inset-0 border-4 border-accent-primary/30 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    />

                    {/* Middle ring */}
                    <motion.div
                        className="absolute inset-2 border-2 border-accent-secondary/30 rounded-full"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                    />

                    {/* Inner glow */}
                    <motion.div
                        className="absolute inset-4 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 rounded-full"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />

                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            className="flex items-center justify-center"
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        >
                            <Globe className="w-8 h-8 text-accent-primary" />
                        </motion.div>
                    </div>
                </motion.div>

                {/* Loading dots */}
                <div className="flex items-center justify-center gap-1.5 mb-4">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2 h-2 bg-accent-primary rounded-full"
                            animate={{
                                y: [0, -8, 0],
                                opacity: [0.5, 1, 0.5]
                            }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.15,
                            }}
                        />
                    ))}
                </div>

                {/* Message */}
                <motion.p
                    className="text-white/60 font-medium"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    {message}
                </motion.p>
            </div>
        </div>
    );
};

export default LoadingScreen;
