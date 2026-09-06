/**
 * The New Zealand landscape behind the welcoming screens.
 *
 * Straight from the gilmore.games art direction: rolling hills, distant
 * mountains, a slow sun, a couple of sheep. Entirely CSS, so it costs no
 * download and cannot fail to load on a phone in bed.
 *
 * It sits behind HQ, the first run and the sign-in — and deliberately nowhere
 * near the play screen, where the only thing worth looking at is his own code.
 * Every element is decorative and hidden from screen readers.
 */
export function Landscape() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="sun" />
      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      <div className="mountains" />
      <div className="hill-back" />
      <div className="hill-front" />
      <div className="sheep sheep-one">🐑</div>
      <div className="sheep sheep-two">🐑</div>
    </div>
  );
}
