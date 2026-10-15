#!/usr/bin/env python3
# Renders 3 combined EUR/CLP + USD/CLP charts (index x-axis, closed hours skipped).
# Output: g24.png, g7d.png, g1m.png in cwd. Also prints current prices as JSON.
import json, subprocess, datetime as D
from zoneinfo import ZoneInfo
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

Z = ZoneInfo("Europe/Madrid")
EUR_C, USD_C = "#1f5fbf", "#d62728"

def get(s, r, i):
    u = f"https://query1.finance.yahoo.com/v8/finance/chart/{s}=X?range={r}&interval={i}"
    j = json.loads(subprocess.check_output(["curl", "-s", "-A", "Mozilla/5.0", u]))["chart"]["result"][0]
    pts = [(t, c) for t, c in zip(j["timestamp"], j["indicators"]["quote"][0]["close"]) if c is not None]
    return j["meta"]["regularMarketPrice"], pts

def fmt(x, n=1):
    s = f"{x:,.{n}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")

def align(e, u, key):
    # merge two series on a common key; keep keys where at least one has data, carry the other forward
    de, du = {key(t): c for t, c in e}, {key(t): c for t, c in u}
    keys = sorted(set(de) | set(du))
    out, le, lu = [], None, None
    for k in keys:
        le = de.get(k, le); lu = du.get(k, lu)
        out.append((k, le, lu))
    return [o for o in out if o[1] is not None and o[2] is not None]

def plot(rows, fname, title, hourly):
    xs = list(range(len(rows)))
    ev = [r[1] for r in rows]; uv = [r[2] for r in rows]
    fig, ax = plt.subplots(figsize=(8, 4.2), dpi=120)
    ax2 = ax.twinx()
    ax.plot(xs, ev, color=EUR_C, lw=2.4, label=f"EUR/CLP  {fmt(ev[-1])}")
    ax2.plot(xs, uv, color=USD_C, lw=1.8, label=f"USD/CLP  {fmt(uv[-1])}")
    for a, v, c in ((ax, ev, EUR_C), (ax2, uv, USD_C)):
        imx, imn = v.index(max(v)), v.index(min(v))
        a.scatter([imx], [v[imx]], s=18, color=c, zorder=5); a.scatter([imn], [v[imn]], s=18, color=c, zorder=5, marker="v")
        dx, ha = (-5, "right") if c == EUR_C else (5, "left")
        a.annotate(fmt(v[imx]), (imx, v[imx]), textcoords="offset points", xytext=(dx, 4), ha=ha, fontsize=7, color=c)
        a.annotate(fmt(v[imn]), (imn, v[imn]), textcoords="offset points", xytext=(dx, -10), ha=ha, fontsize=7, color=c)
        pad = (max(v) - min(v)) * 0.15 or 1
        a.set_ylim(min(v) - pad, max(v) + pad)
    ax.tick_params(axis="y", colors=EUR_C, labelsize=8); ax2.tick_params(axis="y", colors=USD_C, labelsize=8)
    ax.yaxis.set_major_formatter(lambda x, _: fmt(x, 0)); ax2.yaxis.set_major_formatter(lambda x, _: fmt(x, 0))
    # x labels
    if hourly:
        days = [r[0].date() for r in rows]
        ticks, labels = [], []
        step = max(1, len(rows) // 12)
        for i, r in enumerate(rows):
            if i > 0 and days[i] != days[i - 1]:
                ax.axvline(i - 0.5, color="#999", ls=":", lw=1)
            if i % step == 0:
                ticks.append(i); labels.append(r[0].strftime("%H:%M") if len(set(days)) <= 2 else r[0].strftime("%d/%m\n%H:%M"))
        ax.set_xticks(ticks); ax.set_xticklabels(labels, fontsize=7)
        if len(set(days)) <= 2:
            starts = [0] + [i for i in range(1, len(rows)) if days[i] != days[i - 1]]
            for k, s in enumerate(starts):
                e = starts[k + 1] if k + 1 < len(starts) else len(rows)
                ax.text((s + e - 1) / 2, -0.16, days[s].strftime("%d/%m"), transform=ax.get_xaxis_transform(), ha="center", fontsize=8, color="#444")
    else:
        step = max(1, len(rows) // 8)
        ticks = list(range(0, len(rows), step))
        ax.set_xticks(ticks); ax.set_xticklabels([rows[i][0].strftime("%d/%m") for i in ticks], fontsize=7)
    ax.set_xlim(-0.5, len(rows) - 0.5)
    ax.grid(axis="y", color="#eee"); [s.set_visible(False) for s in (ax.spines["top"], ax2.spines["top"])]
    h1, l1 = ax.get_legend_handles_labels(); h2, l2 = ax2.get_legend_handles_labels()
    ax.legend(h1 + h2, l1 + l2, loc="upper left", fontsize=8, frameon=False, ncol=2)
    ax.set_title(title, fontsize=9, color="#555", loc="right")
    fig.tight_layout(); fig.savefig(fname); plt.close(fig)
    from PIL import Image
    Image.open(fname).convert("RGB").quantize(colors=48).save(fname, optimize=True)

pe, he = get("EURCLP", "10d", "1h"); pu, hu = get("USDCLP", "10d", "1h")
hk = lambda t: D.datetime.fromtimestamp(t - t % 3600, Z)
rows = align(he, hu, hk)
newest = rows[-1][0]
r24 = [r for r in rows if r[0] > newest - D.timedelta(hours=24)]
dates = sorted({r[0].date() for r in rows})[-7:]
r7 = [r for r in rows if r[0].date() in dates]
# 1 month: last hourly reading of each day (Yahoo daily closes for CLP pairs are unreliable)
_, de = get("EURCLP", "1mo", "1h"); _, du = get("USDCLP", "1mo", "1h")
dk = lambda t: D.datetime.fromtimestamp(t, Z).replace(hour=0, minute=0, second=0, microsecond=0)
rd = align(de, du, dk)  # dict keeps the last reading per day
rm = [r for r in rd if r[0] > rd[-1][0] - D.timedelta(days=30)]
now = D.datetime.now(Z).strftime("act. %d/%m %H:%M (Madrid)")
plot(r24, "g24.png", now, True)
plot(r7, "g7d.png", now, True)
plot(rm, "g1m.png", now, False)
print(json.dumps({"EURCLP": pe, "USDCLP": pu, "EUR_txt": "$" + fmt(pe), "USD_txt": "$" + fmt(pu), "updated": now}))
