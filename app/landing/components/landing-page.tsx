import Header from './Header'
import HeroSection from './HeroSection'
import FeaturesSection from './FeaturesSection'
import TestimonialsSection from './TestimonialsSection'
import FAQSection from './FAQSection'
import CTASection from './CTASection'
import Footer from './Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  )
}
