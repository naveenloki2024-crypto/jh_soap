/** Small botanical-toned spinner used inside submit buttons. */
export default function Spinner({ size = 16 }) {
  return (
    <span
      className="auth-spinner"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
