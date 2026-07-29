// frontend/src/pages/LandingPage.jsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import DemoSection from '../components/landing/DemoSection';
import CtaSection from '../components/landing/CtaSection';
import FaqSection from '../components/landing/FaqSection';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  const { token } = useAuth();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <LandingNavbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DemoSection />
      <CtaSection />
      <FaqSection />
      <LandingFooter />
    </div>
  );
}
