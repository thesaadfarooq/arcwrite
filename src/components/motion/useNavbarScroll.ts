import { useEffect, useState, useRef } from "react";

interface NavbarScrollState {
  isScrolled: boolean;
  isVisible: boolean;
}

export function useNavbarScroll(): NavbarScrollState {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const rafId = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        setIsScrolled(y > 50);

        if (y < 100) {
          setIsVisible(true);
        } else {
          const delta = y - lastScrollY.current;
          if (Math.abs(delta) > 5) {
            setIsVisible(delta < 0);
          }
        }

        lastScrollY.current = y;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return { isScrolled, isVisible };
}
