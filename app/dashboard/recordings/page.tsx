"use client";

import DashboardLayout from "../components/dashboard-layout";
import { Play, Download } from "lucide-react";

const mockRecordings = [
  {
    id: 1,
    title: "Weekly Team Standup",
    date: "2024-07-01",
    duration: "45 min",
    participants: 3,
  },
  {
    id: 2,
    title: "Podcast Episode #24",
    date: "2024-06-28",
    duration: "1h 20m",
    participants: 2,
  },
  {
    id: 3,
    title: "Client Interview",
    date: "2024-06-25",
    duration: "30 min",
    participants: 2,
  },
  {
    id: 4,
    title: "Product Demo",
    date: "2024-06-20",
    duration: "50 min",
    participants: 4,
  },
  {
    id: 5,
    title: "All Hands Meeting",
    date: "2024-06-15",
    duration: "1h 5m",
    participants: 8,
  },
];

export default function RecordingsPage() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-8 text-card-foreground">Recordings</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockRecordings.map((rec) => (
          <div
            key={rec.id}
            className="bg-card rounded-xl p-6 border border-border shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(rec.date).toLocaleDateString()}
                </span>
              </div>
              <h2 className="font-semibold text-card-foreground mb-1 truncate">
                {rec.title}
              </h2>
              <p className="text-sm text-muted-foreground mb-2">
                {rec.duration} • {rec.participants} participant{rec.participants > 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow">
                <Play className="w-4 h-4" />
                <span>View Recording</span>
              </button>
              <button className="flex-1 border border-border bg-transparent hover:bg-secondary text-foreground py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
} 