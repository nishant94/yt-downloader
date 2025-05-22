import { useEffect, useRef } from "react";

const blobs = [
  {
    className:
      "absolute rounded-full opacity-30 blur-3xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-transparent",
    size: 420,
    offset: { x: -60, y: 0 },
    delay: 0,
  },
  {
    className:
      "absolute rounded-full opacity-25 blur-3xl bg-gradient-to-br from-fuchsia-400 via-cyan-500 to-transparent",
    size: 350,
    offset: { x: 60, y: -40 },
    delay: 80,
  },
  {
    className:
      "absolute rounded-full opacity-20 blur-3xl bg-gradient-to-br from-cyan-300 via-fuchsia-300 to-transparent",
    size: 500,
    offset: { x: 0, y: 60 },
    delay: 160,
  },
];

const AnimatedBackground = () => {
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let animationFrame: number;
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let current = { ...mouse };

    const moveBlobs = () => {
      current.x += (mouse.x - current.x) * 0.12;
      current.y += (mouse.y - current.y) * 0.12;
      blobs.forEach((blob, i) => {
        const ref = blobRefs.current[i];
        if (ref) {
          const x = current.x + blob.offset.x;
          const y = current.y + blob.offset.y;
          ref.style.left = `${x - blob.size / 2}px`;
          ref.style.top = `${y - blob.size / 2}px`;
        }
      });
      animationFrame = requestAnimationFrame(moveBlobs);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      let x = 0,
        y = 0;
      if (e instanceof TouchEvent && e.touches && e.touches[0]) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else if (e instanceof MouseEvent) {
        x = e.clientX;
        y = e.clientY;
      }
      mouse.x = x;
      mouse.y = y;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove);
    moveBlobs();
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none bg-white dark:bg-black/50 overflow-hidden">
      {blobs.map((blob, i) => (
        <div
          key={i}
          ref={(el) => {
            blobRefs.current[i] = el;
          }}
          className={blob.className}
          style={{
            position: "absolute",
            width: blob.size,
            height: blob.size,
            transition: `box-shadow 1.5s cubic-bezier(.4,0,.2,1)`,
            filter: `blur(150px)`,
          }}
        ></div>
      ))}
    </div>
  );
};

export default AnimatedBackground;
