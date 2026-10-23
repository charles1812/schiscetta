#!/usr/bin/env python3
"""Pubblica il database delle ricette: l'app lo scarica a ogni apertura e prende le novità.

Crea ricette.json (piatti, ingredienti, reparti e regole per riconoscere i prodotti) e lo mette nel gist
dei prezzi insieme a ingredienti.json e prezzi_regole.json. Il server Hostinger (aggiorna.php) lo copia
ogni ora in prezzi/ricette.json, l'indirizzo che l'app legge per primo; il gist resta la riserva.
Non tocca i file dei prezzi del gist.

Uso: python tools/pubblica_ricette.py          valida, crea dist/ricette.json e pubblica
     python tools/pubblica_ricette.py --solo-file   senza pubblicare
"""
import datetime, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load = lambda f: json.load(open(os.path.join(ROOT, "data", f), encoding="utf-8"))


def build():
    ing, piatti, reg = load("ingredienti.json"), load("piatti.json"), load("prezzi_regole.json")
    import passi; passi.apply(piatti["piatti"])      # passaggi dettagliati (data/ricette/*.json)
    foto = load("immagini_ricette.json") if os.path.exists(os.path.join(ROOT, "data", "immagini_ricette.json")) else {}
    for p in piatti["piatti"]:
        if p["id"] in foto: p["img"] = foto[p["id"]]
    return {
        "versione": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "reparti": ing["reparti"], "ingredienti": ing["ingredienti"], "piatti": piatti["piatti"],
        "regole": {"never": reg["escludi_sempre"],
                   "r": {k: {"t": v["tutti"], **({"no": v["no"]} if v.get("no") else {}), **({"k": v["k"]} if v.get("k") else {})}
                         for k, v in reg["regole"].items()}},
    }


def main():
    if subprocess.run([sys.executable, os.path.join(ROOT, "tools", "validate.py")], capture_output=True).returncode:
        sys.exit("Dati non validi: lancia tools/validate.py e correggi prima di pubblicare")
    db = build()
    out = os.path.join(ROOT, "dist", "ricette.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    text = json.dumps(db, ensure_ascii=False, separators=(",", ":"))
    open(out, "w", encoding="utf-8").write(text)
    print(f"dist/ricette.json: {len(db['piatti'])} piatti, {len(db['ingredienti'])} ingredienti, versione {db['versione']} ({len(text.encode()) // 1024} KB)")
    if "--solo-file" in sys.argv:
        return
    files = {"ricette.json": {"content": text}}
    for f in ("ingredienti.json", "prezzi_regole.json", "esselunga_map.json"):
        files[f] = {"content": open(os.path.join(ROOT, "data", f), encoding="utf-8").read()}
    payload = os.path.join(ROOT, "dist", ".gist-payload.json")
    json.dump({"files": files}, open(payload, "w", encoding="utf-8"), ensure_ascii=False)
    gid = open(os.path.join(ROOT, "data", "prezzi", "gist.txt")).read().strip()
    try:
        subprocess.run(["gh", "api", "-X", "PATCH", f"gists/{gid}", "--input", payload], check=True, capture_output=True)
    finally:
        os.remove(payload)
    print(f"Pubblicato nel gist: https://gist.githubusercontent.com/charles1812/{gid}/raw/ricette.json")
    print("Il server lo copia entro un'ora; l'app lo scarica alla prossima apertura.")


if __name__ == "__main__":
    main()
