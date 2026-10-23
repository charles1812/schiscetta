#!/usr/bin/env python3
"""Catalogo ampio di ingredienti (carni, pesce, verdure, frutta, formaggi, salumi, dispensa, spezie) per creare ricette.

Uso: python tools/ingredienti_extra.py [--prova]   (--prova: conta i prodotti trovati dalle regole nei cataloghi
     scaricati in una cartella di prova, senza scrivere niente)
Prezzi base: stima per un supermercato medio (indice Altroconsumo ~120), ottobre 2026; conf 0 = prezzo al kg.
kcal e prot per 100 g/ml o per pezzo (u = pz): tabelle CREA o etichette; carne con l'osso = peso crudo con l'osso.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nutrizione import dump_db

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# id, nome, emoji, reparto, unità, confezione, prezzo, giorni, kcal, prot, regola (tutti, no), altro
X = [
    # ---------- carne ----------
    ("fusi_pollo", "Fusi di pollo", "🍗", "carne", "g", 0, 5.9, 2, 125, 13, ("fusi-di-pollo|fusi-pollo|pollo-[a-z-]*fusi", "impanat|arrosto|cott|marinat|speziat"), {}),
    ("ali_pollo", "Ali di pollo", "🍗", "carne", "g", 0, 4.9, 2, 140, 12, ("ali-di-pollo|alette-di-pollo", "impanat|marinat|piccant|cott|bbq"), {}),
    ("pollo_bocconcini", "Bocconcini di petto di pollo", "🍗", "carne", "g", 0, 10.9, 2, 100, 23, ("(bocconcini|cubetti|spiedini)-di-pollo|pollo-[a-z-]*(bocconcini|cubetti)", "impanat|marinat|cott|curry|kebab|piccant|cucina|birbe|alloro"), {}),
    ("macinato_pollo", "Macinato di pollo o tacchino", "🍗", "carne", "g", 0, 9.9, 2, 120, 20, ("macinato-di-(pollo|tacchino)|(pollo|tacchino)-[a-z-]*macinat", "cott|ragu"), {}),
    ("macinato_misto", "Macinato misto bovino e suino", "🥩", "carne", "g", 0, 9.9, 2, 230, 18, ("macinato-[a-z-]*(misto|suino-e-bovino|bovino-e-suino)", "cott|ragu"), {}),
    ("bistecca", "Bistecca di manzo", "🥩", "carne", "g", 0, 24.9, 3, 140, 21, ("(bistecca|bistecche|entrecote|controfiletto)-[a-z-]*(manzo|bovino|scottona|vitellone)|(scottona|bovino|manzo)-[a-z-]*(bistecca|entrecote|controfiletto)", "panin|hamburger|marinat|pizzaiola"), {}),
    ("filetto_maiale", "Filetto di maiale", "🥩", "carne", "g", 0, 14.9, 3, 120, 21, ("filetto-di-(maiale|suino)|suino-[a-z-]*filetto", "marinat|bacon|speck|cott|prosciutto|pepe|nodini"), {}),
    ("braciole", "Braciole di maiale", "🥩", "carne", "g", 0, 8.9, 3, 180, 19, ("(braciol[ae]|bracioline|costolett[ae])-[a-z-]*(maiale|suino)|suino-[a-z-]*(braciol|costolett)", "impanat|marinat"), {}),
    ("costine", "Costine di maiale", "🍖", "carne", "g", 0, 8.9, 3, 240, 15, ("costine-[a-z-]*(maiale|suino)|suino-[a-z-]*costine", "bbq|cott|marinat|glassat|affumicat|pront|gourmet"), {}),
    ("arista", "Arista di maiale (arrosto)", "🍖", "carne", "g", 0, 10.9, 3, 146, 21, ("(^|-)arista(-|$)", "fette|fettine|impanat|cott|salvia|tagliata"), {}),
    ("ossobuco", "Ossibuchi di vitello", "🍖", "carne", "g", 0, 16.9, 2, 120, 17, ("ossobuc|ossibuch", "cott|pronto|milanese"), {}),
    ("agnello", "Costolette di agnello", "🍖", "carne", "g", 0, 22.9, 2, 230, 16, ("agnello", "lilys|cane|gatto|pate|ragu|sugo|impanat"), {}),
    ("coniglio", "Coniglio a pezzi", "🍖", "carne", "g", 0, 11.9, 2, 120, 18, ("coniglio", "ragu|sugo|cott|pate|fegato|cucina|ligure"), {}),
    ("hamburger_pollo", "Hamburger di pollo", "🍔", "carne", "pz", 2, 3.49, 3, 170, 17, ("(hamburger|burger)-[a-z-]*(pollo|tacchino)", "impanat|vegan|veget|cott"), {"pzn": ["hamburger", "hamburger"]}),
    ("cotechino", "Cotechino precotto", "🥓", "frigo", "g", 500, 4.99, 60, 300, 18, ("cotechino", "lenticchie|zampone"), {}),
    ("guanciale", "Guanciale", "🥓", "frigo", "g", 100, 2.59, 30, 655, 9, ("guanciale-(amatriciano|[0-9]|stagionat|a-cubetti|tagliett)|tagliette-di-guanciale", "memory|cuscin|soffice|saponetta|smart"), {}),
    ("salame", "Salame affettato", "🥓", "frigo", "g", 100, 2.49, 30, 400, 25, ("salame-[a-z-]*(affettat|fette|milano|ungherese|napoli|felino|nostrano|[0-9]+-g)", "piccante|cioccolat|pizza"), {}),
    ("coppa", "Coppa a fette", "🥓", "frigo", "g", 100, 2.69, 30, 400, 24, ("(^|-)coppa-(piacentina|di-parma|stagionat|fette|affettat|[0-9])", "gelat|cioccolat|panna|scamerita|suino"), {}),
    # ---------- pesce ----------
    ("orata", "Orata (filetti)", "🐟", "pesce", "g", 0, 19.9, 2, 120, 20, ("(^|-)orat[ae](-|$)", "surgelat|panat|impanat|tris|gratin|cott|burger"), {}),
    ("branzino", "Branzino (filetti)", "🐟", "pesce", "g", 0, 19.9, 2, 100, 20, ("branzin|spigol", "surgelat|tris|panat|gratin|cott|burger"), {}),
    ("pesce_spada", "Pesce spada a tranci", "🐟", "pesce", "g", 0, 24.9, 2, 120, 20, ("pesce-spada", "affumicat|carpaccio|marinat"), {}),
    ("tonno_fresco", "Tonno fresco a tranci", "🐟", "pesce", "g", 0, 22.9, 2, 140, 23, ("tonno-[a-z-]*(fresco|filetto)|trancio-di-tonno", "olio|naturale|scatola|vetro|sott"), {}),
    ("baccala", "Baccalà dissalato", "🐟", "pesce", "g", 0, 16.9, 3, 95, 21, ("baccala|merluzzo-[a-z-]*dissalat", "mantecat|crema|frittell|fritt"), {}),
    ("platessa", "Filetti di platessa surgelati", "🐟", "surg", "g", 400, 4.49, 180, 85, 17, ("platessa", "panat|impanat|gratin|croccant|pastell"), {}),
    ("trota", "Filetti di trota", "🐟", "pesce", "g", 0, 14.9, 2, 120, 20, ("trota|trote", "affumicat"), {}),
    ("sogliola", "Sogliola", "🐟", "pesce", "g", 0, 22.9, 2, 85, 17, ("sogliol", "panat|impanat|gratin"), {}),
    ("gamberoni", "Gamberoni o mazzancolle", "🦐", "surg", "g", 400, 7.99, 180, 80, 17, ("gamberon|mazzancoll", "panat|impanat|cott|sugo|tris|misto|tempura|sandwich|spiedin"), {}),
    ("vongole", "Vongole", "🐚", "surg", "g", 500, 5.99, 180, 72, 10, ("vongol", "sugo|sughett|vongolata|condipresto|tris|cozze|misto|zuppa"), {}),
    ("polpo", "Polpo", "🐙", "pesce", "g", 0, 14.9, 2, 57, 11, ("polpo|polipo", "insalata|cott|carpaccio|sugo|panino|poke"), {}),
    ("seppie", "Seppie pulite", "🦑", "pesce", "g", 0, 13.9, 2, 72, 14, ("seppi[ae]", "nero|sugo|insalata|cott|ripien|osso"), {}),
    ("sardine", "Sardine sott'olio", "🐟", "secco", "g", 120, 1.99, 365, 210, 24, ("sardin[ae]-[a-z-]*olio", "pate|piccant"), {}),
    # ---------- verdura e frutta ----------
    ("asparagi", "Asparagi", "🌱", "fv", "g", 0, 6.9, 4, 24, 3.6, ("^(esselunga-)?asparag(i|o)-(verdi|bianchi|sfus|confezionat|mazzo|[0-9])", "crema|sott|grigliat|surgel|zuppa"), {}),
    ("spinaci_freschi", "Spinaci freschi", "🥬", "fv", "g", 300, 2.29, 4, 31, 3.4, ("^(esselunga-(naturama-)?)?spinac(i|ini)-[a-z0-9-]*(freschi|lavati|novelli|busta|[0-9]+-g)$", "surgel|crema|ricotta|cott"), {}),
    ("bietole", "Bietole", "🥬", "fv", "g", 0, 3.49, 5, 17, 1.8, ("^(esselunga-)?(biete|bietole|coste)(-|$)", "surgel|cott|vapore"), {}),
    ("cavolini", "Cavolini di Bruxelles", "🥬", "fv", "g", 0, 4.49, 7, 43, 3.4, ("cavolini-di-bruxelles", "cott|crema"), {}),
    ("porri", "Porri", "🥬", "fv", "g", 0, 3.49, 10, 31, 1.5, ("^(esselunga-)?porr(i|o)(-|$)", "crema|zuppa"), {"pz": 200, "pzn": ["porro", "porri"]}),
    ("radicchio", "Radicchio", "🥬", "fv", "g", 0, 3.99, 7, 13, 1.4, ("^(esselunga-)?radicchio-(rosso|tardivo|chioggia|trevis|lungo|tondo|confez|sfus)", "grigliat|sott|risotto|crema"), {"pz": 300, "pzn": ["cespo", "cespi"]}),
    ("scalogno", "Scalogno", "🧅", "fv", "g", 0, 4.99, 30, 72, 2.5, ("scalogn", "sott|crema|aceto"), {"pz": 25, "pzn": ["scalogno", "scalogni"]}),
    ("cipollotti", "Cipollotti", "🧅", "fv", "g", 0, 4.49, 7, 32, 1.8, ("cipollott", "sott"), {"pz": 30, "pzn": ["cipollotto", "cipollotti"]}),
    ("patate_dolci", "Patate dolci", "🍠", "fv", "g", 0, 3.49, 20, 86, 1.6, ("patat(e|a)-dolc|patate-americane|batata", "chips|surgel|frit"), {"pz": 300, "pzn": ["patata dolce", "patate dolci"]}),
    ("barbabietole", "Barbabietole precotte", "🟣", "fv", "g", 500, 1.49, 10, 43, 1.6, ("^(esselunga-)?barbabietol|barbabietole-(rosse|precotte|cotte)", "succo|chips|crema|hummus|panino"), {}),
    ("zenzero", "Zenzero fresco", "🫚", "fv", "g", 0, 9.9, 30, 80, 1.8, ("^(esselunga-)?zenzero(-fresco|-radice|$)", "polvere|tisana|candito|bevand|succo|shot"), {}),
    ("arance", "Arance", "🍊", "fv", "g", 0, 1.99, 20, 47, 0.9, ("^(esselunga-)?arance-(tarocco|navel|moro|sanguinell|bionde|da-tavola|sfus|rosse|bio|di-sicilia|confezionat)", "succo|spremut|marmellat|bevand"), {"pz": 200, "pzn": ["arancia", "arance"]}),
    ("pere", "Pere", "🍐", "fv", "g", 0, 2.49, 10, 57, 0.4, ("^(esselunga-)?pere-(abate|williams|conference|kaiser|decana|coscia|santa-maria|sfus|confezionat|bio)", "succo|nettare|frullat|sciroppat"), {"pz": 180, "pzn": ["pera", "pere"]}),
    ("kiwi", "Kiwi", "🥝", "fv", "g", 0, 3.49, 14, 61, 1.1, ("^(esselunga-)?kiwi(-verde|-gold|-giallo|-sfus|-confezionat|$)", "succo|bevand|essiccat"), {"pz": 90, "pzn": ["kiwi", "kiwi"]}),
    ("fragole", "Fragole", "🍓", "fv", "g", 250, 2.99, 3, 32, 0.7, ("^(esselunga-)?fragol(e|ine)-[a-z0-9-]*(250|500|confezion|vaschetta)", "succo|yogurt|confettur|gelat|surgel"), {}),
    ("uva", "Uva", "🍇", "fv", "g", 0, 3.49, 6, 69, 0.7, ("^(esselunga-)?uva-(bianca|nera|rosata|italia|vittoria|red-globe|senza-semi|sfus|confezionat)", "succo|passa|sultanina|uvetta"), {}),
    ("frutti_bosco", "Frutti di bosco surgelati", "🫐", "surg", "g", 300, 2.99, 180, 45, 1.0, ("^(esselunga-|[a-z]+-)?frutti-di-bosco(-surgelat|-misti|-freschi|-[0-9]|$)", "yogurt|gelat|succo|confettur|tisana|infuso"), {}),
    # ---------- formaggi e latticini ----------
    ("bufala", "Mozzarella di bufala", "🧀", "frigo", "g", 125, 2.49, 7, 288, 17, ("mozzarella-di-bufala|bufala-campana", "pizza|burger|tris"), {}),
    ("burrata", "Burrata", "🧀", "frigo", "g", 125, 2.79, 7, 300, 13, ("burrat[ae]", "pizza|pesto"), {}),
    ("emmental", "Emmental", "🧀", "frigo", "g", 200, 2.79, 30, 380, 28, ("emmental", "fondut"), {}),
    ("provolone", "Provolone", "🧀", "frigo", "g", 200, 2.99, 30, 374, 26, ("provolone", "pizza|panin"), {}),
    ("mascarpone", "Mascarpone", "🧀", "frigo", "g", 250, 2.49, 20, 455, 4.6, ("mascarpone-[a-z0-9-]*(250|500)", "tiramisu|crema|gelat|torta"), {}),
    ("asiago", "Asiago", "🧀", "frigo", "g", 200, 2.99, 30, 350, 25, ("asiago-(fresco|stagionat|pressato|dop|d-allevo|mezzano)", "pizza|panin|ravioli|duetto|chips|fiordifrutta|mirtill|surgel"), {}),
    ("taleggio", "Taleggio", "🧀", "frigo", "g", 200, 3.29, 20, 315, 19, ("taleggio", "panin|pizza"), {}),
    ("yogurt_bianco", "Yogurt bianco intero", "🥛", "frigo", "g", 500, 1.49, 20, 66, 3.8, ("yogurt-[a-z-]*(bianco|naturale|intero)-[a-z0-9-]*(500|450|4-x-125|2-x-125|125)", "greco|frutta|cocco|soia|magro|zero|skyr|vaniglia|bambin|dolce"), {}),
    ("burger_vegetale", "Burger vegetale", "🌱", "frigo", "pz", 2, 2.99, 10, 200, 12, ("burger-[a-z-]*(vegetal|vegan|soia|ceci|lenticchie)|(vegetal|vegan)-[a-z-]*burger", "pollo|bovino|manzo|tacchino|suino"), {"pzn": ["burger", "burger"]}),
    # ---------- dispensa ----------
    ("riso_integrale", "Riso integrale", "🍚", "secco", "g", 1000, 2.49, 365, 337, 7.5, ("riso-[a-z-]*integrale-[a-z0-9-]*(500|1000|1-kg)", "gallett|soffiat|chips|bevanda|pronto|cott|risotto"), {}),
    ("quinoa", "Quinoa", "🌾", "secco", "g", 400, 3.49, 365, 368, 14, ("(^|-)quinoa-(bianca|rossa|nera|tricolore|real|bio|[0-9])", "chips|gallett|soffiat|insalat|pront|cracker|barret|snack|burger|minestr|verdure|cucina|bulgur"), {}),
    ("pasta_integrale", "Pasta integrale", "🍝", "secco", "g", 500, 1.29, 365, 340, 13, ("(penne|fusilli|spaghetti|mezze-maniche|sedanini|rigatoni)-[a-z0-9-]*integral[a-z0-9-]*500", "farro|kamut|legumi|senza"), {}),
    ("pasta_legumi", "Pasta di legumi (lenticchie o ceci)", "🍝", "secco", "g", 250, 1.99, 365, 340, 23, ("(pasta|fusilli|penne|sedanini|caserecce|spaghetti)-[a-z0-9-]*(di-lenticchie|di-ceci|di-piselli|legumi)", "zuppa|minestr"), {}),
    ("lenticchie_rosse", "Lenticchie rosse decorticate", "🫘", "secco", "g", 500, 2.49, 365, 340, 25, ("lenticchie-rosse-decorticat|lenticchie-rosse-[0-9]", "pasta|zuppa|chips|vellutata|burger"), {}),
    ("polpa_pomodoro", "Polpa di pomodoro", "🥫", "secco", "g", 400, 0.89, 365, 21, 1.2, ("polpa-di-pomodoro|polpa-pronta", "bio|ciliegin|datterin|basilico|sugo"), {}),
    ("concentrato", "Concentrato di pomodoro", "🥫", "condimenti", "g", 130, 0.99, 365, 82, 4.5, ("concentrato-di-pomodoro", "bio"), {"disp": True}),
    ("pomodori_secchi", "Pomodori secchi sott'olio", "🍅", "secco", "g", 280, 2.99, 365, 210, 5, ("pomodori-secchi", "pesto|crema|chips|pane|cracker|burger|pate"), {}),
    ("olive_verdi", "Olive verdi", "🫒", "secco", "g", 170, 1.99, 365, 145, 1, ("olive-verdi", "ripien|ascolane|fritt|pate|crema|olio"), {}),
    ("pinoli", "Pinoli", "🌰", "secco", "g", 50, 3.99, 180, 570, 14, ("(^|-)pinoli-", "pesto|biscott|torta"), {}),
    ("noci", "Noci sgusciate", "🌰", "secco", "g", 150, 3.49, 180, 654, 15, ("noci-sgusciat|gherigli", "biscott|torta|cioccolat|pesto|olio|cocco|anacard|pecan|macadamia"), {}),
    ("pistacchi", "Pistacchi", "🌰", "secco", "g", 150, 4.99, 180, 600, 20, ("pistacchi-[a-z-]*(sgusciat|naturali|tostat)", "crema|cioccolat|gelat|pesto|granella"), {}),
    ("uvetta", "Uvetta", "🍇", "secco", "g", 200, 1.99, 365, 290, 2.5, ("uvetta|uva-sultanina|uva-passa", "cioccolat|biscott|pane"), {}),
    ("miele", "Miele", "🍯", "condimenti", "g", 500, 4.99, 365, 304, 0.3, ("miele-[a-z-]*(millefiori|acacia|castagno|agrumi|tiglio|eucalipto|italiano|[0-9]+-g)", "caramell|tisana|biscott|yogurt|cereali|barrett|propoli"), {"disp": True}),
    ("zucchero", "Zucchero", "🍬", "condimenti", "g", 1000, 1.19, 365, 392, 0, ("zucchero-[a-z-]*(semolato|bianco|di-canna|extrafine)", "velo|bustin|vanigl|cubett|confettur|caramell"), {"disp": True}),
    ("avena", "Fiocchi d'avena", "🥣", "secco", "g", 500, 1.99, 365, 372, 13, ("fiocchi-d-?avena|avena-[a-z-]*fiocchi", "biscott|barrett|bevanda|cioccolat|muesli|crunchy|granola"), {}),
    ("burro_arachidi", "Burro di arachidi", "🥜", "secco", "g", 350, 3.49, 180, 600, 25, ("burro-di-arachidi|crema-[a-z-]*arachidi", "cioccolat|barrett|biscott"), {}),
    ("cioccolato", "Cioccolato fondente", "🍫", "extra", "g", 100, 1.99, 365, 540, 7, ("cioccolato-fondente-[a-z0-9-]*100-g", "nocciol|mandorl|arancia|peperonc|menta|caramel|cocco|biscott|pralin|ripien|crema|bevanda|gelat|muesli|sale"), {}),
    ("maionese", "Maionese", "🥚", "condimenti", "g", 225, 1.99, 90, 690, 1.2, ("maionese", "light|vegan|senza-uova|tartara|cocktail|aglio|tartufo|limone|pepe|wasabi|curry|cucina"), {"disp": True}),
    ("senape", "Senape", "🟡", "condimenti", "g", 200, 1.59, 180, 100, 6, ("senape-[a-z-]*(dijon|delicata|forte|classica|[0-9]+-g)", "miele|salsa|frutta|cremona|mantovan|bonduelle|contorn"), {"disp": True}),
    ("ketchup", "Ketchup", "🍅", "condimenti", "g", 500, 1.99, 180, 110, 1.5, ("ketchup", "piccant|curry|zero|bbq"), {"disp": True}),
    ("lievito", "Lievito di birra secco", "🍞", "condimenti", "g", 21, 0.99, 365, 325, 40, ("lievito-di-birra-[a-z-]*(secco|disidratat|liofilizzat|bustine|3-x)", "dolci|vanigl"), {"disp": True}),
    # ---------- spezie ed erbe ----------
    ("paprika", "Paprika", "🌶️", "condimenti", "g", 50, 1.99, 365, 280, 14, ("paprika", "chips|patatin|pollo|salsa|crackers|taralli|suino|coppa"), {"disp": True}),
    ("cumino", "Cumino", "🌿", "condimenti", "g", 40, 2.29, 365, 375, 18, ("cumino", "pane|formaggio|crackers"), {"disp": True}),
    ("noce_moscata", "Noce moscata", "🌰", "condimenti", "g", 30, 2.49, 365, 525, 6, ("noce-moscata", ""), {"disp": True}),
    ("cannella", "Cannella", "🌿", "condimenti", "g", 40, 2.29, 365, 247, 4, ("cannella", "biscott|tisana|cereali|caramell|pane|muesli|granola|infuso|yogurt"), {"disp": True}),
    ("curcuma", "Curcuma", "🟠", "condimenti", "g", 40, 2.29, 365, 312, 9.7, ("curcuma", "tisana|bevanda|integrat|capsul|latte|infuso|miele"), {"disp": True}),
    ("timo", "Timo", "🌿", "condimenti", "g", 15, 1.99, 365, 276, 9, ("(^|-)timo(-|$)", "miele|tisana|tisane|infuso|intimo|detergent"), {"disp": True}),
    ("alloro", "Alloro", "🍃", "condimenti", "g", 10, 1.49, 365, 313, 7.6, ("(^|-)alloro-(foglie|[0-9])|foglie-di-alloro|erbe-alloro", "tisana|liquore"), {"disp": True}),
    ("menta", "Menta fresca", "🌿", "fv", "g", 30, 1.49, 5, 44, 3.3, ("^(esselunga-)?menta(-fresca|-confezionat|-in-vaso|$)", "chewing|gomm|caramell|tisana|sciroppo|liquor|cioccolat|infuso"), {}),
    ("erba_cipollina", "Erba cipollina", "🌿", "fv", "g", 20, 1.49, 5, 30, 3.3, ("erba-cipollina", "formaggio|salsa|crackers"), {}),
]


def entries():
    for iid, n, e, r, u, conf, p, dur, kcal, prot, rule, extra in X:
        ing = {"id": iid, "n": n, "e": e, "r": r, "u": u, "conf": conf, "p": p, "dur": dur, "kcal": kcal, "prot": prot}
        ing.update(extra)
        if u == "pz" and "pzn" not in ing: ing["pzn"] = ["pezzo", "pezzi"]
        rl = {"tutti": rule[0]}
        if rule[1]: rl["no"] = rule[1]
        yield ing, rl


if __name__ == "__main__":
    import re
    if "--prova" in sys.argv:       # quanti prodotti trova ogni regola nei cataloghi (sitemap) scaricati
        cats = sys.argv[sys.argv.index("--prova") + 1:]
        R = json.load(open(os.path.join(ROOT, "data", "prezzi_regole.json"), encoding="utf-8"))
        never = re.compile(R["escludi_sempre"])
        L = [s for c in cats for s in open(c, encoding="utf-8").read().split()]
        for ing, rl in entries():
            a, n = re.compile(rl["tutti"]), re.compile(rl.get("no") or "$^")
            m = [s for s in L if a.search(s) and not n.search(s) and not never.search(s)]
            print(f"{ing['id']:18} {len(m):4}  {' | '.join(x[:40] for x in m[:3])}")
        sys.exit()
    F = os.path.join(ROOT, "data", "ingredienti.json")
    db = json.load(open(F, encoding="utf-8"))
    have = {i["id"] for i in db["ingredienti"]}
    added = [ing for ing, _ in entries() if ing["id"] not in have]
    db["ingredienti"] += added
    open(F, "w", encoding="utf-8").write(dump_db(db))
    RF = os.path.join(ROOT, "data", "prezzi_regole.json")
    reg = json.load(open(RF, encoding="utf-8"))
    for ing, rl in entries():
        reg["regole"].setdefault(ing["id"], rl)
    open(RF, "w", encoding="utf-8").write(json.dumps(reg, ensure_ascii=False, indent=1) + "\n")
    print(len(added), "ingredienti aggiunti")
