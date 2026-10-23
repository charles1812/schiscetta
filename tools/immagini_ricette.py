#!/usr/bin/env python3
"""Foto dei piatti da Wikimedia Commons (licenze libere, con autore e licenza da citare nell'app).

1) python tools/immagini_ricette.py cerca     -> data/immagini_candidati.json: per ogni piatto fino a 4 foto candidate
2) python tools/immagini_ricette.py fogli     -> dist/img_fogli/*.html: fogli di prova con le candidate numerate
3) si scelgono a mano in data/immagini_scelte.json {"id_piatto": n} (n = numero della candidata, -1 = nessuna,
   "altro_piatto:n" = la candidata n di un altro piatto)
4) python tools/immagini_ricette.py salva     -> data/immagini_ricette.json {id: {u, a, l, f}}, che pubblica_ricette.py
   mette in ricette.json (campo img del piatto)

Niente foto prese dai siti di ricette: solo file di Commons con licenza libera.
"""
import html, json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "Schiscetta/1.0 (app personale di ricette; https://github.com/charles1812)"
CAND = os.path.join(ROOT, "data", "immagini_candidati.json")
LIBERE = re.compile(r"^(cc0|cc[ -]by(-sa)?[ -]?\d|public domain|pd)", re.I)


def api(host, **q):
    q.update(format="json", formatversion="2")
    req = urllib.request.Request(f"https://{host}/w/api.php?" + urllib.parse.urlencode(q), headers={"User-Agent": UA})
    for i in range(4):
        try:
            return json.load(urllib.request.urlopen(req, timeout=30))
        except Exception:
            time.sleep(2 + i * 3)
    return {}


def strip(s):
    return re.sub(r"<[^>]+>", "", html.unescape(s or "")).strip()


