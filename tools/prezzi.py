#!/usr/bin/env python3
"""Legge i prezzi veri dei supermercati online per tutti i prodotti equivalenti a ogni ingrediente
(tutte le marche e i formati) e crea data/prezzi/<catena>.json. L'app li scarica dal gist e ti fa scegliere
il prodotto che compri davvero (es. pasta Rummo invece di Barilla).

Uso:
    python tools/prezzi.py                       # Esselunga e Carrefour (circa un'ora: una richiesta ogni 1,5 s)
    python tools/prezzi.py esselunga             # una catena sola
    python tools/prezzi.py --publish             # poi pubblica i file nel gist da cui li scarica l'app
    python tools/prezzi.py --max 3 esselunga     # prova veloce: al massimo 3 prodotti per ingrediente

Fonti (pagine pubbliche, nessun login, niente percorsi vietati dal robots.txt):
- Esselunga spesa online: sitemap_product.xml + la scheda prodotto JSON che usa la pagina per i visitatori.
- Carrefour: sitemap_0-product.xml + la pagina prodotto, che contiene i dati schema.org (prezzo) e il prezzo al kg.
Le regole per trovare i prodotti sono in data/prezzi_regole.json; data/esselunga_map.json dice quale prodotto
Esselunga è la scelta predefinita (altrimenti il più economico, scartati i prezzi anomali).
"""
import datetime, html, json, os, re, statistics, subprocess, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDIR = os.path.join(ROOT, "data", "prezzi")
GIST = os.path.join(PDIR, "gist.txt")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
DELAY = 1.5


def get(url, headers=None, timeout=40):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "it-IT,it;q=0.9", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def per_base(value, unit):
    """(prezzo per g/ml/pz, unità base) da un prezzo al kg / litro / pezzo."""
    unit = unit.lower()
    if unit in ("kg",):
        return value / 1000, "g"
    if unit in ("l", "lt", "litro"):
        return value / 1000, "ml"
    if unit in ("pz", "pezzo"):
        return value, "pz"
    return None, None


def size_from_name(name):
    """Quantità totale dal nome: '700 g', '1 kg', '3 x 80 g', '1 l', '500 ml' -> (quantità, 'g'|'ml')."""
    n = name.lower().replace(",", ".")
    m = re.search(r"(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|g|gr|ml|cl|l)\b", n)
    mult = 1
    if m:
        mult, q, u = int(m.group(1)), float(m.group(2)), m.group(3)
    else:
        m = re.search(r"(\d+(?:\.\d+)?)\s*(kg|g|gr|ml|cl|l)\b", n)
        if not m:
            return None, None
        q, u = float(m.group(1)), m.group(2)
    f = {"kg": (1000, "g"), "g": (1, "g"), "gr": (1, "g"), "ml": (1, "ml"), "cl": (10, "ml"), "l": (1000, "ml")}[u]
    return mult * q * f[0], f[1]


# ---------------- Esselunga ----------------
class Esselunga:
    id, name = "esselunga", "Esselunga"
    sitemap = "https://spesaonline.esselunga.it/sitemap_product.xml"
    api = "https://spesaonline.esselunga.it/commerce/resources/displayable/detail/code/"

    def catalog(self):
        """[(codice, nome-con-trattini)]"""
        return [tuple(x.split("/", 1)) for x in re.findall(r"/prodotto/(\d+/[^<]+)</loc>", get(self.sitemap))]

    def product(self, code):
        d = json.loads(get(self.api + code, {"Accept": "application/json", "X-PAGE-PATH": "supermercato"}))["displayableProduct"]
        m = re.match(r"\s*([\d.]+,\d+)\s*€\s*/\s*(kg|l|pz)", d.get("label") or "")
        if not m:
            return None
        up, base = per_base(float(m.group(1).replace(".", "").replace(",", ".")), m.group(2))
        full = d.get("price") or 0
        return {"n": d["description"].strip(), "b": (d.get("brand") or "").strip(), "up": up, "base": base,
                "promo": bool(d.get("discountedPrice") and full and d["discountedPrice"] < full),
                "out": bool(d.get("outOfStock")), "ean": d.get("barcode")}


