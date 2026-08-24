import { JOINTS, parseRom, sideFlags, type RomFlag } from "@/lib/rom";

const FLAG_COLOR: Record<RomFlag, string> = {
  good: "var(--green)",
  warning: "var(--orange)",
  red: "var(--red)",
};

export function AnatomyPanel({ rom }: { rom: unknown }) {
  const assessment = parseRom(rom);

  if (!assessment) {
    return (
      <div className="card">
        <h3>Range of Motion</h3>
        <div className="empty-state">No ROM assessment on file yet.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h3>Range of Motion</h3>
        <span className="hint">Assessed {assessment.date}</span>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <svg width={140} height={420} viewBox="0 0 100 420">
          {/* minimal front-view skeleton */}
          <circle cx={50} cy={30} r={14} fill="none" stroke="var(--text-mute)" strokeWidth={1.5} />
          <line x1={50} y1={44} x2={50} y2={230} stroke="var(--text-mute)" strokeWidth={1.5} />
          <line x1={20} y1={90} x2={80} y2={90} stroke="var(--text-mute)" strokeWidth={1.5} />
          <line x1={20} y1={230} x2={80} y2={230} stroke="var(--text-mute)" strokeWidth={1.5} />
          <line x1={30} y1={230} x2={30} y2={390} stroke="var(--text-mute)" strokeWidth={1.5} />
          <line x1={70} y1={230} x2={70} y2={390} stroke="var(--text-mute)" strokeWidth={1.5} />

          {JOINTS.map((j) => {
            const side = assessment.tests[j.key];
            if (!side) return null;
            const flags = sideFlags(side);
            const color = side.flag ? FLAG_COLOR[side.flag] : "var(--blue-dim)";
            const lx = j.key === "wrist" ? 20 : j.key === "ankle" ? 30 : 20;
            const rx = j.key === "wrist" ? 80 : j.key === "ankle" ? 70 : 80;
            return (
              <g key={j.key}>
                <circle cx={lx} cy={j.y} r={flags.l ? 6 : 4.5} fill={flags.l ? color : "var(--blue-dim)"}>
                  <title>{`${j.label} (L): ${side.l}°${side.flag ? ` — ${side.flag}` : ""}${side.note ? ` ${side.note}` : ""}`}</title>
                </circle>
                <circle cx={rx} cy={j.y} r={flags.r ? 6 : 4.5} fill={flags.r ? color : "var(--blue-dim)"}>
                  <title>{`${j.label} (R): ${side.r}°${side.flag ? ` — ${side.flag}` : ""}${side.note ? ` ${side.note}` : ""}`}</title>
                </circle>
              </g>
            );
          })}
        </svg>

        <div style={{ flex: 1, minWidth: 260 }}>
          <table>
            <thead>
              <tr>
                <th>Joint</th>
                <th>L</th>
                <th>R</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {JOINTS.map((j) => {
                const side = assessment.tests[j.key];
                if (!side) return null;
                return (
                  <tr key={j.key}>
                    <td className="name-cell">{j.label}</td>
                    <td className="num">{side.l}°</td>
                    <td className="num">{side.r}°</td>
                    <td>
                      {side.flag && side.flag !== "good" ? (
                        <span className={`tag ${side.flag === "red" ? "red" : "orange"}`}>{side.flag}</span>
                      ) : (
                        <span className="tag green">good</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
