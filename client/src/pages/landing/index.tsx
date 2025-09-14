import { useRef, useState} from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import LoginModal from "@/components/login-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import styles from "./landing.module.css";
import {
  BarChart3,
  Users,
  Zap,
  TrendingUp,
  Target,
  Settings,
  X,
  Check,
  ArrowRight,
  Sparkles,
  Layers,
  Play,
  Brain,
  PieChart,
  ChevronRight,
  Wand2,
  Key,
  Rocket,
  AlertTriangle,
  Unlink,
  Clock,
  Activity,
  Compass,
} from "lucide-react";
import { Link } from "wouter";


// Simple animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const fadeInLeft = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6 },
};

const fadeInRight = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6 },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.6 },
};

// Simple Animated Section Component
function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Standard Section Badge Component
function SectionBadge({
  text,
  color = "purple",
  icon: Icon,
}: {
  text: string;
  color?: "red" | "green" | "purple" | "blue" | "teal";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const colorClasses = {
    red: "bg-red-500/10 border-red-500/20 text-red-300",
    green: "bg-green-500/10 border-green-500/20 text-green-300",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-300",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-300",
    teal: "bg-teal-500/10 border-teal-500/20 text-teal-300",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border mb-6 sm:mb-8 ${colorClasses[color]}`}
    >
      {Icon && (
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-2.5 md:mr-3 text-purple-400" />
      )}
      <span className="text-sm sm:text-base md:text-base font-semibold">
        {text}
      </span>
    </motion.div>
  );
}

// Interactive Layered Hero Section
function HeroSection() {
  return (
    <section
      className="relative min-h-screen max-h-[1200px] bg-gradient-to-br from-[#0B0A12] via-[#14102A] to-[#1C1338] py-8 sm:py-12 md:py-16 lg:py-20 xl:py-24 2xl:py-28 overflow-hidden flex items-center mt-16 sm:mt-20"
      data-testid="hero-section"
    >
      {/* Flowing Particle Background */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: Math.random() * (window.innerWidth || 1200),
              y: Math.random() * (window.innerHeight || 800),
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 text-center w-full">
        {/* Hero Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <SectionBadge
            text="Next-Gen Player Analytics"
            color="purple"
            icon={Sparkles}
          />
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-7xl font-display font-black mb-4 sm:mb-6 md:mb-8 leading-tight text-white max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1,
            delay: 0.2,
            type: "spring",
            stiffness: 50,
          }}
          data-testid="hero-headline"
        >
          Stop <span className={styles.landingGradientText}>guessing</span>.
          <br />
          Start <span className={styles.landingGradientText}>experimenting</span>.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-10 md:mb-14 lg:mb-18 max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-2 sm:px-4"
          data-testid="hero-subheadline"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          The complete platform to personalize, track, and act on your player
          data.
        </motion.p>

        {/* Interactive Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-10 mb-10 sm:mb-12 md:mb-16 lg:mb-20 px-2 sm:px-3 md:px-4 lg:px-0 max-w-6xl mx-auto">
          {[
            {
              icon: Sparkles,
              title: "Personalize Experiences",
              desc: "Tailor every moment to each player",
              color: "from-purple-500 via-purple-600 to-pink-500",
              delay: 0.8,
              step: "01",
            },
            {
              icon: TrendingUp,
              title: "Track Metrics",
              desc: "See what matters in real-time",
              color: "from-blue-500 via-blue-600 to-cyan-500",
              delay: 1.0,
              step: "02",
            },
            {
              icon: Zap,
              title: "Act Fast",
              desc: "Deploy changes instantly",
              color: "from-green-500 via-green-600 to-emerald-500",
              delay: 1.2,
              step: "03",
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="group relative overflow-hidden"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: feature.delay }}
              whileHover={{ y: -12 }}
            >
              <div className={`${styles.landingCleanCard} rounded-2xl p-4 sm:p-5 lg:p-6 cursor-pointer h-full relative border border-white/5 group-hover:border-white/10 transition-all duration-500`}>
                {/* Step number */}
                <div className="absolute top-5 right-5 sm:top-6 sm:right-6 text-xs sm:text-sm font-bold text-white/20 group-hover:text-white/40 transition-colors">
                  {feature.step}
                </div>

                {/* Glow effect */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-2xl sm:rounded-3xl`}
                />

                {/* Icon container */}
                <div className="relative z-10">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 mx-auto mb-2 sm:mb-3 lg:mb-4 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg group-hover:shadow-2xl`}
                  >
                    <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  </div>

                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-1 sm:mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-200 group-hover:bg-clip-text transition-all duration-300">
                    {feature.title}
                  </h3>

                  <p className="text-sm sm:text-base text-gray-400 group-hover:text-gray-300 transition-colors duration-300 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>

                {/* Subtle arrow for flow indication */}
                {index < 2 && (
                  <div className="hidden md:block absolute -right-4 top-1/2 transform -translate-y-1/2 z-20">
                    <ArrowRight className="w-6 h-6 text-purple-400/30 group-hover:text-purple-400/60 transition-colors" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          className="flex flex-col gap-4 sm:gap-6 md:gap-8 justify-center items-center mb-8 sm:mb-10 md:mb-12 px-2 sm:px-4"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          {/* Primary CTA */}
          <a
            href="https://calendly.com/xgaming/45-minute-meeting"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              className={`${styles.landingVisibleButton} ${styles.landingCtaGlow} px-6 sm:px-7 md:px-9 lg:px-11 xl:px-12 py-3 sm:py-4 md:py-5 lg:py-6 rounded-full text-white text-base sm:text-lg md:text-xl font-bold group hover:shadow-2xl hover:shadow-purple-500/25 transform transition-all duration-300 hover:scale-105`}
              data-testid="button-hero-cta"
            >
              <Rocket
                className="mr-2 sm:mr-3 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
                style={{
                  width: "clamp(20px, 1.2em, 28px)",
                  height: "clamp(20px, 1.2em, 28px)",
                  animation: `${styles.landingSubtlePulse} 3s ease-in-out infinite`,
                }}
              />
              Unlock Your Game's Potential
            </Button>
          </a>

          {/* Secondary Action */}
          <button
            onClick={() =>
              document
                .getElementById("demo-section")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="flex items-center text-gray-400 hover:text-purple-300 transition-all duration-300 group text-sm sm:text-base md:text-lg font-semibold px-1 sm:px-2"
            data-testid="button-watch-demo"
          >
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 group-hover:bg-purple-500/20 transition-all duration-300 mr-2 sm:mr-3 group-hover:scale-110">
              <Play className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 group-hover:text-purple-300 transition-colors" />
            </div>
            Watch Nova in Action
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Floating Stats */}
        <motion.div
          className="flex flex-row justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12 px-2 sm:px-3 md:px-4 max-w-4xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.6 }}
        >
          {[
            { value: "x10", label: "Faster Experiments", icon: TrendingUp },
            { value: "24/7", label: "Real-time Monitoring", icon: Target },
            { value: "<10ms", label: "Response Time", icon: Zap },
          ].map((stat, index) => (
            <motion.div
              key={index}
              className="text-center group cursor-pointer flex-1 min-w-0"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center justify-center mb-1 sm:mb-2">
                <stat.icon className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-purple-400 mr-1 sm:mr-2 group-hover:text-purple-300 transition-colors duration-200 flex-shrink-0" />
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white group-hover:text-purple-300 transition-colors duration-200 truncate">
                  {stat.value}
                </div>
              </div>
              <div className="text-xs sm:text-sm md:text-base text-gray-400 group-hover:text-gray-300 transition-colors duration-200 leading-tight">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// Clean How It Works Section
function HowItWorksSection() {
  return (
    <section
      id="demo-section"
      className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28 bg-gradient-to-tr from-[#1A1225] via-[#201728] to-[#17141F] relative overflow-hidden"
      data-testid="how-it-works-section"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        <AnimatedSection>
          <div className="text-center mb-12 sm:mb-14 md:mb-16">
            <SectionBadge text="See It in Action" color="purple" />

            <h2
              className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-display font-black mb-4 sm:mb-5 md:mb-6 text-white"
              data-testid="text-how-it-works-headline"
            >
              Watch <span className="gradient-text">Nova</span> Transform Your
              Game
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-xl xl:text-2xl text-gray-400 max-w-2xl mx-auto">
              Experience Nova's streamlined process through our interactive demo
            </p>
          </div>
        </AnimatedSection>

        {/* Product Demo Video */}
        <AnimatedSection delay={0.2}>
          <div className="max-w-4xl mx-auto px-4 sm:px-8">
            <div className="aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <iframe
                src="https://www.youtube.com/embed/cGEecOmQp1M"
                title="Nova Product Demo"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                data-testid="video-product-demo"
              />
            </div>
          </div>
        </AnimatedSection>

        {/* CTA after video */}
        {/* <AnimatedSection delay={0.4}>
          <div className="text-center mt-8 sm:mt-10 md:mt-12">
            <a href="https://calendly.com/xgaming/45-minute-meeting" target="_blank" rel="noopener noreferrer">
              <Button
                className={`${styles.landingVisibleButton} ${styles.landingCtaGlow} px-6 sm:px-8 md:px-10 lg:px-12 py-3 sm:py-4 md:py-5 lg:py-6 rounded-full text-base sm:text-lg md:text-xl lg:text-xl font-bold group hover:shadow-2xl hover:shadow-purple-500/25 transform transition-all duration-300 hover:scale-105`}
                data-testid="button-demo-cta"
              >
                <Sparkles
                  className="mr-2 sm:mr-3 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300"
                  style={{
                    width: 'clamp(20px, 1.2em, 28px)',
                    height: 'clamp(20px, 1.2em, 28px)'
                  }}
                />
                Get Your Demo
              </Button>
            </a>
          </div>
        </AnimatedSection> */}
      </div>

      {/* Hexagon dot pattern */}
      <div className="absolute inset-0 opacity-25">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,#8b5cf6_1px,transparent_1px)] bg-[length:30px_30px] sm:bg-[length:40px_40px] md:bg-[length:50px_50px]"></div>
      </div>
    </section>
  );
}

// Redesigned Problem Section
function ProblemSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section
      ref={ref}
      className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28 bg-gradient-to-br from-[#1A1014] via-[#221318] to-[#1F1117] relative overflow-hidden"
      data-testid="problem-section"
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 lg:w-[120%] lg:h-[120%] bg-red-500/5 rounded-full blur-2xl sm:blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-orange-500/4 rounded-full blur-2xl sm:blur-3xl" />
        {/* Diagonal lines pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_49%,#ff4444_49%,#ff4444_51%,transparent_51%)] bg-[length:25px_25px] sm:bg-[length:35px_35px] md:bg-[length:40px_40px]"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 relative z-10">
        {/* Section Header */}
        <AnimatedSection>
          <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
            <SectionBadge text="Why You Need This" color="red" />

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-display font-black mb-6 sm:mb-8 md:mb-10 lg:mb-12 text-white">
              The Cost of{" "}
              <span className="bg-gradient-to-r from-red-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
                Broken Experimentation
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
              {/* Problem 1: Too Complex */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl px-6 py-5 text-center">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-xl font-bold text-red-300">
                    Too Complex
                  </h3>
                </div>
                <p className="text-sm sm:text-sm md:text-base text-red-200 leading-relaxed">
                  Platforms require complex technical setup most studios can't
                  handle.
                </p>
              </div>

              {/* Problem 2: Isolated Tools */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl px-6 py-5 text-center">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <Unlink className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-xl font-bold text-red-300">
                    Isolated Tools
                  </h3>
                </div>
                <p className="text-sm sm:text-sm md:text-base text-red-200 leading-relaxed">
                  Analytics and testing tools don't connect, creating fragmented
                  insights.
                </p>
              </div>

              {/* Problem 3: Slow Setup */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl sm:rounded-2xl px-6 py-5 text-center">
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                  <h3 className="text-base sm:text-lg md:text-xl lg:text-xl font-bold text-red-300">
                    Slow Setup
                  </h3>
                </div>
                <p className="text-sm sm:text-sm md:text-base text-red-200 leading-relaxed">
                  Setup takes weeks, and by then player behavior has shifted.
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Interactive Problem Demonstration */}

        {/* The Result: Missed Opportunities */}
        <AnimatedSection delay={0.8}>
          <div className="relative">
            <div className={`${styles.landingCleanCard} rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center`}>
              <h3 className="text-lg sm:text-xl md:text-2xl lg:text-2xl font-bold text-white mb-6 sm:mb-8">
                The Result:{" "}
                <span className="text-red-400">Missed Opportunities</span>
              </h3>

              {/* Dashboard Illustration */}
              <div className="max-w-5xl lg:max-w-6xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={
                    isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
                  }
                  transition={{ delay: 1.0 }}
                  className="bg-gray-900/50 border border-gray-700/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 relative overflow-hidden"
                >
                  {/* Dashboard Header */}
                  <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8 pb-3 sm:pb-4 border-b border-gray-700/30">
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                      </div>
                      <div className="flex flex-col items-start">
                        <h4 className="text-sm sm:text-sm md:text-base font-bold text-white">
                          Player Insights
                        </h4>
                        <p className="text-xs sm:text-xs text-gray-400 hidden sm:block">
                          Player Experience Insights
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-1 sm:space-x-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
                    </div>
                  </div>

                  {/* Dashboard Content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-4 lg:gap-6">
                    {/* Metric Card 1 */}
                    <div className="bg-gray-800/40 border border-gray-600/30 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                      <div className="flex items-center mb-6">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 w-full">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
                          <span className="text-xs sm:text-xs md:text-sm font-medium text-gray-300 truncate">
                            Player Happiness Potential
                          </span>
                        </div>
                      </div>

                      {/* Fake gauge */}
                      <div className="h-10 sm:h-12 lg:h-16 flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                        <div className="relative w-14 h-7 sm:w-16 sm:h-8 lg:w-20 lg:h-10">
                          <div className="absolute inset-0 border-2 sm:border-3 lg:border-4 border-gray-600/50 border-t-gray-600 rounded-t-full"></div>
                          <div className="absolute bottom-0 left-1/2 w-0.5 h-5 sm:h-6 lg:h-8 bg-red-400 transform -translate-x-1/2 origin-bottom rotate-[-45deg]"></div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm sm:text-base md:text-lg lg:text-lg font-black text-red-400 mb-1">
                          Undiscovered
                        </div>
                      </div>
                    </div>

                    {/* Metric Card 2 */}
                    <div className="bg-gray-800/40 border border-gray-600/30 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                      <div className="flex items-center mb-6">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 w-full">
                          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
                          <span className="text-xs sm:text-xs md:text-sm font-medium text-gray-300 truncate">
                            Optimal Monetization
                          </span>
                        </div>
                      </div>

                      {/* Fake chart placeholder */}
                      <div className="h-10 sm:h-12 lg:h-16 bg-gray-700/30 rounded-lg flex items-end justify-between p-1 sm:p-2 space-x-1 mb-2 sm:mb-3 lg:mb-4">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="bg-gray-600/50 rounded-sm"
                            style={{
                              height: `${Math.random() * 40 + 20}%`,
                              width: "6px",
                            }}
                          ></div>
                        ))}
                      </div>

                      <div>
                        <div className="text-sm sm:text-base md:text-lg lg:text-lg font-black text-red-400 mb-1">
                          Never Found
                        </div>
                      </div>
                    </div>

                    {/* Metric Card 3 */}
                    <div className="bg-gray-800/40 border border-gray-600/30 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 md:col-span-2 xl:col-span-1">
                      <div className="flex items-center mb-6">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 w-full">
                          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 flex-shrink-0" />
                          <span className="text-xs sm:text-xs md:text-sm font-medium text-gray-300 truncate">
                            Perfect Game Experience
                          </span>
                        </div>
                      </div>

                      {/* Fake trend line */}
                      <div className="h-10 sm:h-12 lg:h-16 bg-gray-700/30 rounded-lg relative overflow-hidden mb-2 sm:mb-3 lg:mb-4">
                        <div className="absolute bottom-0 left-0 right-0 h-4 sm:h-6 lg:h-8 bg-gradient-to-t from-gray-600/20 to-transparent rounded-lg"></div>
                        <div className="absolute bottom-1 sm:bottom-2 lg:bottom-4 left-2 right-2 h-px bg-gray-600"></div>
                      </div>

                      <div>
                        <div className="text-sm sm:text-base md:text-lg lg:text-lg font-black text-red-400 mb-1">
                          Still Guessing
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Footer */}
                  <div className="mt-4 sm:mt-6 md:mt-8 pt-3 sm:pt-4 w-full flex justify-start border-t border-gray-700/30">
                    <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto justify-center">
                      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-400 rounded-full"></div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          Issues Detected
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full"></div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          No Experimentation Data
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// Platform Capabilities Section
function PlatformCapabilitiesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const capabilities = [
    {
      icon: Play,
      title: "Experiments",
      shortDesc: "Design & Test",
      features: [
        {
          icon: Settings,
          text: "Manage Experiences & Objects",
        },
        {
          icon: Target,
          text: "A/B Testing Framework",
        },
      ],
      color: "from-purple-400 via-purple-500 to-blue-500",
      bgGlow: "bg-purple-500/5",
    },
    {
      icon: Users,
      title: "Personalization",
      shortDesc: "Target & Personalize",
      features: [
        {
          icon: Users,
          text: "Rule-Based Segmentation",
        },
        {
          icon: Sparkles,
          text: "Dynamic Experience Delivery",
        },
      ],
      color: "from-blue-500 via-blue-600 to-cyan-500",
      bgGlow: "bg-blue-500/5",
    },
    {
      icon: PieChart,
      title: "Analytics",
      shortDesc: "Measure & Learn",
      features: [
        {
          icon: BarChart3,
          text: "Custom Metrics Tracking",
        },
        {
          icon: TrendingUp,
          text: "Actionable Insights Generation",
        },
      ],
      color: "from-teal-500 via-indigo-500 to-violet-500",
      bgGlow: "bg-teal-500/5",
    },
    {
      icon: Brain,
      title: "AI Optimization",
      shortDesc: "Optimize & Scale",
      features: [
        {
          icon: Brain,
          text: "AI-Powered Optimization",
        },
        {
          icon: Zap,
          text: "Data-Driven Recommendations",
        },
      ],
      color: "from-orange-500 via-orange-600 to-red-500",
      bgGlow: "bg-orange-500/5",
    },
  ];

  return (
    <section
      ref={ref}
      className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28 bg-gradient-to-bl from-[#12151A] via-[#1A2025] to-[#0F1A25] relative overflow-hidden"
      data-testid="platform-capabilities-section"
    >
      {/* Enhanced gradient mesh */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08)_0%,transparent_70%)] bg-[length:200px_150px] sm:bg-[length:300px_225px] md:bg-[length:400px_300px]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.06)_0%,transparent_60%)] bg-[length:250px_200px] sm:bg-[length:375px_300px] md:bg-[length:500px_400px]"></div>
      </div>
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/5 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-purple-500/5 rounded-full blur-2xl sm:blur-3xl" />
        <div className="absolute bottom-1/3 right-1/5 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 lg:w-[120%] lg:h-[120%] bg-blue-500/5 rounded-full blur-2xl sm:blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 relative z-10">
        {/* Section Header */}
        <AnimatedSection>
          <div className="text-center mb-12 sm:mb-16 md:mb-20 lg:mb-24">
            <SectionBadge text="What We Offer" color="teal" />

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-display font-black mb-6 sm:mb-8 md:mb-10 lg:mb-12 text-white">
              Complete{" "}
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-green-400 bg-clip-text text-transparent">
                Player Experience
              </span>{" "}
              Platform
            </h2>

            <p className="text-base sm:text-lg md:text-xl lg:text-xl xl:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Everything you need to personalize, experiment, and optimize your
              game
            </p>
          </div>
        </AnimatedSection>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
          {capabilities.map((capability, index) => (
            <AnimatedSection key={index} delay={index * 0.15}>
              <motion.div
                className="group cursor-pointer h-full"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={`${styles.landingCleanCard} border transition-all duration-500 rounded-2xl px-8 py-6 h-full relative overflow-hidden ${
                    capability.title === "Experiments"
                      ? "border-purple-400/20 group-hover:border-purple-500/60 group-hover:shadow-lg group-hover:shadow-purple-500/20"
                      : capability.title === "Personalization"
                        ? "border-blue-500/20 group-hover:border-blue-500/60 group-hover:shadow-lg group-hover:shadow-blue-500/20"
                        : capability.title === "Analytics"
                          ? "border-teal-500/20 group-hover:border-teal-500/60 group-hover:shadow-lg group-hover:shadow-teal-500/20"
                          : "border-orange-500/20 group-hover:border-orange-500/60 group-hover:shadow-lg group-hover:shadow-orange-500/20"
                  }`}
                >
                  {/* Background outlined icon */}
                  <div className="absolute bottom-4 right-4 opacity-10 group-hover:opacity-25 transition-all duration-500">
                    <capability.icon
                      className={`w-24 h-24 stroke-1 group-hover:stroke-2 text-white transition-all duration-500 ${
                        capability.title === "Experiments"
                          ? "group-hover:text-purple-500"
                          : capability.title === "Personalization"
                            ? "group-hover:text-blue-500"
                            : capability.title === "Analytics"
                              ? "group-hover:text-teal-500"
                              : "group-hover:text-orange-500"
                      }`}
                      strokeWidth={0.5}
                    />
                  </div>

                  {/* Header with prominent title */}
                  <div className="mb-4 sm:mb-6 md:mb-8">
                    <h3
                      className={`text-lg sm:text-xl md:text-2xl lg:text-2xl xl:text-3xl font-heading font-bold leading-tight tracking-wide bg-gradient-to-r ${capability.color} bg-clip-text text-transparent opacity-80`}
                    >
                      {capability.title}
                    </h3>
                  </div>

                  {/* Features list with more breathing room */}
                  <div className="space-y-3 sm:space-y-4 md:space-y-5 mb-4 sm:mb-5 md:mb-6">
                    {capability.features.map((feature, i) => (
                      <div key={i} className="relative">
                        <div
                          className={`absolute -left-2 top-1 w-1 h-4 sm:h-5 md:h-6 bg-gradient-to-b ${capability.color} rounded-full opacity-40`}
                        />
                        <div className="pl-2">
                          <h4 className="text-sm sm:text-base md:text-lg lg:text-lg font-bold text-white">
                            {feature.text}
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// Key Features Section
function KeyFeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const keyFeatures = [
    {
      icon: TrendingUp,
      title: "Gaming-Focused",
      description:
        "Built for game studios with player metrics and monetization tracking",
      color: "from-purple-500 to-purple-600",
      bgGlow: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      iconBg: "bg-purple-600",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description:
        "Sub-10ms response times with zero impact on player experience",
      color: "from-blue-500 to-blue-600",
      bgGlow: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      iconBg: "bg-blue-600",
    },
    {
      icon: Users,
      title: "Developer SDKs",
      description: "Unity, Unreal, and mobile SDKs with TypeScript support",
      color: "from-green-500 to-green-600",
      bgGlow: "bg-green-500/10",
      borderColor: "border-green-500/20",
      iconBg: "bg-green-600",
    },
    {
      icon: Layers,
      title: "Scale Ready",
      description:
        "Handle millions of concurrent players without breaking a sweat",
      color: "from-orange-500 to-orange-600",
      bgGlow: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      iconBg: "bg-orange-600",
    },
  ];

  return (
    <section
      ref={ref}
      className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28 bg-gradient-to-bl from-[#141A25] via-[#16192F] to-[#131722] relative overflow-hidden"
      data-testid="key-features-section"
    >
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 lg:w-[120%] lg:h-[120%] bg-blue-500/4 rounded-full blur-2xl sm:blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-indigo-500/3 rounded-full blur-2xl sm:blur-3xl" />
        {/* Soft wave lines suggesting speed */}
        <div className="absolute inset-0 opacity-25">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="speedWaves"
                x="0"
                y="0"
                width="100"
                height="50"
                patternUnits="userSpaceOnUse"
                className="sm:w-[150px] sm:h-[75px] md:w-[200px] md:h-[100px]"
              >
                <path
                  d="M0,25 Q25,15 50,25 T100,25"
                  fill="none"
                  stroke="rgba(59,130,246,0.4)"
                  strokeWidth="0.8"
                  className="sm:strokeWidth-1"
                />
                <path
                  d="M0,35 Q25,25 50,35 T100,35"
                  fill="none"
                  stroke="rgba(59,130,246,0.2)"
                  strokeWidth="0.6"
                  className="sm:strokeWidth-0.8"
                />
                <path
                  d="M0,15 Q25,5 50,15 T100,15"
                  fill="none"
                  stroke="rgba(59,130,246,0.2)"
                  strokeWidth="0.6"
                  className="sm:strokeWidth-0.8"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#speedWaves)" />
          </svg>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 relative z-10">
        {/* Section Header */}
        <AnimatedSection>
          <div className="text-center mb-10 sm:mb-12 md:mb-16 lg:mb-20">
            <SectionBadge text="Designed for Performance" color="blue" />

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-display font-black mb-4 sm:mb-6 md:mb-8 text-white">
              Built for{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Scale & Speed
              </span>
            </h2>

            <p className="text-base sm:text-lg md:text-xl lg:text-xl xl:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Nova combines enterprise-grade experimentation with the simplicity
              that game developers love
            </p>
          </div>
        </AnimatedSection>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-12 sm:mb-16 md:mb-20">
          {keyFeatures.map((feature, index) => (
            <AnimatedSection key={index} delay={index * 0.1}>
              <motion.div
                className="group cursor-pointer h-full"
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={`${styles.landingCleanCard} ${feature.bgGlow} border ${feature.borderColor} rounded-2xl p-6 h-full relative overflow-hidden group-hover:shadow-lg transition-all duration-500`}
                >
                  {/* Decorative dots */}
                  <div className="absolute top-4 right-4 flex space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                  </div>

                  {/* Mobile: Same row, Laptop+: Column layout */}
                  <div className="flex lg:block items-start gap-4 lg:gap-0">
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 ${feature.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 lg:mb-6 transition-transform duration-300`}
                    >
                      <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 lg:flex-none">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3 leading-tight">
                        {feature.title}
                      </h3>
                      <p className="text-sm sm:text-sm md:text-base text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>

        {/* Metrics Showcase */}
        <AnimatedSection delay={0.5}>
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-3xl font-display font-bold text-white mb-4">
              Performance That{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Scales
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8 max-w-4xl mx-auto">
            {[
              {
                metric: "<10ms",
                label: "Response Time",
                description: "Lightning-fast evaluation",
                color: "text-purple-400",
                bgColor: "bg-purple-500/10",
                borderColor: "border-purple-500/20",
              },
              {
                metric: "99.9%",
                label: "Uptime SLA",
                description: "Enterprise reliability",
                color: "text-blue-400",
                bgColor: "bg-blue-500/10",
                borderColor: "border-blue-500/20",
              },
              {
                metric: "1:1",
                label: "Personalisations",
                description: "Scale to millions",
                color: "text-cyan-400",
                bgColor: "bg-cyan-500/10",
                borderColor: "border-cyan-500/20",
              },
            ].map((metric, index) => (
              <motion.div
                key={index}
                className={`${styles.landingCleanCard} ${metric.bgColor} border ${metric.borderColor} rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 text-center group hover:scale-105 transition-all duration-300`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ y: -4 }}
              >
                <div
                  className={`text-lg sm:text-2xl md:text-2xl lg:text-3xl font-display font-black ${metric.color} mb-1 sm:mb-2 md:mb-3`}
                >
                  {metric.metric}
                </div>
                <div className="text-xs sm:text-base md:text-base lg:text-lg font-semibold text-white mb-1 sm:mb-2 leading-tight">
                  {metric.label}
                </div>
                <div className="text-xs sm:text-sm md:text-sm text-gray-400 leading-tight">
                  {metric.description}
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// Testimonial Section
function TestimonialSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section
      ref={ref}
      className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28 bg-gradient-to-br from-[#151A20] via-[#1A1F26] to-[#14191F] relative overflow-hidden"
      data-testid="testimonial-section"
    >
      {/* Subtle zigzag lines pattern */}
      <div className="absolute inset-0 opacity-50">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="successPattern"
              x="0"
              y="0"
              width="120"
              height="80"
              patternUnits="userSpaceOnUse"
            >
              {/* Horizontal zigzag lines */}
              <path
                d="M0,30 L15,20 L30,30 L45,20 L60,30 L75,20 L90,30 L105,20 L120,30"
                fill="none"
                stroke="rgba(16,185,129,0.15)"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              <path
                d="M0,50 L15,40 L30,50 L45,40 L60,50 L75,40 L90,50 L105,40 L120,50"
                fill="none"
                stroke="rgba(16,185,129,0.12)"
                strokeWidth="0.6"
                strokeLinecap="round"
              />
              <path
                d="M0,70 L15,60 L30,70 L45,60 L60,70 L75,60 L90,70 L105,60 L120,70"
                fill="none"
                stroke="rgba(16,185,129,0.1)"
                strokeWidth="0.5"
                strokeLinecap="round"
              />
              {/* Subtle vertical zigzags for variety */}
              <path
                d="M20,0 L30,15 L20,30 L30,45 L20,60 L30,75 L20,80"
                fill="none"
                stroke="rgba(59,130,246,0.08)"
                strokeWidth="0.4"
                strokeLinecap="round"
              />
              <path
                d="M80,0 L90,15 L80,30 L90,45 L80,60 L90,75 L80,80"
                fill="none"
                stroke="rgba(59,130,246,0.06)"
                strokeWidth="0.4"
                strokeLinecap="round"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#successPattern)" />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 relative z-10">
        {/* Section Header */}
        <AnimatedSection>
          <div className="text-center mb-10 sm:mb-12 md:mb-16 lg:mb-20">
            <SectionBadge text="Success Story" color="green" />

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-black mb-4 sm:mb-6 text-white">
              Real Results from{" "}
              <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Real Creators
              </span>
            </h2>
          </div>
        </AnimatedSection>

        {/* Testimonial Card */}
        <AnimatedSection delay={0.2}>
          <div className="max-w-4xl mx-auto">
            <div className={`${styles.landingCleanCard} rounded-2xl sm:rounded-3xl p-6 md:p-12 text-center relative overflow-hidden`}>
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-blue-100 rounded-full blur-2xl opacity-30" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full blur-2xl opacity-30" />

              <div className="relative z-10">
                {/* Quote */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                  }
                  transition={{ delay: 0.4 }}
                  className="mb-8"
                >
                  <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl text-emerald-300">
                    "
                  </div>
                  <p className="text-base sm:text-lg md:text-xl lg:text-xl xl:text-2xl text-gray-300 leading-relaxed font-medium">
                    We have one creator who achieved incredible results using
                    Nova's experimentation platform.
                  </p>
                </motion.div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8 mb-6 sm:mb-8 max-w-3xl mx-auto">
                  {[
                    {
                      value: "+70%",
                      label: "D7 Retention",
                      description: "Player retention boost",
                      color: "emerald",
                    },
                    {
                      value: "x100",
                      label: "Feature Interactions",
                      description: "Engagement increase",
                      color: "blue",
                    },
                    {
                      value: "$1.2",
                      label: "RPU",
                      description: "Revenue per user",
                      color: "purple",
                    },
                  ].map((metric, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={
                        isInView
                          ? { opacity: 1, scale: 1 }
                          : { opacity: 0, scale: 0.8 }
                      }
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="text-center py-2 sm:py-4 md:py-6"
                    >
                      <div
                        className={`text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black mb-1 sm:mb-2 md:mb-3 bg-gradient-to-r from-${metric.color}-500 to-${metric.color}-600 bg-clip-text text-transparent`}
                      >
                        {metric.value}
                      </div>
                      <div className="text-xs sm:text-base md:text-lg lg:text-lg font-bold text-white mb-1 sm:mb-2 leading-tight">
                        {metric.label}
                      </div>
                      <div className="text-xs sm:text-sm md:text-base text-gray-400 leading-tight">
                        {metric.description}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Creator Info */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ delay: 1 }}
                  className="flex items-center justify-center space-x-4"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">G</span>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white">Game Creator</div>
                    <div className="text-sm text-gray-400">
                      Nova Platform User
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// Enhanced Final CTA Section
function FinalCTASection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0.8, 1], [1, 1.05]);

  return (
    <section
      ref={ref}
      className="py-20 sm:py-28 md:py-36 relative overflow-hidden"
      data-testid="final-cta-section"
    >
      {/* Dramatic background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/15 via-blue-900/15 to-purple-900/15 sm:from-purple-900/20 sm:via-blue-900/20 sm:to-purple-900/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08)_0%,transparent_60%)] sm:bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.1)_0%,transparent_70%)]" />

      <motion.div
        className="max-w-6xl mx-auto px-4 sm:px-8 text-center relative z-10"
        style={{ scale }}
      >
        <AnimatedSection>
          <div className="mb-8 sm:mb-12">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="inline-block px-4 sm:px-6 py-1.5 sm:py-2 rounded-full bg-purple-900/20 border border-purple-600/30 mb-6 sm:mb-8"
            >
              <span className="text-sm sm:text-base font-medium text-purple-300">
                Take Control Now
              </span>
            </motion.div>

            <h2
              className={`text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-black mb-4 sm:mb-6 md:mb-8 leading-none ${styles.landingTextGlow} px-4`}
              data-testid="text-final-cta-headline"
            >
              Ready to <span className="gradient-text">Own Your Growth?</span>
            </h2>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.3}>
          <p
            className="text-base sm:text-lg md:text-xl lg:text-xl xl:text-2xl text-gray-200 mb-8 sm:mb-12 md:mb-16 max-w-3xl mx-auto font-light leading-relaxed px-4"
            data-testid="text-final-cta-description"
          >
            Stop juggling tools. Book a demo to see how Nova's unified platform
            helps you discover and act on what truly works.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.6}>
          <div className="flex justify-center items-center px-4">
            <a
              href="https://calendly.com/xgaming/45-minute-meeting"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                className="group relative px-6 sm:px-8 md:px-10 lg:px-12 py-3 sm:py-4 md:py-5 lg:py-6 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white rounded-full text-base sm:text-lg md:text-xl lg:text-xl font-bold elegant-glow hover:scale-105 transition-all duration-300 border-0 overflow-hidden shadow-2xl w-full sm:w-auto"
                data-testid="button-final-cta"
              >
                <span className="relative z-10 flex items-center">
                  Book a Free Demo
                  <ArrowRight
                    className="ml-2 sm:ml-3 group-hover:translate-x-2 group-hover:scale-110 transition-all duration-300"
                    style={{
                      width: "clamp(20px, 1.2em, 28px)",
                      height: "clamp(20px, 1.2em, 28px)",
                    }}
                  />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </Button>
            </a>
          </div>
        </AnimatedSection>
      </motion.div>

      {/* Floating elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-3 h-3 rounded-full ${
              i % 3 === 0
                ? "bg-purple-400/30"
                : i % 3 === 1
                  ? "bg-blue-400/30"
                  : "bg-white/20"
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              opacity: [0.2, 0.8, 0.2],
              scale: [0.8, 1.4, 0.8],
            }}
            transition={{
              duration: 8 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    </section>
  );
}

interface NavigationBarProps {
  openLogin: () => void;
  openSignup: () => void;
}

function NavigationBar({ openLogin, openSignup }: NavigationBarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <div className="flex items-center space-x-4">
          <a href="/docs" className="inline-block" aria-label="Documentation">
            <a href="/docs" className="inline-block" aria-label="Documentation">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Documentation
              </Button>
            </a>
          </a>
          <a href="/docs/react-sdk/intro" className="inline-block" aria-label="SDK docs">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              SDK
            </Button>
          </a>
          {/* Experiment Compass & LiveOps buttons (donor features) */}
          <Link href="/experiment-compass">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" data-testid="button-experiment-compass">
              <Compass className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Experiment Compass</span>
            </Button>
          </Link>
          <Link href="/liveops-refinery">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" data-testid="button-liveops-refinery">
              <Zap className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">LiveOps Refinery</span>
            </Button>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Button
            variant="ghost"
            onClick={openLogin}
            aria-label="Open login dialog"
            className="text-muted-foreground hover:text-foreground"
          >
            Login
          </Button>
          <Button
            onClick={openSignup}
            aria-label="Go to signup"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  );
}

export default function Landing() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [, setLocation] = useLocation();

  const openLogin = () => setLoginModalOpen(true);
  const openSignup = () => setLocation('/signup');
  const closeAuth = () => setLoginModalOpen(false);
  
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <NavigationBar openLogin={openLogin} openSignup={openSignup} />
      <HeroSection />
      <HowItWorksSection />
      <ProblemSection />
      <PlatformCapabilitiesSection />
      <KeyFeaturesSection />
      <TestimonialSection />
      <FinalCTASection />
      
      {/* Add LoginModal component */}
      <LoginModal 
        open={loginModalOpen} 
        onClose={closeAuth}
      />
    </div>
  );
}