# ---------------- Carrefour ----------------
class Carrefour:
    id, name = "carrefour", "Carrefour"
    sitemap = "https://www.carrefour.it/sitemap_0-product.xml"

    def catalog(self):
        return [(f"{slug}/{ean}", slug) for slug, ean in re.findall(r"carrefour\.it/p/([^/<]+)/(\d+)\.html", get(self.sitemap))]

    def product(self, code):
        page = get(f"https://www.carrefour.it/p/{code}.html")
        prod = None
        for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S):
            try:
                j = json.loads(block)
            except ValueError:
                continue
            for x in (j if isinstance(j, list) else [j]):
                if isinstance(x, dict) and x.get("@type") == "Product":
                    prod = x
        if not prod or not prod.get("offers"):
            return None
        off = prod["offers"][0] if isinstance(prod["offers"], list) else prod["offers"]
        price = float(off.get("price") or 0)
        name = html.unescape(prod.get("name", "")).strip()
        m = re.search(r"Prezzo al (kg|litro|lt|l|pezzo|pz)\s*:?\s*(?:&euro;|€)\s*([\d.]+,\d+)", page, re.I)
        if m:
            up, base = per_base(float(m.group(2).replace(".", "").replace(",", ".")), m.group(1))
        else:
            q, base = size_from_name(name)
            up = price / q if q else None
        if not up or not price:
            return None
        brand = prod.get("brand") or {}
        return {"n": name, "b": (brand.get("name") if isinstance(brand, dict) else str(brand)) or "", "up": up, "base": base,
                "promo": False, "out": "InStock" not in str(off.get("availability", "")), "ean": prod.get("sku")}


CHAINS = {"esselunga": Esselunga(), "carrefour": Carrefour()}


def to_ingredient(opt, ing, k):
    """Prezzo per un'unità dell'ingrediente (g, ml o pz); None se le unità non sono confrontabili."""
    if opt["base"] == "pz" and ing["u"] == "pz":
        return opt["up"]
    if opt["base"] in ("g", "ml"):
        return opt["up"] * k
    return None


def brand_round_robin(cands):
    """Alterna le marche (prima parola del nome): un prodotto per marca, poi il secondo, ecc.
    Così nei primi N candidati ci sono tutte le marche (es. Rummo non resta fuori dietro a dieci Barilla)."""
    groups = {}
    for c in cands:
        groups.setdefault(c[1].split("-")[0], []).append(c)
    out, i = [], 0
    while len(out) < len(cands):
        for g in groups.values():
            if i < len(g):
                out.append(g[i])
        i += 1
    return out


