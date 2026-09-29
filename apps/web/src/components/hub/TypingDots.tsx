/*
 * The assistant is typing: three dots rising in turn, shown from the moment a
 * message is sent until the first token of the reply arrives. The motion is
 * the `.animate-typing-dot` keyframe in globals.css (off under reduced motion);
 * screen readers hear "Assistant is typing" instead.
 */
export function TypingDots() {
  return (
    <span role="status" aria-label="Assistant is typing" className="inline-flex items-center gap-1 py-[2px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="animate-typing-dot h-[5px] w-[5px] rounded-full bg-text-tertiary"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  )
}

export default TypingDots
