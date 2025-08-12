import React from "react";
import StudioLayout from "@/components/studio/StudioLayout";
import { useEngagementTracker } from "@/hooks/useEngagementTracker";
import { useSEO } from "@/hooks/useSEO";

const StudioPage: React.FC = () => {
  useEngagementTracker();
  useSEO({
    title: "Visualizer Studio – Real-time Music Visualizer",
    description: "Create and record stunning music visualizers in your browser.",
    canonical: window.location.origin + "/",
  });

  return (
    <div>
      <StudioLayout />
    </div>
  );
};

export default StudioPage;
