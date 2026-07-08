export function ReviewsList({ reviews }: { reviews: { q: string; a: string }[] }) {
  return (
    <div className="flex flex-col gap-[10px]">
      {reviews.map((rv, i) => (
        <div key={i} className="rounded-[22px] bg-mist px-[18px] py-4">
          <div className="font-serif text-[17px] italic leading-[1.35]">&ldquo;{rv.q}&rdquo;</div>
          <div className="mt-[9px] text-[10.5px] font-semibold uppercase tracking-[0.1em] text-label">{rv.a}</div>
        </div>
      ))}
    </div>
  );
}
