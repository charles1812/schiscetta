#!/usr/bin/env python3
"""Registra le risposte vere della ricerca Iperal (come le chiede l'app) per il test della lettura dal telefono.

Senza account Iperal non mostra i prezzi: nel file di prova il prezzo (campo «price», come lo dà il sito a chi è
entrato) è stimato dal prezzo tipico dell'ingrediente, ±20%. Servono solo a provare il percorso dell'app.

Uso: python tools/fixture_iperal.py   -> tools/fixtures/iperal.json  {query: testo della risposta}
"""
import json, os, random, re, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ING = json.load(open(os.path.join(ROOT, "data", "ingredienti.json"), encoding="utf-8"))["ingredienti"]
U = {"g": 1, "gr": 1, "kg": 1000, "ml": 1, "cl": 10, "l": 1000, "lt": 1000}
KEEP = ("productId", "name", "shortDescr", "description", "available", "vendor", "productInfos", "mediaURL", "barcode")


def ask(q):
    url = "https://www.iperalspesaonline.it/ebsn/api/products?q=" + urllib.parse.quote(q) + "&page_size=40"
    t = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"}), timeout=30).read().decode()
    return json.loads(t[t.index("{"):])


def size(p):
    m = re.match(r"^(g|gr|kg|ml|cl|lt|l|pz)\s*(\d+(?:[.,]\d+)?)(?:\s*x\s*(\d+))?", (p.get("description") or "").strip().lower())
    if not m: return None
    v = float(m.group(2).replace(",", ".")) * (int(m.group(3)) if m.group(3) else 1)
    return ("pz", v) if m.group(1) == "pz" else ("g", v * U[m.group(1)])


rnd = random.Random(7)
out = {}
for i in ING:
    name = re.sub(r"\(.*?\)", "", i["n"]).strip()
    per_g = i["p"] / (i["conf"] if i.get("conf") and i["u"] != "pz" else 1000)
    for q in dict.fromkeys([name, name.split()[0]]):
        d = ask(q)
        prods = []
        for p in d.get("data", {}).get("products", []):
            x = {k: p.get(k) for k in KEEP}
            x["vendor"] = {"name": (p.get("vendor") or {}).get("name", "")}
            inf = p.get("productInfos") or {}
            x["productInfos"] = {k: inf.get(k) for k in ("TIPOLOGIA", "WEIGHT_SELLING", "WEIGHT_UNIT_SELLING", "WEIGHT_UNIT_BASE")}
            s = size(p)
            f = rnd.uniform(0.8, 1.2)
            if inf.get("TIPOLOGIA") == "Sfuso": x["price"] = round(per_g * 1000 * f, 2)        # al kg
            elif s and s[0] == "g": x["price"] = round(per_g * s[1] * f, 2)
            elif s and i["u"] == "pz": x["price"] = round(i["p"] / (i.get("conf") or 1) * s[1] * f, 2)
            else: x["price"] = round(i["p"] * f, 2)
            prods.append(x)
        out[q] = json.dumps({"data": {"products": prods}}, ensure_ascii=False)
        time.sleep(0.5)
os.makedirs(os.path.join(ROOT, "tools", "fixtures"), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, "tools", "fixtures", "iperal.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(len(out), "ricerche registrate")
