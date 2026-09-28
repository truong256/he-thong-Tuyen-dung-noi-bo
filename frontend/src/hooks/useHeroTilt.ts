import { useState, useRef, useCallback } from 'react';

interface TiltStyle {
  transform: string;
  transition: string;
}

export const useHeroTilt = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState<TiltStyle>({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
    transition: 'transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    // Only apply on fine pointer (desktop mouse)
    if (!window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update CSS variables for mouse radial glow
    const pctX = `${Math.round((x / rect.width) * 100)}%`;
    const pctY = `${Math.round((y / rect.height) * 100)}%`;
    container.style.setProperty('--mouse-x', pctX);
    container.style.setProperty('--mouse-y', pctY);

    // Subtle 3D tilt (max 2 degrees)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 2;
    const rotateX = -((y - centerY) / centerY) * 2;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`,
      transition: 'transform 100ms ease-out',
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
      transition: 'transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    });
  }, []);

  return {
    containerRef,
    tiltStyle,
    handleMouseMove,
    handleMouseLeave,
  };
};

export default useHeroTilt;