def info(pages):
    out = []
    for p in pages:
        ii = (p.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata") or {}
        lic = strip(md.get("LicenseShortName", {}).get("value"))
        if not ii.get("thumburl") or not LIBERE.match(lic) or ii.get("mime") not in ("image/jpeg", "image/png", "image/webp"):
            continue
        out.append({"f": p["title"], "u": ii["thumburl"], "a": strip(md.get("Artist", {}).get("value"))[:80] or "autore su Commons",
                    "l": lic, "w": ii.get("width"), "h": ii.get("height"), "i": p.get("index", 99)})
    return sorted(out, key=lambda x: x["i"])


def query(name):
    return re.sub(r"\(.*?\)", "", name).replace("Rana", "").strip()


def cerca():
    piatti = json.load(open(os.path.join(ROOT, "data", "piatti.json"), encoding="utf-8"))["piatti"]
    res = json.load(open(CAND, encoding="utf-8")) if os.path.exists(CAND) else {}
    props = dict(prop="imageinfo", iiprop="url|extmetadata|mime|size", iiurlwidth="480")
    for k, p in enumerate(piatti):
        if p["id"] in res:
            continue
        q = query(p["n"])
        c = []
        # 1) la voce di Wikipedia del piatto (per i classici: carbonara, amatriciana…)
        w = api("it.wikipedia.org", action="query", list="search", srsearch=q, srlimit="1")
        hits = (w.get("query") or {}).get("search") or []
        if hits:
            t = hits[0]["title"]
            pi = api("it.wikipedia.org", action="query", titles=t, prop="pageimages", piprop="name")
            pg = ((pi.get("query") or {}).get("pages") or [{}])[0]
            if pg.get("pageimage"):
                f = api("commons.wikimedia.org", action="query", titles="File:" + pg["pageimage"], **props)
                for x in info((f.get("query") or {}).get("pages") or []):
                    x["wiki"] = t; c.append(x)
        # 2) ricerca tra i file di Commons
        s = api("commons.wikimedia.org", action="query", generator="search", gsrsearch=f"filetype:bitmap {q}", gsrnamespace="6", gsrlimit="6", **props)
        for x in info((s.get("query") or {}).get("pages") or []):
            if all(x["f"] != y["f"] for y in c):
                c.append(x)
        # 3) poche foto: riprovo con le prime parole (il piatto principale)
        corta = " ".join(re.split(r"\s+(?:con|e|al|alla|ai|in)\s+", q)[0].split()[:3])
        if len(c) < 3 and corta != q:
            s = api("commons.wikimedia.org", action="query", generator="search", gsrsearch=f"filetype:bitmap {corta}", gsrnamespace="6", gsrlimit="5", **props)
            for x in info((s.get("query") or {}).get("pages") or []):
                if all(x["f"] != y["f"] for y in c):
                    c.append(x)
        res[p["id"]] = {"n": p["n"], "c": c[:4]}
        print(f"{k + 1}/{len(piatti)} {p['n']}: {len(c[:4])}", flush=True)
        json.dump(res, open(CAND, "w", encoding="utf-8"), ensure_ascii=False)
        time.sleep(0.5)


def ricerca2():
    """secondo giro per i piatti senza una foto buona: parole scelte a mano in data/immagini_query.json {id: "parole"}"""
    res = json.load(open(CAND, encoding="utf-8"))
    qs = json.load(open(os.path.join(ROOT, "data", "immagini_query.json"), encoding="utf-8"))
    props = dict(prop="imageinfo", iiprop="url|extmetadata|mime|size", iiurlwidth="480")
    for pid, q in qs.items():
        r = res.get(pid)
        if not r or r.get("q2") == q:
            continue
        s = api("commons.wikimedia.org", action="query", generator="search", gsrsearch=f"filetype:bitmap {q}", gsrnamespace="6", gsrlimit="6", **props)
        new = [x for x in info((s.get("query") or {}).get("pages") or []) if all(x["f"] != y["f"] for y in r["c"])]
        r["c"] = r["c"][:4] + new[:4]
        r["q2"] = q
        print(pid, q, len(new[:4]), flush=True)
        json.dump(res, open(CAND, "w", encoding="utf-8"), ensure_ascii=False)
        time.sleep(0.5)


def fogli(solo=None):
    res = json.load(open(CAND, encoding="utf-8"))
    d = os.path.join(ROOT, "dist", "img_fogli")
    os.makedirs(d, exist_ok=True)
    ids = [i for i in res if not solo or i in solo]
    pref = "giro2_" if solo else "foglio"
    for n in range(0, len(ids), 12):
        rows = []
        for pid in ids[n:n + 12]:
            r = res[pid]
            cells = "".join(f'<td><img src="{html.escape(x["u"])}"><b>{i}</b></td>' for i, x in enumerate(r["c"]))
            rows.append(f'<tr><th>{html.escape(pid)}<br><small>{html.escape(r["n"])}</small></th>{cells}</tr>')
        open(os.path.join(d, f"{pref}{n // 12:02d}.html"), "w", encoding="utf-8").write(
            "<meta charset=utf-8><style>body{font:13px sans-serif;margin:4px}th{width:170px;text-align:left}td{position:relative}"
            "img{width:120px;height:90px;object-fit:cover}b{position:absolute;top:2px;left:4px;background:#ff0;padding:0 4px;font-size:16px}</style>"
            f"<table>{''.join(rows)}</table>")
    print(f"{(len(ids) + 11) // 12} fogli in {d}")


def salva():
    res = json.load(open(CAND, encoding="utf-8"))
    scelte = json.load(open(os.path.join(ROOT, "data", "immagini_scelte.json"), encoding="utf-8"))
    out = {}
    for pid, n in scelte.items():
        src = pid
        if isinstance(n, str):          # "altro_piatto:n": la stessa foto di un altro piatto
            src, n = n.split(":"); n = int(n)
        if n is None or n < 0 or src not in res or n >= len(res[src]["c"]):
            continue
        x = res[src]["c"][n]
        out[pid] = {"u": x["u"], "a": x["a"], "l": x["l"], "f": x["f"]}
    json.dump(out, open(os.path.join(ROOT, "data", "immagini_ricette.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"{len(out)} piatti con la foto")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "cerca"
    if cmd == "fogli2":
        fogli(set(json.load(open(os.path.join(ROOT, "data", "immagini_query.json"), encoding="utf-8"))))
    else:
        {"cerca": cerca, "fogli": fogli, "salva": salva, "ricerca2": ricerca2}[cmd]()