def run(chain, max_per=30):
    load = lambda f: json.load(open(os.path.join(ROOT, "data", f), encoding="utf-8"))
    ings = {i["id"]: i for i in load("ingredienti.json")["ingredienti"]}
    R = load("prezzi_regole.json")
    defaults = load("esselunga_map.json")["regole"] if chain.id == "esselunga" else {}
    never = re.compile(R["escludi_sempre"])
    print(f"== {chain.name}: scarico la sitemap…")
    cat = chain.catalog()
    print(f"{len(cat)} prodotti nella sitemap")
    out, missing, n_req, t0 = {}, [], 0, time.time()
    for iid, rule in R["regole"].items():
        ing = ings.get(iid)
        if not ing:
            continue
        rx, no, k = re.compile(rule["tutti"]), re.compile(rule.get("no") or "$^"), rule.get("k", 1)
        cands = [(c, s) for c, s in cat if rx.search(s) and not no.search(s) and not never.search(s)]
        dflt = re.compile(defaults[iid]["re"]) if iid in defaults else None
        cands = brand_round_robin(cands)
        if dflt:   # i prodotti della scelta predefinita vanno letti per primi
            cands.sort(key=lambda cs: not dflt.search(f"{cs[0]}/{cs[1]}"))
        opts = []
        for code, slug in cands[:max_per]:
            try:
                d = chain.product(code)
            except Exception as e:
                d = None
                print(f"  ! {code}: {str(e)[:60]}")
            n_req += 1
            time.sleep(DELAY)
            if not d:
                continue
            per = to_ingredient(d, ing, k)
            if per is None or per <= 0:
                continue
            p = per * ing["conf"] if ing["conf"] else per * 1000
            opts.append({"c": code, "n": d["n"], "b": d["b"], "p": round(p, 2), "promo": d["promo"], "out": d["out"],
                         "def": bool(dflt and dflt.search(f"{code}/{slug}"))})
        if opts:   # scarta i prezzi anomali (formati strani, abbinamenti sbagliati): fuori da 1/3 – 3 volte la mediana
            med = statistics.median(o["p"] for o in opts)
            opts = [o for o in opts if med / 3 <= o["p"] <= med * 3]
        if not opts:
            missing.append(iid)
            print(f"  – {iid}: nessun prodotto")
            continue
        opts.sort(key=lambda o: o["p"])
        avail = [o for o in opts if not o["out"]] or opts
        pick = next((o for o in avail if o["def"]), None) or avail[0]
        for o in opts:
            o.pop("def")
        out[iid] = {"p": pick["p"], "per": "conf" if ing["conf"] else "kg", "prod": pick["n"], "code": pick["c"],
                    "promo": pick["promo"], "esaurito": pick["out"], "opts": opts}
        print(f"  {iid:18} {len(opts):2} prodotti  {pick['p']:6.2f} €  ← {pick['n'][:50]}")
    res = {"market": chain.id, "updated": datetime.datetime.now().isoformat(timespec="minutes"),
           "fonte": f"{chain.name} spesa online, prezzi pubblici", "prices": out, "missing": missing}
    os.makedirs(PDIR, exist_ok=True)
    path = os.path.join(PDIR, f"{chain.id}.json")
    json.dump(res, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"{chain.name}: {len(out)} ingredienti, {sum(len(v['opts']) for v in out.values())} prodotti, "
          f"{len(missing)} senza prezzo, {n_req} richieste in {(time.time() - t0) / 60:.0f} min → {os.path.relpath(path, ROOT)}")


def publish():
    """Aggiorna il gist segreto (stesso indirizzo di sempre) con un file per catena."""
    files = {f: {"content": open(os.path.join(PDIR, f), encoding="utf-8").read()}
             for f in sorted(os.listdir(PDIR)) if f.endswith(".json")}
    # anche la configurazione: lo script PHP sull'hosting la scarica da qui
    for f in ("ingredienti.json", "prezzi_regole.json", "esselunga_map.json"):
        files[f] = {"content": open(os.path.join(ROOT, "data", f), encoding="utf-8").read()}
    payload = os.path.join(PDIR, ".gist-payload.json")
    json.dump({"files": files}, open(payload, "w", encoding="utf-8"), ensure_ascii=False)
    gid = open(GIST).read().strip()
    subprocess.run(["gh", "api", "-X", "PATCH", f"gists/{gid}", "--input", payload], check=True, capture_output=True)
    os.remove(payload)
    for f in files:
        print(f"Pubblicato: https://gist.githubusercontent.com/charles1812/{gid}/raw/{f}")


def main():
    args = sys.argv[1:]
    max_per = int(args[args.index("--max") + 1]) if "--max" in args else 30
    names = [a for a in args if a in CHAINS] or list(CHAINS)
    for n in names:
        try:
            run(CHAINS[n], max_per)
        except Exception as e:   # una catena che non risponde non blocca le altre: resta il file della volta prima
            print(f"!! {n}: {e}")
    if "--publish" in args:
        publish()


if __name__ == "__main__":
    main()
