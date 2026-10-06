import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, Check, Rocket } from 'lucide-react';
import useAuthStore from '../stores/authStore';

const Register = () => {
    const navigate = useNavigate();
    const { register, isLoading, error, clearError } = useAuthStore();

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const passwordRequirements = [
        { label: 'At least 8 characters', test: (p) => p.length >= 8 },
        { label: 'Contains a number', test: (p) => /\d/.test(p) },
        { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        setPasswordError('');

        if (formData.password !== formData.confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }

        const result = await register(formData.email, formData.password, formData.displayName);
        if (result.success) {
            navigate('/');
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="min-h-screen pt-20 pb-10 px-6 flex items-center justify-center">
            {/* Background effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent-secondary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                className="w-full max-w-md relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <motion.div
                        className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-secondary to-accent-primary flex items-center justify-center"
                        whileHover={{ scale: 1.05, rotate: -5 }}
                    >
                        <Rocket className="w-8 h-8 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white mb-2">Join Astral</h1>
                    <p className="text-white/50">Create your account to start monitoring</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="glass p-8">
                    {(error || passwordError) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-risk-high/20 border border-risk-high/30 rounded-lg"
                        >
                            <p className="text-risk-high text-sm">{error || passwordError}</p>
                        </motion.div>
                    )}

                    {/* Display Name */}
                    <div className="mb-5">
                        <label className="block text-white/70 text-sm font-medium mb-2">
                            Display Name
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                                type="text"
                                name="displayName"
                                value={formData.displayName}
                                onChange={handleChange}
                                placeholder="Space Explorer"
                                className="input-field pl-12"
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="mb-5">
                        <label className="block text-white/70 text-sm font-medium mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="astronaut@nasa.gov"
                                className="input-field pl-12"
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="mb-5">
                        <label className="block text-white/70 text-sm font-medium mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="input-field pl-12 pr-12"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        {/* Password requirements */}
                        <div className="mt-3 space-y-2">
                            {passwordRequirements.map((req, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-2 text-sm ${req.test(formData.password)
                                        ? 'text-risk-minimal'
                                        : 'text-white/40'
                                        }`}
                                >
                                    <Check className={`w-4 h-4 ${req.test(formData.password) ? 'opacity-100' : 'opacity-30'
                                        }`} />
                                    {req.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-6">
                        <label className="block text-white/70 text-sm font-medium mb-2">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className={`input-field pl-12 ${formData.confirmPassword &&
                                    formData.password !== formData.confirmPassword
                                    ? 'border-risk-high/50'
                                    : ''
                                    }`}
                                required
                            />
                            {formData.confirmPassword && formData.password === formData.confirmPassword && (
                                <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-risk-minimal" />
                            )}
                        </div>
                    </div>

                    {/* Submit button */}
                    <motion.button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-lg"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating account...
                            </>
                        ) : (
                            <>
                                Create Account
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </motion.button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-white/40 text-sm">or</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Login link */}
                    <p className="text-center text-white/50">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="text-accent-primary hover:underline font-medium"
                        >
                            Sign in
                        </Link>
                    </p>
                </form>
            </motion.div>
        </div>
    );
};

export default Register;
