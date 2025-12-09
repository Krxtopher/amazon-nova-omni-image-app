import { useState, useEffect } from "react";

interface UseMouseActivityOptions {
  inactivityTimeout?: number; // Time in milliseconds
}

export const useMouseActivity = ({
  inactivityTimeout = 5000,
}: UseMouseActivityOptions = {}) => {
  const [mouseIsActive, setMouseIsActive] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleMouseActivity = () => {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set mouse as active and show cursor
      setMouseIsActive(true);
      document.body.style.cursor = "auto";

      // Start new timeout to set inactive after specified duration
      timeoutId = setTimeout(() => {
        setMouseIsActive(false);
        document.body.style.cursor = "none";
      }, inactivityTimeout);
    };

    // Add event listener
    window.addEventListener("mousemove", handleMouseActivity);
    window.addEventListener("wheel", handleMouseActivity);

    // Initial timeout
    timeoutId = setTimeout(() => {
      setMouseIsActive(false);
      document.body.style.cursor = "none";
    }, inactivityTimeout);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseActivity);
      window.removeEventListener("wheel", handleMouseActivity);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Ensure cursor is visible when component unmounts
      document.body.style.cursor = "auto";
    };
  }, [inactivityTimeout]);

  return { mouseIsActive };
};
