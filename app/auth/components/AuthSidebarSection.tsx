import AuthBadge from "./AuthBadge";
import FeaturesList from "./FeaturesList";
import Testimonial from "./Testimonial";

export default function AuthSidebarSection() {
  return (
    <div className="hidden md:flex md:flex-1 bg-gray-900 flex-col justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-gray-900 to-pink-900/20" />

      <div className="relative px-8 lg:px-16 flex flex-col justify-center h-full z-10">
        <AuthBadge />

        <h3 className="text-2xl font-bold text-white mb-6">
          Start recording studio-quality content in minutes — no software
          needed.
        </h3>

        <FeaturesList />
        <Testimonial />
      </div>

      {/* Abstract shapes */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl" />
    </div>
  );
}
