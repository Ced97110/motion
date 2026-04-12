"use client";

import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import StatsBar from "@/components/landing/StatsBar";
import DifferenceSection from "@/components/landing/DifferenceSection";
import ModulesSection from "@/components/landing/ModulesSection";
import ArchetypesSection from "@/components/landing/ArchetypesSection";
import HowItWorks from "@/components/landing/HowItWorks";
import PricingSection from "@/components/landing/PricingSection";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <LandingNav />
      <HeroSection />
      <StatsBar />
      <DifferenceSection />
      <ModulesSection />
      <ArchetypesSection />
      <HowItWorks />
      <PricingSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
