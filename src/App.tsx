import VideoPoker from "./VideoPoker";
import useScaleToFit from "./hooks/useScaleToFit";

// Base design resolution for the layout. Tune to current UI footprint.
const BASE_WIDTH = 1100; // matches .wrap max-width in styles
const BASE_HEIGHT = 800; // approximate total height of header+cards+bar

export default function App() {
  const { containerRef, scale } = useScaleToFit(BASE_WIDTH, BASE_HEIGHT);
  return (
    <div ref={containerRef} className="viewport">
      <div
        className="scaled-shell"
        style={{ width: BASE_WIDTH, height: BASE_HEIGHT }}
        aria-hidden
      />
      <div
        className="scaled-content"
        style={{ transform: `scale(${scale})`, width: BASE_WIDTH, height: BASE_HEIGHT }}
      >
        <VideoPoker />
      </div>
    </div>
  );
}
