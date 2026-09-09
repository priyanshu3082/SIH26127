"use client";

import * as React from "react";

const STEP_MS = 1100;

/** Drives the "route draws itself point-by-point" demo animation: progress
 * counts how many stops (1..length) are currently revealed on the map. */
export function usePlayback(length: number) {
  const [progress, setProgress] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    setProgress(length > 0 ? 1 : 0);
    setPlaying(false);
  }, [length]);

  React.useEffect(() => {
    if (!playing) return;
    if (progress >= length) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setProgress((p) => Math.min(p + 1, length)), STEP_MS);
    return () => clearTimeout(id);
  }, [playing, progress, length]);

  const toggle = React.useCallback(() => {
    setPlaying((p) => {
      if (!p && progress >= length) setProgress(1);
      return !p;
    });
  }, [progress, length]);

  const reset = React.useCallback(() => {
    setProgress(length > 0 ? 1 : 0);
    setPlaying(false);
  }, [length]);

  return { progress, setProgress, playing, toggle, reset };
}
