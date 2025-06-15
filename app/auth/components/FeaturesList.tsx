import { Check } from "lucide-react";

const features = [
  {
    title: "High-quality local recording",
    description:
      "Record crystal-clear audio and video directly in your browser",
  },
  {
    title: "Automatic cloud backup",
    description: "Your recordings are automatically uploaded as you record",
  },
  {
    title: "Collaborate with your team",
    description: "Record with multiple participants from anywhere in the world",
  },
];

export default function FeaturesList() {
  return (
    <div className="space-y-6">
      {features.map((feature, index) => (
        <div key={index} className="flex items-start">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-md bg-purple-500/10 text-purple-400">
              <Check className="h-5 w-5" />
            </div>
          </div>
          <div className="ml-4">
            <p className="text-base font-medium text-white">{feature.title}</p>
            <p className="mt-1 text-sm text-gray-400">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
