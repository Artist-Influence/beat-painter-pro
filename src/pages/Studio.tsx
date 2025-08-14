import React from "react";
import { StudioLayoutV2 } from "@/components/studio/StudioLayoutV2";
import { useEngagementTracker } from "@/hooks/useEngagementTracker";
import { useSEO } from "@/hooks/useSEO";

const StudioPage: React.FC = () => {
  useEngagementTracker();
  useSEO({
    title: "Visualizer Studio – Real-time Music Visualizer",
    description: "Create and record stunning music visualizers in your browser.",
    canonical: window.location.origin + "/",
  });

  return <StudioLayoutV2 />;
};

export default StudioPage;
