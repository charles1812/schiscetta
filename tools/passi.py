"""Passaggi dettagliati delle ricette (stile «spiegato passo passo») in data/ricette/*.json: {id: {"steps": [...], "note": "..."}}.

Nei passaggi le dosi sono segnaposto che l'app sostituisce con le quantità vere per le porzioni da cucinare:
  {riso_basmati}   tutta la dose dell'ingrediente      {olio/3}   un terzo (anche {uova*2/3})
  {cotto|prosciutto cotto in una fetta spessa}         con un nome diverso da quello dell'ingrediente
I minuti scritti come «10 min» danno il timer in «Stasera». Li usano build.py, pubblica_ricette.py e validate.py.
"""
import glob, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load():
    out = {}
    for f in sorted(glob.glob(os.path.join(ROOT, "data", "ricette", "*.json"))):
        out.update(json.load(open(f, encoding="utf-8")))
    return out


def apply(piatti):
    new = load()
    for p in piatti:
        r = new.get(p["id"])
        if r:
            p["steps"] = r["steps"]
            if r.get("note"):
                p["note"] = r["note"]
                if p.get("tip") and p["tip"][:25] in r["note"]: del p["tip"]     # il consiglio è già nelle note
    return new
