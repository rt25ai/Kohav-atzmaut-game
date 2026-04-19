type SummarySingleBarChartProps = {
  answerLabel: string;
  percentage: number;
};

export function SummarySingleBarChart({
  answerLabel,
  percentage,
}: SummarySingleBarChartProps) {
  const barHeight = Math.max(18, Math.min(percentage, 100));

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-dim)]">
            Y
          </p>
          <p className="mt-2 text-sm text-[var(--text-soft)]">אחוז שבחרו כמוך</p>
          <p className="mt-3 font-display text-4xl text-white">{percentage}%</p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-[#071427]/78 px-4 py-5">
          <div className="flex min-h-[15rem] items-end justify-center">
            <div className="flex w-full max-w-[10rem] flex-col items-center gap-3">
              <div className="flex h-44 w-full items-end justify-center rounded-[20px] border border-white/8 bg-white/6 p-3">
                <div
                  data-summary-single-bar
                  className="result-fill w-full rounded-[18px]"
                  style={{ height: `${barHeight}%` }}
                />
              </div>
              <div className="w-full text-center">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-dim)]">
                  X
                </p>
                <p className="mt-2 text-sm leading-6 text-white">{answerLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
