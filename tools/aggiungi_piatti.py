#!/usr/bin/env python3
"""Aggiunge a data/piatti.json i piatti di un file JSON (lista di piatti), nello stesso formato del file.

Uso: python tools/aggiungi_piatti.py nuovi.json
Rifiuta id già presenti; dopo l'aggiunta lancia tools/validate.py e mostra kcal e proteine a persona di ogni piatto nuovo.
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = os.path.join(ROOT, "data", "piatti.json")
HEAD = ("id", "n", "e", "cat", "att", "cott", "tot", "sc", "veg")
j = lambda x: json.dumps(x, ensure_ascii=False)


def fmt(d):
    head = ", ".join(f'"{k}": {j(d[k])}' for k in HEAD)
    steps = (",\n" + " " * 15).join(j(s) for s in d["steps"])
    out = f'    {{{head},\n     "ing": {j(d["ing"])},\n     "steps": [{steps}]'
    for k in d:
        if k not in HEAD and k not in ("ing", "steps"): out += f',\n     "{k}": {j(d[k])}'
    return out + "}"


def main():
    new = json.load(open(sys.argv[1], encoding="utf-8"))
    have = {p["id"] for p in json.load(open(F, encoding="utf-8"))["piatti"]}
    dup = [d["id"] for d in new if d["id"] in have]
    if dup: sys.exit(f"id già presenti: {dup}")
    text = open(F, encoding="utf-8").read().rstrip()
    assert text.endswith("]\n}"), "fine del file inattesa"
    cut = text.rstrip("}").rstrip().rstrip("]").rstrip()
    text = cut + ",\n\n" + ",\n\n".join(fmt(d) for d in new) + "\n  ]\n}\n"
    open(F, "w", encoding="utf-8").write(text)
    json.load(open(F, encoding="utf-8"))   # deve restare JSON valido
    ing = {i["id"]: i for i in json.load(open(os.path.join(ROOT, "data", "ingredienti.json"), encoding="utf-8"))["ingredienti"]}
    for d in new:
        k = p = 0
        for iid, q in d["ing"]:
            i = ing[iid]; f = q if i["u"] == "pz" else q / 100
            k += f * i["kcal"]; p += f * i["prot"]
        print(f"{k:5.0f} kcal {p:5.1f} g prot  {d['n']}")
    print(f"aggiunti {len(new)} piatti")
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", "validate.py")])


if __name__ == "__main__":
    main()
