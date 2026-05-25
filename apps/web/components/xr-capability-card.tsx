"use client";

import { useEffect, useState } from "react";

export function XrCapabilityCard() {
  const [supportsXr, setSupportsXr] = useState<boolean | null>(null);

  useEffect(() => {
    setSupportsXr(typeof navigator !== "undefined" && "xr" in navigator);
  }, []);

  return (
    <section className="card">
      <p className="eyebrow">Component Gallery</p>
      <h2>WebXR Runtime Check</h2>
      <p>
        This baseline confirms the browser exposes the WebXR entry point so
        Phase 2 can layer in scene rendering without changing the app
        foundation.
      </p>
      <div className="status" data-unsupported={supportsXr === false}>
        <span>
          {supportsXr
            ? "WebXR available"
            : supportsXr === false
              ? "2D fallback only"
              : "Checking browser"}
        </span>
      </div>
    </section>
  );
}
