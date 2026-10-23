#!/usr/bin/env python3
"""Legge i prezzi attuali di Esselunga spesa online per gli ingredienti dell'app e crea data/prezzi/esselunga.json.

Uso:  python tools/esselunga_prezzi.py            (circa 5 minuti: una richiesta ogni 1,5 secondi)
      python tools/esselunga_prezzi.py --publish  (poi aggiorna il gist da cui l'app scarica i prezzi)

Come funziona:
1. scarica la sitemap pubblica dei prodotti (sitemap_product.xml, indicata nel robots.txt);
2. per ogni ingrediente trova i prodotti con le regole di data/esselunga_map.json;
3. per ogni prodotto chiede la scheda all'API che usa la pagina pubblica (stessi dati che vede un visitatore
   non registrato) e ne legge il prezzo al kg / litro / pezzo, già scontato se c'è un'offerta;
4. tiene il più economico e lo converte nella confezione dell'ingrediente.

Uso personale e poche centinaia di richieste lente alla settimana: niente login, niente pagine vietate
dal robots.txt (/ricerca, /visit). I termini d'uso del sito restano da rispettare.
"""
import datetime, json, os, re, subprocess, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "prezzi", "esselunga.json")
GIST = os.path.join(ROOT, "data", "prezzi", "gist.txt")   # id del gist creato con --publish
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
API = "https://spesaonline.esselunga.it/commerce/resources/displayable/detail/code/"
SITEMAP = "https://spesaonline.esselunga.it/sitemap_product.xml"
DELAY, MAX_CAND = 1.5, 4


def get(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def product(code):
    j = json.loads(get(API + code, {"Accept": "application/json", "X-PAGE-PATH": "supermercato"}))
    return j["displayableProduct"]


def unit_price(d):
    """Prezzo attuale per unità base (g, ml o pz) dall'etichetta '1,71 € / kg'."""
    m = re.match(r"\s*([\d.]+,\d+)\s*€\s*/\s*(kg|l|pz)", d.get("label") or "")
    if not m:
        return None, None
    v = float(m.group(1).replace(".", "").replace(",", "."))
    return {"kg": (v / 1000, "g"), "l": (v / 1000, "ml"), "pz": (v, "pz")}[m.group(2)]


def main():
    load = lambda f: json.load(open(os.path.join(ROOT, "data", f), encoding="utf-8"))
    ings = {i["id"]: i for i in load("ingredienti.json")["ingredienti"]}
    rules = load("esselunga_map.json")["regole"]
    print("Scarico la sitemap dei prodotti…")
    slugs = re.findall(r"/prodotto/(\d+/[^<]+)</loc>", get(SITEMAP))
    print(f"{len(slugs)} prodotti nella sitemap")

    prices, missing, cache, n_req = {}, [], {}, 0
    for iid, rule in rules.items():
        ing = ings.get(iid)
        if not ing:
            continue
        rx, k = re.compile(rule["re"]), rule.get("k", 1)
        cands = [s.split("/")[0] for s in slugs if rx.search(s)][:MAX_CAND]
        best = None
        for code in cands:
            if code not in cache:
                try:
                    cache[code] = product(code)
                except Exception as e:   # prodotto sparito o errore di rete: si passa al prossimo
                    print(f"  ! {code}: {e}")
                    cache[code] = None
                n_req += 1
                time.sleep(DELAY)
            d = cache[code]
            if not d:
                continue
            up, base = unit_price(d)
            if up is None:
                continue
            # prezzo per un'unità dell'ingrediente: k = unità del prodotto per unità nostra
            if base == "pz" and ing["u"] == "pz":
                per = up
            elif base in ("g", "ml"):
                per = up * k           # g/ml -> g/ml (k di solito 1) oppure g -> pezzo (k = grammi a pezzo)
            else:
                continue               # prezzo a pezzo per un ingrediente a peso: non confrontabile
            score = (bool(d.get("outOfStock")), per)
            if best is None or score < best[0]:
                best = (score, per, d)
        if not best:
            missing.append(iid)
            print(f"  – {iid}: nessun prodotto")
            continue
        _, per, d = best
        p = per * ing["conf"] if ing["conf"] else per * 1000
        full = d.get("price") or 0
        prices[iid] = {"p": round(p, 2), "per": "conf" if ing["conf"] else "kg", "prod": d["description"],
                       "code": d["code"], "promo": bool(d.get("discountedPrice") and full and d["discountedPrice"] < full),
                       "esaurito": bool(d.get("outOfStock"))}
        print(f"  {iid:18} {prices[iid]['p']:6.2f} €/{prices[iid]['per']:4} ← {d['description'][:55]}")

    out = {"market": "esselunga", "updated": datetime.datetime.now().isoformat(timespec="minutes"),
           "fonte": "Esselunga spesa online, prezzi pubblici per visitatori non registrati", "prices": prices, "missing": missing}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n{len(prices)} prezzi letti, {len(missing)} senza prodotto, {n_req} richieste → {os.path.relpath(OUT, ROOT)}")
    if "--publish" in sys.argv:
        publish()


def publish():
    """Pubblica il JSON in un gist segreto di GitHub (gh CLI): l'app lo scarica dall'URL 'raw'."""
    if os.path.exists(GIST):
        gid = open(GIST).read().strip()
        subprocess.run(["gh", "gist", "edit", gid, "-f", "esselunga.json", OUT], check=True)
    else:
        r = subprocess.run(["gh", "gist", "create", OUT, "-d", "Schiscetta: prezzi Esselunga"], check=True, capture_output=True, text=True)
        gid = r.stdout.strip().rstrip("/").split("/")[-1]
        open(GIST, "w").write(gid)
    user = subprocess.run(["gh", "api", "user", "-q", ".login"], capture_output=True, text=True).stdout.strip()
    print(f"Pubblicato: https://gist.githubusercontent.com/{user}/{gid}/raw/esselunga.json")


if __name__ == "__main__":
    main()
