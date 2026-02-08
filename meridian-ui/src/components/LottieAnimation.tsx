"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

interface LottieAnimationProps {
  src: string;
  width?: number | string;
  height?: number | string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
}

export default function LottieAnimation({
  src,
  width = 100,
  height = 100,
  loop = true,
  autoplay = true,
  className,
}: LottieAnimationProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    fetch(src)
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch(() => {});
  }, [src]);

  if (!animationData) return null;

  return (
    <div className={className} style={{ width, height }}>
      <Lottie
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        rendererSettings={{
          preserveAspectRatio: "xMidYMid slice",
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
