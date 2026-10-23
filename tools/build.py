#!/usr/bin/env python3
"""Crea dist/schiscetta.html: un unico file offline con dati, stile e logica inline.

Uso: python tools/build.py
"""
import datetime, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
read = lambda *p: open(os.path.join(ROOT, *p), encoding="utf-8").read()
load = lambda f: json.load(open(os.path.join(ROOT, "data", f), encoding="utf-8"))


def main():
    r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "validate.py")])
    if r.returncode:
        sys.exit("Dati non validi: correggi prima di costruire")
    ing, piatti, sm = load("ingredienti.json"), load("piatti.json"), load("supermercati.json")
    import passi; passi.apply(piatti["piatti"])      # passaggi dettagliati (data/ricette/*.json)
    foto = load("immagini_ricette.json") if os.path.exists(os.path.join(ROOT, "data", "immagini_ricette.json")) else {}
    for p in piatti["piatti"]:
        if p["id"] in foto: p["img"] = foto[p["id"]]
    data = {
        "reparti": ing["reparti"], "ingredienti": ing["ingredienti"], "piatti": piatti["piatti"],
        "supermercati": sm["supermercati"], "baseIdx": sm["base_idx"], "fonte": sm["fonte"],
        "built": datetime.date.today().strftime("%d/%m/%Y"),
        "feeds": {}, "feedUrls": {},
        # versione delle ricette incluse: l'app usa il database scaricato dal server solo se è più nuovo
        "versione": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
    }
    # prezzi reali scaricati (tools/esselunga_prezzi.py): copia di riserva dentro l'app + indirizzo da cui aggiornarli
    pdir = os.path.join(ROOT, "data", "prezzi")
    for f in sorted(os.listdir(pdir)) if os.path.isdir(pdir) else []:
        if f.endswith(".json"):
            feed = json.load(open(os.path.join(pdir, f), encoding="utf-8"))
            data["feeds"][feed["market"]] = feed
    # regole per riconoscere i prodotti di ogni ingrediente: servono all'app per leggere Coop e Conad dal telefono
    reg = load("prezzi_regole.json")
    data["regole"] = {"never": reg["escludi_sempre"],
                      "r": {k: {"t": v["tutti"], **({"no": v["no"]} if v.get("no") else {}), **({"k": v["k"]} if v.get("k") else {})}
                            for k, v in reg["regole"].items()}}
    if os.path.exists(os.path.join(pdir, "gist.txt")):
        gid = open(os.path.join(pdir, "gist.txt")).read().strip()
        for m in ("esselunga", "carrefour", "pam"):
            # prima il sito su Hostinger (aggiornato dal cron), poi il gist come riserva
            data["feedUrls"][m] = [f"https://tuo-server.example/schiscetta/prezzi/{m}.json",
                                   f"https://gist.githubusercontent.com/charles1812/{gid}/raw/{m}.json"]
    if os.path.exists(os.path.join(pdir, "gist.txt")):
        data["ricetteUrls"] = ["https://tuo-server.example/schiscetta/prezzi/ricette.json",
                               f"https://gist.githubusercontent.com/charles1812/{gid}/raw/ricette.json"]
    html = read("web", "index.html")
    html = html.replace("/*DATA*/", json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    html = html.replace("/*CSS*/", read("web", "style.css"))
    html = html.replace("/*JS*/", read("web", "app.js"))
    out = os.path.join(ROOT, "dist", "schiscetta.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html)
    print(f"Creato dist/schiscetta.html ({len(html.encode('utf-8')) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
