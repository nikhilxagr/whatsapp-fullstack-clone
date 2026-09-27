import React from "react";

const StatusRing = ({
  totalSegments = 1,
  unviewedSegments = 0,
  size = 54,
  strokeWidth = 2.5,
  className = "",
  children,
}) => {
  if (totalSegments <= 0) {
    return <div className={`relative ${className}`}>{children}</div>;
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const isAllViewed = unviewedSegments === 0;

  // Single story ring
  if (totalSegments === 1) {
    const strokeColor = isAllViewed ? "#8696a0" : "#00a884";
    return (
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <svg
          className="absolute inset-0 pointer-events-none"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </svg>
        <div className="relative z-10 overflow-hidden rounded-full p-[2.5px]">
          {children}
        </div>
      </div>
    );
  }

  // Multi-story segmented ring
  const gap = Math.min(8, Math.max(3, 360 / totalSegments / 8)); // gap size in degrees
  const arcLength = (360 - gap * totalSegments) / totalSegments;
  const arcStrokeDash = (arcLength / 360) * circumference;
  const gapStrokeDash = (gap / 360) * circumference;

  const segments = [];
  // Segment arrangement: unviewed first, then viewed
  const viewedCount = totalSegments - unviewedSegments;

  for (let i = 0; i < totalSegments; i++) {
    // If there are unviewed, the first `unviewedSegments` are green
    const isUnviewed = i < unviewedSegments;
    const strokeColor = isUnviewed ? "#00a884" : "#8696a0";

    const rotation = i * (arcLength + gap) - 90;

    segments.push(
      <circle
        key={i}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={`${arcStrokeDash} ${circumference - arcStrokeDash}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
      />
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        className="absolute inset-0 pointer-events-none"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {segments}
      </svg>
      <div className="relative z-10 overflow-hidden rounded-full p-[2.5px]">
        {children}
      </div>
    </div>
  );
};

export default StatusRing;
