import React, { useRef, useState, useEffect } from "react";

interface MouseDrivenContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  sensitivity?: number;
  maxScale?: number;
  className?: string;
}

export const MouseDrivenContainer: React.FC<MouseDrivenContainerProps> = ({
  children,
  sensitivity = 20, // Lower number = more sensitive
  maxScale = 1.5,
  className = "",
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance from center
      const deltaX = (e.clientX - centerX) / sensitivity;
      const deltaY = (e.clientY - centerY) / sensitivity;

      // Move in opposite direction of mouse
      setPosition({
        x: -deltaX,
        y: -deltaY,
      });
    };

    const handleMouseLeave = () => {
      // Reset position when mouse leaves
      setPosition({ x: 0, y: 0 });
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [sensitivity]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      {...props}
    >
      <div
        className="w-full h-full"
        style={{
          transform: `scale(${maxScale}) translate(${position.x}px, ${position.y}px)`,
          transition: "transform 0.35s ease-out",
          transformOrigin: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
};
