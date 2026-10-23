#!/usr/bin/env python3
"""Controlla la coerenza dei dati: ingredienti, piatti, supermercati.

Uso: python tools/validate.py   (esce con codice 1 se trova errori)
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load = lambda f: json.load(open(os.path.join(ROOT, "data", f), encoding="utf-8"))

errors, warnings = [], []
ing_db = load("ingredienti.json")
reparti = {r["id"] for r in ing_db["reparti"]}
ings = {}
for i in ing_db["ingredienti"]:
    if i["id"] in ings: errors.append(f"ingrediente duplicato: {i['id']}")
    ings[i["id"]] = i
    for k in ("n", "e", "r", "u", "conf", "p", "dur"):
        if k not in i: errors.append(f"{i['id']}: manca '{k}'")
    if i.get("r") not in reparti: errors.append(f"{i['id']}: reparto sconosciuto {i.get('r')}")
    if i.get("u") not in ("g", "ml", "pz"): errors.append(f"{i['id']}: unità non valida {i.get('u')}")
    if i.get("conf") == 0 and i.get("u") != "g": errors.append(f"{i['id']}: lo sfuso deve essere in grammi")
    if i.get("u") == "pz" and "pzn" not in i: errors.append(f"{i['id']}: unità pz senza nomi pzn")
    if not (0 < i.get("p", 0) < 60): errors.append(f"{i['id']}: prezzo sospetto {i.get('p')}")
    if not isinstance(i.get("kcal"), (int, float)) or not isinstance(i.get("prot"), (int, float)): errors.append(f"{i['id']}: mancano kcal e proteine (tools/nutrizione.py)")
    elif i["u"] != "pz" and (i["kcal"] > 900 or i["prot"] > 40 or i["prot"] * 4 > i["kcal"] + 1): errors.append(f"{i['id']}: valori nutrizionali impossibili per 100 g")

used = set()
piatti = load("piatti.json")["piatti"]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import passi
for pid in set(passi.load()) - {d["id"] for d in piatti}: errors.append(f"data/ricette: passaggi per un piatto che non esiste: {pid}")
passi.apply(piatti)
ids = set()
for d in piatti:
    pid = d["id"]
    if pid in ids: errors.append(f"piatto duplicato: {pid}")
    ids.add(pid)
    for k in ("n", "e", "cat", "att", "cott", "tot", "ing", "steps", "veg"):
        if k not in d: errors.append(f"{pid}: manca '{k}'")
    if d.get("cat") not in ("primo", "secondo", "unico", "zuppa", "freddo"): errors.append(f"{pid}: categoria {d.get('cat')}")
    if d.get("sc") not in ("calda", "fredda", "entrambe", None): errors.append(f"{pid}: sc non valido {d.get('sc')}")
    att, cott, tot = d["att"], d["cott"], d["tot"]
    if tot < max(att, cott): errors.append(f"{pid}: totale {tot} minore di lavoro {att} o cottura {cott}")
    if tot > att + cott + 20: warnings.append(f"{pid}: totale {tot} molto più lungo di lavoro+cottura")
    seen = set()
    for iid, q in d["ing"]:
        if iid not in ings: errors.append(f"{pid}: ingrediente sconosciuto {iid}")
        if iid in seen: errors.append(f"{pid}: ingrediente ripetuto {iid}")
        seen.add(iid); used.add(iid)
        if q < 0: errors.append(f"{pid}: quantità negativa per {iid}")
        if q == 0 and iid in ings and not ings[iid].get("disp"):
            errors.append(f"{pid}: {iid} q.b. ma non è un ingrediente da dispensa")
    if not any(q > 0 for _, q in d["ing"]): errors.append(f"{pid}: nessun ingrediente con quantità")
    if len(d["steps"]) < 2: errors.append(f"{pid}: troppi pochi passaggi")
    if d["veg"] and any(ings.get(i, {}).get("r") in ("carne", "pesce") or i in ("tonno", "cotto", "crudo", "bresaola", "pancetta", "salmone_aff", "tortellini", "lasagna", "ragu", "bastoncini", "merluzzo", "gamberetti", "cotoletta", "wurstel", "speck") for i, _ in d["ing"]):
        errors.append(f"{pid}: segnato vegetariano ma contiene carne o pesce")
    for s in d["steps"]:
        for ph in re.findall(r"\{([a-z0-9_]+)", s):
            if ph not in seen: errors.append(f"{pid}: nel passaggio c'è {{{ph}}} ma non è tra gli ingredienti")
        if re.search(r"\d+\s*(g|ml|grammi)\b", s) and "a persona" not in s: warnings.append(f"{pid}: quantità fissa nel testo, non scala con le persone: «{s[:50]}…»")

for iid in ings:
    if iid not in used and not ings[iid].get("comp"): warnings.append(f"ingrediente mai usato: {iid}")   # comp = complemento del pasto

sm = load("supermercati.json")["supermercati"]
if len({s["id"] for s in sm}) != len(sm): errors.append("supermercati con id duplicato")

cats = {}
for d in piatti: cats[d["cat"]] = cats.get(d["cat"], 0) + 1
print(f"{len(ings)} ingredienti, {len(piatti)} piatti {cats}, "
      f"{sum(1 for d in piatti if d.get('sc'))} adatti alla schiscetta, {sum(1 for d in piatti if d['veg'])} vegetariani, {len(sm)} supermercati")
for w in warnings: print("AVVISO", w)
for e in errors: print("ERRORE", e)
sys.exit(1 if errors else 0)
