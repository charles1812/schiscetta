#!/usr/bin/env python3
"""Aggiunge a data/ingredienti.json i valori nutrizionali: kcal e proteine (g).

Per 100 g o 100 ml (unità g/ml) oppure per un pezzo (unità pz). Valori medi: tabelle di composizione
degli alimenti CREA per i prodotti di base, etichette dei prodotti più comuni per quelli confezionati.
Le quantità delle ricette sono a crudo (pasta e riso secchi, carne cruda; legumi in scatola sgocciolati).

Uso: python tools/nutrizione.py   (riscrive solo i campi kcal e prot)
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = os.path.join(ROOT, "data", "ingredienti.json")

# id: (kcal, proteine)   — per 100 g/ml, o per pezzo se l'ingrediente si conta a pezzi
N = {
    "pomodorini": (20, 1.0), "pomodori": (19, 1.0), "insalata": (15, 1.3), "rucola": (25, 2.6), "zucchine": (14, 1.3),
    "carote": (35, 1.1), "cipolla": (28, 1.0), "aglio": (5, 0.3),            # aglio: uno spicchio (4 g)
    "patate": (80, 2.0), "sedano": (16, 0.7), "limone": (20, 0.4),           # limone: succo e scorza di un frutto
    "basilico": (23, 3.2), "prezzemolo": (36, 3.0), "salvia": (50, 2.0), "avocado": (270, 3.4),   # avocado: un frutto, 170 g di polpa
    "cetriolo": (38, 1.6), "zucca": (26, 1.0), "broccoli": (34, 2.8), "peperoni": (26, 0.9), "melanzane": (18, 1.1),
    "champignon": (22, 3.1), "cavolfiore": (25, 1.9), "pane": (270, 8.5), "piadina": (330, 8.5),  # piadina da 110 g
    "tortillas": (125, 3.5), "pancarre": (265, 8.0), "uova": (76, 6.5),       # tortilla 40 g; uovo medio, 53 g senza guscio
    "latte": (64, 3.3), "burro": (717, 0.9), "mozzarella": (253, 18.7), "grana": (392, 33.0), "ricotta": (146, 8.8),
    "stracchino": (285, 17.0), "feta": (264, 14.0), "gorgonzola": (324, 19.0), "panna": (195, 2.5), "yogurt": (96, 9.0),
    "cotto": (215, 19.8), "crudo": (250, 26.0), "bresaola": (151, 32.0), "pancetta": (310, 15.0),
    "tortellini": (300, 13.0), "ravioli": (255, 10.0), "gnocchi": (155, 3.5), "sugo_rana": (70, 1.5),
    "sfoglia": (920, 13.0), "base_pizza": (1100, 30.0),                      # rotolo da 230 g; base stesa da 400 g
    "lasagna": (160, 8.0), "salmone_aff": (160, 23.0), "wurstel": (275, 12.0), "speck": (300, 28.0),
    "spalmabile": (225, 5.5), "scamorza": (320, 25.0), "hummus": (300, 7.0), "tofu": (125, 12.5),
    "pollo": (100, 23.3), "macinato": (180, 20.0), "hamburger": (220, 18.0), "salsiccia": (304, 15.4),   # hamburger da 100 g
    "tacchino": (107, 24.0), "manzo": (130, 21.0), "cotoletta": (230, 13.0), "cosce_pollo": (130, 13.0),  # cosce: peso con l'osso
    "salmone": (185, 19.0), "pasta_corta": (353, 12.5), "spaghetti": (353, 12.5), "riso_carnaroli": (345, 7.0),
    "riso_basmati": (350, 7.5), "cous_cous": (360, 12.5), "farro": (335, 15.0), "polenta": (360, 8.7), "noodles": (380, 13.0),
    "lenticchie": (325, 23.0), "ceci": (120, 7.0), "borlotti": (105, 6.5), "fagioli_rossi": (105, 7.0), "mais": (90, 2.9),
    "tonno": (192, 25.0), "olive": (180, 1.5), "passata": (30, 1.4), "ragu": (100, 6.0), "pesto": (500, 5.0),
    "condiriso": (115, 2.0), "latte_cocco": (190, 1.8), "pure": (350, 8.0), "zafferano": (0, 0.0), "orzo": (340, 10.0),
    "olio": (823, 0.0), "sale": (0, 0.0), "pepe": (251, 10.0), "aceto": (100, 0.5), "peperoncino": (282, 12.0),
    "origano": (265, 9.0), "rosmarino": (331, 5.0), "curry": (325, 14.0), "spezie_chili": (300, 13.0), "dado": (25, 1.0),
    "pangrattato": (360, 12.0), "farina": (340, 11.0), "soia": (60, 8.0), "capperi": (25, 2.0), "piselli": (70, 5.5),
    "spinaci": (25, 3.0), "fagiolini": (25, 2.0), "verdure_grigliate": (45, 1.5), "funghi": (25, 2.5), "verdure_wok": (35, 1.8),
    "bastoncini": (50, 3.3), "merluzzo": (75, 17.0), "gamberetti": (75, 16.0), "patate_surg": (140, 2.5),   # bastoncino da 25 g
}

def dump_db(db):
    """stesso formato del file a mano: un reparto o un ingrediente per riga"""
    one = lambda x: json.dumps(x, ensure_ascii=False)
    parts = [f'  "{k}": {one(v)}' for k, v in db.items() if not isinstance(v, list)]
    for k, v in db.items():
        if isinstance(v, list): parts.append(f'  "{k}": [\n' + ",\n".join("    " + one(x) for x in v) + "\n  ]")
    return "{\n" + ",\n".join(parts) + "\n}\n"


if __name__ == "__main__":
    db = json.load(open(F, encoding="utf-8"))
    missing = []
    for i in db["ingredienti"]:
        if i["id"] in N: i["kcal"], i["prot"] = N[i["id"]]
        elif "kcal" not in i: missing.append(i["id"])
    open(F, "w", encoding="utf-8").write(dump_db(db))
    print(len(db["ingredienti"]), "ingredienti;", "senza valori:", missing or "nessuno")
