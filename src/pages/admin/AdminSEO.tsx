import React, { useEffect } from "react";

const AdminSEO: React.FC = () => {
  useEffect(() => {
    document.title = "Admin Dashboard – Audio Visual Studio";

    const desc =
      "Operator dashboard for campaigns, creators, and analytics in Audio Visual Studio.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/admin`;

    // Structured data (WebApplication)
    const ld = document.getElementById("ld-json-admin");
    if (ld) ld.remove();
    const script = document.createElement("script");
    script.id = "ld-json-admin";
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Audio Visual Studio Admin Dashboard",
      url: `${window.location.origin}/admin`,
      applicationCategory: "BusinessApplication",
      description: desc,
    });
    document.head.appendChild(script);
  }, []);

  return null;
};

export default AdminSEO;
