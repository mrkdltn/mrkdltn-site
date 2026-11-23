/* Attendance Explorer: one colour family per meaning, as in the Ofsted Explorer.
   - Lower absence than the comparison: verdigris (#2F6F66, deep #1E544D). Higher: rust (#A3402B, deep #7A2617). Close: slate.
     These are the Explorer's readings colours and are never Ofsted's grade colours.
   - The place on screen: the midnight diamond. The comparison group: verdigris marks. England: slate.
   - Brass marks structure and selection only, never data. */
(function () {
  const LOW = d3.interpolateRgb('#E7EFEC', '#1E544D'), HIGH = d3.interpolateRgb('#F6E9E4', '#7A2617');
  const pc = (v) => (v / 100).toFixed(1) + '%';
  const AXc = {
    VERD: '#2F6F66', RUST: '#A3402B', SLATE: '#55627A', NONE: '#E3E6EB',
    // a rate against a centre (usually England): verdigris below, rust above, pale near the centre
    div(v, mid, span) { if (v == null) return AXc.NONE; const t = Math.max(-1, Math.min(1, (v - mid) / (span || 1))); return t < 0 ? LOW(Math.pow(-t, 0.8)) : HIGH(Math.pow(t, 0.8)); },
    legend(mid, span, centre, fmt) { const f = fmt || pc; return `${f(mid - span)} or less<i class="ramp" style="background:linear-gradient(90deg,#1E544D,#E7EFEC 49%,#F6E9E4 51%,#7A2617)"></i>${f(mid + span)} or more · centred on ${centre} (${f(mid)})`; },
    gap(d) { return d < 0 ? AXc.VERD : d > 0 ? AXc.RUST : AXc.SLATE; },
    // a solid pill for a difference in tenths of a point: "0.7 lower than England"
    pill(tenths, than) { const t = tenths === 0 ? 'the same as ' + than : (Math.abs(tenths) / 10).toFixed(1) + ' points ' + (tenths < 0 ? 'lower' : 'higher') + ' than ' + than;
      return `<span class="ax-pill" style="background:${AXc.gap(tenths)}">${t}</span>`; },
  };
  window.AXc = AXc;
})();
