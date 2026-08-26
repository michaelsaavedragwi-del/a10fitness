const TENDENCIES: Record<string, { summary: string; watch: string[] }> = {
  Narrow: {
    summary: "Narrow infrasternal angle — tends toward a longer, more zipped-up ribcage position.",
    watch: [
      "May under-rotate into extension/inhalation positions",
      "Often needs more work expanding into 360° breathing",
      "Can present as more rigid through the trunk under load",
    ],
  },
  Wide: {
    summary: "Wide infrasternal angle — tends toward a flared, extended ribcage position.",
    watch: [
      "May over-extend and rely on the lower back instead of the abdominal wall",
      "Often benefits from anti-extension and exhale-biased drills",
      "Can present as excessive rib flare during overhead / rotational work",
    ],
  },
  None: {
    summary: "No movement classification recorded yet.",
    watch: [],
  },
};

export function IsaProfile({ isa }: { isa: string }) {
  const info = TENDENCIES[isa] ?? TENDENCIES.None;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h3>Movement Profile</h3>
        <span className={`tag ${isa === "None" ? "" : "lime"}`}>{isa}</span>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <svg width={200} height={160} viewBox="0 0 200 160">
          {/* side-view spine + ribcage sketch, shape nudges with classification */}
          <path
            d={
              isa === "Wide"
                ? "M40,140 C40,100 30,70 45,40 C55,20 90,15 100,20"
                : isa === "Narrow"
                  ? "M40,140 C42,100 42,65 50,35 C58,18 90,14 100,18"
                  : "M40,140 C41,100 36,68 47,38 C56,19 90,15 100,19"
            }
            fill="none"
            stroke="var(--lime)"
            strokeWidth={2}
          />
          <ellipse
            cx={isa === "Wide" ? 55 : 50}
            cy={70}
            rx={isa === "Wide" ? 26 : isa === "Narrow" ? 18 : 22}
            ry={30}
            fill="none"
            stroke="var(--text-mute)"
            strokeWidth={1.5}
          />
          <text x={10} y={150} fontSize="9" fill="var(--text-mute)">
            infrasternal angle: {isa === "None" ? "n/a" : isa.toLowerCase()}
          </text>
        </svg>

        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ marginBottom: 8 }}>{info.summary}</p>
          {info.watch.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-sec)" }}>
              {info.watch.map((w) => (
                <li key={w} style={{ marginBottom: 4 }}>
                  {w}
                </li>
              ))}
            </ul>
          )}
          <p className="hint" style={{ marginTop: 10 }}>
            This is a coaching framework, not a diagnosis — tune the classifications and
            tendencies to how your staff assesses movement.
          </p>
        </div>
      </div>
    </div>
  );
}
