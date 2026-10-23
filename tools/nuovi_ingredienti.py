#!/usr/bin/env python3
"""Aggiunge ingredienti nuovi (con valori nutrizionali e regole per i prezzi veri) senza toccare quelli esistenti.

Uso: python tools/nuovi_ingredienti.py
Prezzi base: stima per un supermercato medio (indice Altroconsumo ~120), ottobre 2026; poi li correggono i prezzi veri.
kcal e prot: per 100 g/ml o per pezzo, tabelle CREA o etichette (vedi tools/nutrizione.py).
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nutrizione import dump_db

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NEW = [
    ({"id": "pecorino", "n": "Pecorino romano grattugiato", "e": "🧀", "r": "frigo", "u": "g", "conf": 100, "p": 2.49, "dur": 30, "kcal": 387, "prot": 28.0},
     {"tutti": "pecorino-romano-[a-z0-9-]*grattugiat", "no": "pesto|sugo"}),
    ({"id": "cannellini", "n": "Fagioli cannellini in scatola", "e": "🫘", "r": "secco", "u": "g", "conf": 240, "p": 0.89, "b": "lattina da 400 g (240 g sgocciolati)", "dur": 365, "kcal": 105, "prot": 7.0},
     {"tutti": "fagioli-cannellini-[a-z0-9-]*(400-g|3-x-200|3-x-380|2-x-400|360-g|380-g|lessati)", "no": "secchi|zuppa|pasta|vellutata", "k": 1.67}),
    ({"id": "tagliatelle", "n": "Tagliatelle all'uovo", "e": "🍝", "r": "secco", "u": "g", "conf": 250, "p": 1.79, "dur": 365, "kcal": 380, "prot": 14.0},
     {"tutti": "(^|-)tagliatelle-[a-z0-9-]*(250-?g|500-?g)$", "no": "gluten|senza|integral|spinaci|farro|legumi|tartufo|bio-|rustiche"}),
    ({"id": "lasagne_sfoglie", "n": "Sfoglie per lasagne", "e": "🟨", "r": "secco", "u": "g", "conf": 500, "p": 2.39, "dur": 365, "kcal": 370, "prot": 14.0},
     {"tutti": "(^|-)lasagne-(pasta-)?(all-?uovo|alluovo|di-semola|sfoglia)[a-z0-9-]*-(250|500)-?g$|(^|-)lasagne-pasta-alluovo-500g$", "no": "bolognese|ragu|verdure|zucchine|carciofi|spinaci|schar|gluten"}),
    ({"id": "besciamella", "n": "Besciamella pronta", "e": "🥛", "r": "frigo", "u": "ml", "conf": 500, "p": 1.69, "dur": 60, "kcal": 120, "prot": 3.0},
     {"tutti": "besciamella-[a-z-]*500-ml$|(^|-)besciamella-500-ml$", "no": "leggera|senza|condisoia"}),
    ({"id": "fettine", "n": "Fettine di bovino", "e": "🥩", "r": "carne", "u": "g", "conf": 0, "p": 18.9, "dur": 2, "kcal": 120, "prot": 21.5},
     {"tutti": "(scottona|bovino|vitellone|manzo)-[a-z-]*fettine-(scelte|sottili$|per-)|fettine-[a-z-]*(scottona|bovino|vitellone|vitello)", "no": "formaggio|rucola|straccetti|impanat|marinat|tagliata|branzino|pizzaiola"}),
    ({"id": "lonza", "n": "Fettine di lonza di maiale", "e": "🥩", "r": "carne", "u": "g", "conf": 0, "p": 10.9, "dur": 3, "kcal": 146, "prot": 21.0},
     {"tutti": "lonza[a-z-]*(fettine|fette)|fettine-di-lonza", "no": "impanat|salvia|tagliata|cott"}),
    ({"id": "calamari", "n": "Anelli di calamaro surgelati", "e": "🦑", "r": "surg", "u": "g", "conf": 450, "p": 4.99, "dur": 180, "kcal": 70, "prot": 15.0},
     {"tutti": "anelli-di-(totano|calamar)[a-z0-9-]*|calamari-[a-z-]*(anelli|surgelat|congelat)", "no": "croccant|fritt|impanat|pastell|sugo|misto|romana"}),
    ({"id": "acciughe", "n": "Filetti di acciughe sott'olio", "e": "🐟", "r": "secco", "u": "g", "conf": 80, "p": 2.49, "dur": 365, "kcal": 206, "prot": 29.0},
     {"tutti": "filetti-di-(alici|acciughe)[a-z0-9-]*olio", "no": "marinat|salsa|pasta|720"}),
    ({"id": "mortadella", "n": "Mortadella a fette", "e": "🥓", "r": "frigo", "u": "g", "conf": 120, "p": 2.19, "dur": 10, "kcal": 300, "prot": 15.0},
     {"tutti": "(^|-)mortadella-[a-z0-9-]*(bologna|igp|affettat|fette|[0-9]+-g)", "no": "pistacchi|fegato|tartufo|cubett"}),
    ({"id": "carciofi", "n": "Cuori di carciofo surgelati", "e": "🌿", "r": "surg", "u": "g", "conf": 450, "p": 3.29, "dur": 180, "kcal": 25, "prot": 2.7},
     {"tutti": "carciof[io]-[a-z-]*surgelat|cuori-di-carciofo[a-z-]*surgelat", "no": "patate|misto|crema"}),
    ({"id": "pelati", "n": "Pomodori pelati", "e": "🥫", "r": "secco", "u": "g", "conf": 400, "p": 0.89, "dur": 365, "kcal": 22, "prot": 1.2},
     {"tutti": "(^|-)(pomodori-)?pelati-[a-z0-9-]*(400-g|800-g|2-x-400|3-x-400)", "no": "bio|ciliegin|datterin|basilico|san-marzano"}),
    ({"id": "vino", "n": "Vino bianco da cucina", "e": "🍷", "r": "condimenti", "u": "ml", "conf": 1000, "p": 2.29, "dur": 60, "kcal": 70, "prot": 0.1},
     {"tutti": "(^|-)vino-bianco[a-z0-9-]*(1-l|75-cl|750-ml)$", "no": "aceto|frizzant|spumant|dolce|1500"}),
    ({"id": "cime_rapa", "n": "Cime di rapa surgelate", "e": "🥬", "r": "surg", "u": "g", "conf": 450, "p": 2.49, "dur": 180, "kcal": 22, "prot": 2.9},
     {"tutti": "cime-di-rapa[a-z0-9-]*(surgelat|primavera)", "no": "vapore|aglio|condit"}),
    ({"id": "finocchi", "n": "Finocchi", "e": "🌱", "r": "fv", "u": "g", "conf": 0, "p": 2.49, "pz": 300, "pzn": ["finocchio", "finocchi"], "dur": 8, "kcal": 9, "prot": 1.2},
     {"tutti": "^(esselunga-)?finocchi(-tagliati|-confezionati|-sfusi|$)", "no": "grigliat|olio|finocchiett"}),
    ({"id": "porcini", "n": "Funghi porcini secchi", "e": "🍄", "r": "secco", "u": "g", "conf": 20, "p": 3.49, "dur": 365, "kcal": 280, "prot": 25.0},
     {"tutti": "funghi-porcini-secchi|porcini-secchi", "no": "misto|risotto|crema"}),
    # 15/10: blocco 3 di ricette (pizzoccheri, spezzatino, ribollita, frutti di mare, gnocchi alla romana)
    ({"id": "verza", "n": "Cavolo verza", "e": "🥬", "r": "fv", "u": "g", "conf": 0, "p": 1.49, "pz": 1200, "pzn": ["verza", "verze"], "dur": 10, "kcal": 25, "prot": 2.0},
     {"tutti": "^(esselunga-)?(cavolo-)?verza(-scura|-sfus|-cat|-intera|-confezionat|$)", "no": "aglio|ravioli|gyoza|zuppa"}),
    ({"id": "pizzoccheri", "n": "Pizzoccheri della Valtellina", "e": "🟫", "r": "secco", "u": "g", "conf": 500, "p": 2.49, "dur": 365, "kcal": 340, "prot": 13.0},
     {"tutti": "pizzoccheri-(della-valtellina|[0-9])", "no": "tris|cucina|viva-la-mamma|con-"}),
    ({"id": "fontina", "n": "Fontina", "e": "🧀", "r": "frigo", "u": "g", "conf": 0, "p": 19.9, "dur": 20, "kcal": 343, "prot": 24.5},
     {"tutti": "fontina-(dop|[a-z0-9-]*fetta|da-banco)", "no": "fonduta|pizzocc"}),
    ({"id": "spezzatino", "n": "Spezzatino di bovino", "e": "🥩", "r": "carne", "u": "g", "conf": 0, "p": 14.9, "dur": 2, "kcal": 150, "prot": 20.0},
     {"tutti": "(bovino|scottona|vitello|vitellone|manzo)-[a-z-]*spezzatino|spezzatino-di-(vitello|bovino|manzo)", "no": "tacchino|pollo|suino|agnello"}),
    ({"id": "cavolo_nero", "n": "Cavolo nero", "e": "🥬", "r": "fv", "u": "g", "conf": 0, "p": 4.49, "pz": 300, "pzn": ["mazzo", "mazzi"], "dur": 6, "kcal": 35, "prot": 3.2},
     {"tutti": "^(esselunga-)?(naturama-)?(cavolo-nero(-sfuso|-foglia|$)|cimette-di-cavolo-nero)", "no": "zuppa|ribollita|erbazzone"}),
    ({"id": "sgombro", "n": "Filetti di sgombro in scatola", "e": "🐟", "r": "secco", "u": "g", "conf": 120, "p": 2.49, "dur": 365, "kcal": 200, "prot": 22.0},
     {"tutti": "filetti-di-sgombro-[a-z-]*(olio|naturale)", "no": "piccante|peperoncino|limone"}),
    ({"id": "cozze", "n": "Cozze sgusciate surgelate", "e": "🦪", "r": "surg", "u": "g", "conf": 300, "p": 4.49, "dur": 180, "kcal": 85, "prot": 13.0},
     {"tutti": "cozze-[a-z-]*sgusciate", "no": "pomodoro|tris|zuppa|vongole"}),
    ({"id": "semolino", "n": "Semolino di grano duro", "e": "🌾", "r": "secco", "u": "g", "conf": 300, "p": 1.59, "dur": 365, "kcal": 340, "prot": 11.5},
     {"tutti": "semola[a-z-]*semolino|(^|-)semolino-(di-grano-duro|[0-9])", "no": "mellin|hipp|crema|svezzamento"}),
    # 15/10: menu leggero (stomaco delicato)
    ({"id": "pastina", "n": "Pastina (stelline, anellini…)", "e": "⭐", "r": "secco", "u": "g", "conf": 500, "p": 1.19, "dur": 365, "kcal": 355, "prot": 12.5},
     {"tutti": "(^|-)(stelline|anellini|tempestine|filini|ditalini|puntine|risoni|pastina)-[a-z0-9-]*(250|500)-?g$", "no": "integral|mellin|plasmon|pappa|bio-|uovo|senza"}),
]

if __name__ == "__main__":
    F = os.path.join(ROOT, "data", "ingredienti.json")
    db = json.load(open(F, encoding="utf-8"))
    have = {i["id"] for i in db["ingredienti"]}
    added = [i for i, _ in NEW if i["id"] not in have]
    db["ingredienti"] += added
    open(F, "w", encoding="utf-8").write(dump_db(db))
    R = os.path.join(ROOT, "data", "prezzi_regole.json")
    reg = json.load(open(R, encoding="utf-8"))
    for i, rule in NEW:
        reg["regole"].setdefault(i["id"], rule)
    open(R, "w", encoding="utf-8").write(json.dumps(reg, ensure_ascii=False, indent=1) + "\n")
    print("aggiunti:", [i["id"] for i in added] or "nessuno")
