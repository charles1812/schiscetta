#!/usr/bin/env python3
"""Test end-to-end dell'app HTML con Playwright (Chromium headless) + screenshot in dist/screens/.

Uso: <python con playwright> tools/test_app.py
Percorre: onboarding -> menu automatico -> cambio piatto -> lista della spesa -> prezzo -> spesa fatta ->
stasera (timer, passi, fatto) -> ricettario -> impostazioni; poi tema scuro e 40 menu automatici per le statistiche.
Esce con codice 1 se un controllo fallisce o ci sono errori JavaScript.
"""
import json, pathlib, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "dist" / "schiscetta.html").as_uri() + "?today=2026-10-18"
SHOTS = ROOT / "dist" / "screens"
SHOTS.mkdir(parents=True, exist_ok=True)
fails, errors = [], []


def check(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond: fails.append(msg)


def open_reps(page):
    """apre tutti i reparti della spesa (sono a tendina)"""
    if page.locator(".rep:not(.open)").count():
        if page.locator("[data-a=repAll]").inner_text().startswith("Chiudi"): page.click("[data-a=repAll]")
        page.click("[data-a=repAll]")


def shot(page, name):
    page.wait_for_timeout(350)
    page.screenshot(path=str(SHOTS / f"{name}.png"))


RICETTE = [None]
VERS = [None]
GZ = []      # chiamate al vecchio spese.php: devono restare zero (Schiscetta non manda più le spese fuori)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="it-IT")
    ctx.add_init_script("window.__TEST_LIST = 1")      # le prove vecchie usano il menu a elenco; il calendario ha le sue
    # niente rete nei test: i file dei prezzi «online» rispondono con le copie locali
    def feed_route(route):
        url = route.request.url
        if "cerca.php" in url:      # ricerca nel catalogo del supermercato (simulata)
            return route.fulfill(status=200, headers={"access-control-allow-origin": "*"}, content_type="application/json",
                                 body=json.dumps({"totale": 2, "risultati": [{"c": "515693", "n": "Coca cola zero lattina 8 x 330 ml"}, {"c": "111", "n": "Coca cola original 1 5 l"}]}))
        if "prodotto.php" in url:
            return route.fulfill(status=200, headers={"access-control-allow-origin": "*"}, content_type="application/json",
                                 body=json.dumps({"n": "COCA-COLA Zero Zuccheri Lattina 8 x 330 ml", "b": "Coca-Cola", "prezzo": 8.75, "up": 0.00332, "base": "ml",
                                                  "qty": 2636, "pezzi": 8, "pezzo": 330, "promo": False, "out": False, "m": "esselunga", "c": "515693",
                                                  "img": "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="}))
        m = url.split("?")[0].rsplit("/", 1)[-1]
        if m == "spese.php":
            if route.request.method == "OPTIONS":
                return route.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "Content-Type", "access-control-allow-methods": "GET, POST, OPTIONS"})
            GZ.append(route.request.method)
            return route.fulfill(status=200, headers={"access-control-allow-origin": "*"}, content_type="application/json", body='{"ok":true}')
        if m == "versione.json":     # aggiornamento dell'app: vuoto, salvo nel test dedicato
            return route.fulfill(status=200, headers={"access-control-allow-origin": "*"}, content_type="application/json", body=VERS[0] or "{}")
        if m == "ricette.json":     # database delle ricette sul server: vuoto, salvo nel test dedicato
            return route.fulfill(status=200, headers={"access-control-allow-origin": "*"}, content_type="application/json", body=RICETTE[0] or "{}")
        f = ROOT / "data" / "prezzi" / m
        route.fulfill(status=200, headers={"access-control-allow-origin": "*"},
                      content_type="application/json", body=f.read_text(encoding="utf-8") if f.exists() else "{}")
    ctx.route("https://tuo-server.example/**", feed_route)
    ctx.route("https://gist.githubusercontent.com/**", feed_route)
    # foto dei piatti (Wikimedia) senza rete: una gif di 1 pixel
    GIF = __import__("base64").b64decode("R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==")
    ctx.route("https://upload.wikimedia.org/**", lambda r: r.fulfill(status=200, content_type="image/gif", body=GIF))
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    # richieste bloccate apposta nelle prove non sono errori dell'app
    page.on("console", lambda m: m.type == "error" and "ERR_FAILED" not in m.text and errors.append(m.text))
    page.goto(URL)

    # onboarding
    shot(page, "01-benvenuto")
    page.click("text=Iniziamo")
    page.click(".tile:has-text('Esselunga')")
    shot(page, "02-supermercato")
    page.click("text=Avanti")
    page.click("[data-a=stp][data-f=pc][data-d='1']")
    shot(page, "03-persone")
    page.click("text=Avanti")
    check("Il tuo profilo" in page.locator("#app").inner_text() and "Mantenere" in page.locator("#app").inner_text(), "benvenuto: profilo di chi usa l'app, con valori neutri")
    shot(page, "03b-profilo")
    page.click("[data-a=profSet][data-f=goal][data-v=gain]")
    page.click("[data-a=profSet][data-f=sex][data-v=m]")
    page.click("text=Avanti")
    page.click("text=Componi tu il menu")
    S = page.evaluate("window.__S()")
    check(S["setup"] and S["pc"] == 2 and S["pp"] == 1, "onboarding salva persone e setup")
    # Schiscetta è indipendente: nel codice dell'app nessuna chiamata a spese.php e nessun «Gruzzolo»
    app_src = (ROOT / "dist" / "schiscetta.html").read_text(encoding="utf-8")
    check("spese.php" not in app_src and "gruzzolo" not in app_src.lower(), "nessuna chiamata a spese.php e nessun «Gruzzolo» nel codice dell'app")
    check(len(S["week"]["slots"]) == 14, f"menu automatico: 14 pasti ({len(S['week']['slots'])})")
    check(S["week"]["start"] == "2026-10-19", "settimana da lunedì 19 ottobre")
    shot(page, "04-menu")
    page.evaluate("window.scrollTo(0, 900)")
    shot(page, "05-menu-giorni")
    page.evaluate("window.scrollTo(0, 0)")

    # cambio un piatto dal picker
    page.click(".slot[data-k='2c'] .nm")
    check("Procedimento" in page.locator(".sheet-panel").inner_text() and page.locator(".sheet-panel [data-a=pick][data-k='2c']").count() == 1,
          "menu: toccando il piatto si apre la ricetta, con «Cambia il piatto»")
    page.evaluate("window.__back()")
    page.click(".slot[data-k='2c'] .slot-chg")
    shot(page, "06-scegli-piatto")
    page.fill("input[data-in=pq]", "risotto")
    rows = page.locator("#pick-list .dish-row .nm").all_inner_texts()
    check(len(rows) >= 3 and all("isotto" in r for r in rows), f"ricerca 'risotto' trova solo i risotti ({len(rows)})")
    page.click("#pick-list .dish-row >> nth=0 >> [data-a=dish]")
    shot(page, "07-dettaglio-piatto")
    page.click(".sheet-panel [data-a=setSlot]")
    S = page.evaluate("window.__S()")
    check(S["week"]["slots"]["2c"]["d"].startswith("risotto"), "piatto scelto messo nella cena di mercoledì")

    # spesa
    page.click(".tab[data-t=spesa]")
    shot(page, "08-spesa")
    total = page.locator(".total-card .big").inner_text()
    check("€" in total, f"totale spesa mostrato: {total}")
    reps = page.locator(".rep-h").count()
    check(reps >= 4 and page.locator(".group .item[data-a=check]").count() == 0, f"spesa: si vedono solo i {reps} reparti, chiusi")
    page.click(".rep-h >> nth=0")
    check(page.locator(".group .item[data-a=check]").count() >= 1, "tocco un reparto e si apre")
    page.click("[data-a=repAll]")
    n_items = page.locator(".group .item[data-a=check]").count()
    check(n_items > 10, f"lista con {n_items} prodotti")
    page.click(".group .item[data-a=check] .check >> nth=0")
    check(page.locator(".group .item.done").count() == 1, "spunta un prodotto")
    page.click(".group .item [data-a=priceSheet] >> nth=1")
    page.fill("#price-in", "0.99")
    shot(page, "09-prezzo")
    page.click("[data-a=savePrice]")
    S = page.evaluate("window.__S()")
    check(any(v == 0.99 for v in S["prices"].get("esselunga", {}).values()), "prezzo personalizzato salvato")
    page.fill("#extra-in", "Caffè 3,50")
    page.click("[data-a=addExtra]")
    S = page.evaluate("window.__S()")
    check(S["week"]["extras"][0]["t"] == "Caffè" and S["week"]["extras"][0]["price"] == 3.5, "extra con prezzo aggiunto")
    page.evaluate("window.scrollTo(0, 99999)")
    shot(page, "10-spesa-fondo")
    page.click("[data-a=marketSheet]")
    page.wait_for_selector(".sheet-panel .tile:has-text('Lidl')")
    page.wait_for_timeout(400)           # la scheda finisce di salire, poi si tocca
    shot(page, "11-supermercati")
    page.locator(".sheet-panel .tile:has-text('Lidl')").dispatch_event("click")     # l'avviso «Prezzo salvato» può coprirla
    page.wait_for_timeout(300)
    total2 = page.locator(".total-card .big").inner_text()
    check(total2 != total, f"cambiando supermercato cambia il totale ({total} -> {total2})")
    page.wait_for_timeout(600)              # la lista si risistema con i prezzi nuovi
    page.locator("[data-a=confirmSheet]").dispatch_event("click")
    page.fill("#spent-in", "41,20")
    shot(page, "12-conferma")
    page.click("[data-a=doConfirm]")
    S = page.evaluate("window.__S()")
    check(S["week"]["status"] == "cook" and S["week"]["spent"] == 41.2, "spesa confermata con importo")
    tr = S["week"]["trips"].get("settimana", {})
    check(tr.get("spent") == 41.2 and tr.get("date") == "2026-10-18", f"spesa del giro segnata con data e importo ({tr})")
    # scheda Spese: la spesa compare con data, negozio, importo e i prodotti comprati
    page.click(".tab[data-t=spesa]")
    page.click("[data-a=spTab][data-v=spese]")
    row = page.locator("[data-a=spesaInfo]").first.inner_text()
    check("41,20" in row and "Lidl" in row and "prodotti" in row, f"scheda Spese: la spesa con data, negozio e importo ({row!r})")
    page.click("[data-a=spesaInfo] >> nth=0")
    check(page.locator(".sheet-panel .item").count() >= 5 and "Stima della lista" in page.locator(".sheet-panel").inner_text(), "dettaglio della spesa: cosa hai comprato e la stima")
    shot(page, "12b-spese")
    page.click(".sheet-panel .icon-btn[data-a=close]")
    page.click(".tab[data-t=stasera]")

    # stasera (oggi = domenica 18: la sera prima, solo schiscetta)
    shot(page, "13-stasera-domenica")
    check(page.locator(".recipe").count() >= 1, "domenica sera c'è la schiscetta di lunedì")
    page.click(".dchip[data-e='0']")
    shot(page, "14-stasera-lunedi")
    btn = page.locator(".timer-btn").first
    if btn.count():
        btn.click()
        check(page.locator(".tm").count() == 1, "timer avviato")
        shot(page, "15-timer")
        page.click(".tm button")
    h = page.evaluate("Math.min(...[...document.querySelectorAll('.recipe ol.steps')].map(o => o.getBoundingClientRect().height / o.children.length))")
    check(h > 40, f"i passi della ricetta sono visibili (altezza media {h:.0f}px)")
    page.click(".steps.tick li >> nth=0")
    check(page.locator(".steps.tick li.done").count() == 1, "passo segnato fatto")
    page.click("[data-a=eveDone]")
    check(page.evaluate("window.__S()")["week"]["done"].get("0") is True, "sera segnata fatta")

    # ricettario e impostazioni
    page.click(".tab[data-t=piatti]")
    shot(page, "16-ricettario")
    page.click(".chip[data-c=veg]")
    vegs = page.locator(".dcard").count()
    check(vegs >= 15, f"filtro vegetariani: {vegs}")
    page.click(".dcard >> nth=0")
    shot(page, "17-ricetta")
    page.click("[data-a=fav]")
    page.click(".sheet-panel .icon-btn[data-a=close]")

    # ricetta personale con un ingrediente nuovo
    page.click(".chip[data-c=all]")
    page.click("[data-a=newRecipe]")
    page.click("[data-a=edSave]")
    check(page.locator(".sheet-panel .tip.warn").count() == 1, "editor: errore se mancano i dati")
    page.fill("input[data-ed=n]", "Pasta al pesto di pistacchi")
    page.click("[data-a=edEmoji][data-v='🍝']")
    page.fill("input[data-ed=att]", "10")
    page.fill("input[data-ed=cott]", "12")
    page.click("[data-a=edSet][data-f=sc][data-v=entrambe]")
    page.click("[data-a=edAddIng]")
    page.fill("input[data-in=ipq]", "pasta corta")
    page.click("#ip-list [data-a=edPickIng] >> nth=0")
    page.fill("input[data-edq='0']", "90")
    page.click("[data-a=edAddIng]")
    page.fill("input[data-in=ipq]", "pistacchi")
    page.click("[data-a=newIngSheet]")
    page.fill("input[data-ni=n]", "Pesto di pistacchi")
    page.click("[data-a=niSet][data-f=r][data-v=secco]")
    page.fill("input[data-ni=conf]", "190")
    page.fill("input[data-ni=p]", "4,50")
    shot(page, "22-nuovo-ingrediente")
    page.click("[data-a=niSave]")
    page.fill("input[data-edq='1']", "40")
    c0 = page.locator("#ed-c0").inner_text()
    check("€" in c0 and "%" in c0, f"editor: costo e percentuale per ingrediente ({c0})")
    check("a porzione" in page.locator("#ed-tot").inner_text(), "editor: costo totale a porzione")
    page.fill("textarea[data-ed=steps]", "Cuoci la pasta (circa 10 min).\nCondisci con il pesto di pistacchi a fuoco spento.")
    shot(page, "23-editor")
    page.click("[data-a=edSave]")
    S = page.evaluate("window.__S()")
    mine = S["custom"]["piatti"]
    check(len(mine) == 1 and mine[0]["tot"] == 22 and len(mine[0]["ing"]) == 2, "ricetta salvata (totale automatico 22')")
    check(len(S["custom"]["ing"]) == 1, "ingrediente nuovo salvato")
    page.click(".chip[data-c=mine]")
    check(page.locator(".dcard").count() == 1, "il filtro «Mie» mostra la ricetta")
    page.click(".dcard >> nth=0")
    shot(page, "24-ricetta-mia")
    page.click("[data-a=addTo]")
    page.click(".sheet-panel [data-a=setSlot][data-k='4c']")
    page.click(".tab[data-t=spesa]")
    row = page.locator(".item:has-text('Pesto di pistacchi')")
    check(row.count() == 1, "l'ingrediente nuovo è nella lista della spesa")
    price_txt = row.locator(".pr").inner_text()
    check("4,50" in price_txt, f"con il prezzo inserito ({price_txt})")
    page.click(".tab[data-t=piatti]")
    page.click(".chip[data-c=mine]")
    page.click(".dcard >> nth=0")
    page.click("[data-a=editRecipe]")
    page.fill("input[data-ed=n]", "Pasta pistacchi e limone")
    page.click("[data-a=edSave]")
    check(page.evaluate("window.__S()")["custom"]["piatti"][0]["n"] == "Pasta pistacchi e limone", "ricetta modificata")
    page.click("[data-a=editRecipe]")
    page.click("[data-a=edDelete]")
    page.click("[data-a=edDelete]")
    S = page.evaluate("window.__S()")
    check(not S["custom"]["piatti"] and "4c" not in S["week"]["slots"], "ricetta eliminata e tolta dal menu")

    page.click("[data-a=settings]")
    shot(page, "18-impostazioni")
    check(page.evaluate("window.__back()") is True and page.locator("#sheet").count() == 0, "indietro chiude il foglio")
    check(page.evaluate("window.__back()") is True, "indietro torna al menu")
    check(page.evaluate("window.__back()") is False, "dal menu indietro esce")

    # scontrino: immagine finta lunga + risposta dell'API simulata (nessuna chiamata vera)
    rec = SHOTS / "_scontrino.png"
    rp = b.new_page(viewport={"width": 420, "height": 2600})
    righe = "".join(f"<div style='display:flex;justify-content:space-between'><span>{t}</span><span>{p}</span></div>"
                    for t, p in [("PASSATA POMODORO 700G", "0,79"), ("BARILLA PENNE RIG.500G", "0,99"), ("ZUCCHINE", ""),
                                 ("  0,486 kg x 1,98 €/kg", "0,96"), ("DETERSIVO PIATTI", "1,49"), ("MOZZARELLA 125G", "0,95")] * 12)
    rp.set_content(f"<body style='font:22px monospace;padding:20px;background:#fff'><h2>ESSELUNGA</h2>{righe}<h2>TOTALE 41,20</h2></body>")
    rp.screenshot(path=str(rec), full_page=True)
    rp.close()
    sent = {}
    fake = {"negozio": "Esselunga", "data": "2026-10-18", "totale": 41.2, "righe": [
        {"testo": "PASSATA POMODORO 700G", "importo": 0.79, "quantita": 1, "unita": "pz", "prezzo_unitario": 0.79, "peso_confezione": 700, "ingrediente": "passata"},
        {"testo": "RUMMO PENNE RIG.500G", "marca": "Rummo", "importo": 1.59, "quantita": 1, "unita": "pz", "prezzo_unitario": 1.59, "peso_confezione": 500, "ingrediente": "pasta_corta"},
        {"testo": "ZUCCHINE", "importo": 0.96, "quantita": 0.486, "unita": "kg", "prezzo_unitario": 1.98, "peso_confezione": 0, "ingrediente": "zucchine"},
        {"testo": "DETERSIVO PIATTI", "importo": 1.49, "quantita": 1, "unita": "pz", "prezzo_unitario": 1.49, "peso_confezione": 0, "ingrediente": ""},
        {"testo": "FUSI DI POLLO", "importo": 2.89, "quantita": 1, "unita": "pz", "prezzo_unitario": 2.89, "peso_confezione": 0, "ingrediente": "fusi_pollo"},
        {"testo": "MOZZARELLA 125G", "importo": 0.95, "quantita": 1, "unita": "pz", "prezzo_unitario": 0.95, "peso_confezione": 125, "ingrediente": "mozzarella"}]}

    def api(route):
        sent["body"] = json.loads(route.request.post_data)
        sent["headers"] = route.request.headers
        route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"},
                      body=json.dumps({"stop_reason": "end_turn", "content": [{"type": "thinking", "thinking": ""}, {"type": "text", "text": json.dumps(fake)}]}))
    page.route("https://api.anthropic.com/v1/messages", api)
    page.evaluate("(() => { const s = window.__S(); s.apiKey = 'sk-ant-test'; s.market = 'esselunga'; localStorage.setItem('schiscetta.v1', JSON.stringify(s)); })()")
    page.reload()
    page.click(".tab[data-t=spesa]")
    page.click("[data-a=receiptSheet]")
    page.set_input_files("input[data-ch=receiptFile]", str(rec))
    page.wait_for_selector("[data-a=rcApply]", timeout=15000)
    shot(page, "25-scontrino")
    body = sent.get("body", {})
    imgs = [c for c in body["messages"][0]["content"] if c["type"] == "image"]
    check(body.get("model") == "claude-opus-5-5" and body["output_config"]["format"]["type"] == "json_schema", "richiesta: modello e output strutturato")
    check(len(imgs) >= 2, f"scontrino lungo tagliato in {len(imgs)} parti")
    check(sent["headers"].get("x-api-key") == "sk-ant-test" and "anthropic-dangerous-direct-browser-access" in sent["headers"], "richiesta: intestazioni")
    check(page.locator(".sheet-panel .item[data-a=rcSel]").count() == 5, "5 righe abbinate, il detersivo no")
    # correzione a mano: una riga non usata si abbina a un ingrediente, poi si toglie di nuovo
    page.click(".sheet-panel [data-a=rcFix]:has-text('DETERSIVO')")
    page.fill("input[data-in=rfq]", "pane")
    page.click("[data-a=rcSet][data-i=pane]")
    check(page.locator(".sheet-panel .item[data-a=rcSel]").count() == 6, "correzione a mano: «DETERSIVO PIATTI» abbinato al pane diventa una riga della spesa")
    page.click(".sheet-panel .item:has-text('DETERSIVO') [data-a=rcFix]")
    page.click("[data-a=rcSet][data-i='']")
    check(page.locator(".sheet-panel .item[data-a=rcSel]").count() == 5, "«Non è un ingrediente» la toglie di nuovo")
    w = page.locator(".sheet-panel input[data-ch=rcW]")
    check(w.count() == 1 and int(w.input_value() or 0) > 200, f"fusi di pollo senza peso sullo scontrino: peso stimato dal prezzo ({w.input_value() if w.count() else None} g)")
    check("buoni_eur" not in json.dumps(body["output_config"]["format"]), "lo schema dello scontrino non chiede più i buoni pasto")
    page.click("[data-a=rcHome][data-v=avanzi]")        # questo test tiene il menu
    page.click("[data-a=rcApply]")
    S = page.evaluate("window.__S()")
    pz = S["prices"]["esselunga"]
    check(pz.get("passata") == 0.79 and pz.get("zucchine") == 1.98 and pz.get("mozzarella") == 0.95, f"prezzi aggiornati dallo scontrino ({pz.get('passata')}, {pz.get('zucchine')}, {pz.get('mozzarella')})")
    check(S["week"]["spent"] == 41.2, "totale dello scontrino come spesa")
    tr = S["week"]["trips"].get("settimana", {})
    check(tr.get("spent") == 41.2 and tr.get("fonte") == "scontrino" and len(S["week"]["trips"]) == 1, f"lo scontrino aggiorna la spesa del giro, non ne crea un'altra ({tr})")
    ch = S.get("choice", {}).get("esselunga", {}).get("pasta_corta", "")
    nm = page.evaluate("(() => { const o = window.DATA.feeds.esselunga.prices.pasta_corta.opts.find(x => x.c === %s); return o ? o.n : ''; })()" % json.dumps(ch))
    check("Rummo" in nm, f"dallo scontrino la pasta diventa Rummo ({nm})")

    # costo degli ingredienti nel piatto e impatto del cambio di marca
    page.click(".tab[data-t=piatti]")
    page.fill("input[data-in=cq]", "pomodoro e basilico")
    page.click(".dcard >> nth=0")
    li = page.locator(".sheet-panel .cost-list li")
    check(li.count() >= 5 and "%" in li.first.inner_text(), f"piatto: costo e % per {li.count()} ingredienti")
    tot0 = page.locator(".sheet-panel .card:not(.nutcard) .badge.num").first.inner_text()
    page.click(".sheet-panel .cost-list li:has-text('Pasta corta')")
    imp = page.locator(".sheet-panel .impact")
    check(imp.count() >= 5, f"impatto sul piatto mostrato per {imp.count()} prodotti")
    shot(page, "28-impatto-marca")
    page.click(".sheet-panel [data-a=pickOpt]:has(.impact.up) >> nth=-1")
    tot1 = page.locator(".sheet-panel .card:not(.nutcard) .badge.num").first.inner_text()
    check(tot1 != tot0, f"cambiando marca cambia il costo del piatto ({tot0} -> {tot1})")
    shot(page, "29-costi-piatto")
    page.click(".sheet-panel .icon-btn[data-a=close]")
    page.fill("input[data-in=cq]", "")

    # quantità personalizzata: pasta da 90 a 120 g in una ricetta
    page.click(".tab[data-t=piatti]")
    page.fill("input[data-in=cq]", "pomodoro e basilico")
    page.click(".dcard >> nth=0")
    c0 = page.locator(".sheet-panel .card:not(.nutcard) .badge.num").first.inner_text()
    page.click(".sheet-panel .cost-list li:has-text('Pasta corta') [data-a=qtySheet]")
    page.fill("#qty-in", "120")
    check("passa da" in page.locator("#qty-impact").inner_text(), "quantità: mostra quanto cambia il costo del piatto")
    shot(page, "30-quantita")
    page.click("[data-a=qtySave][data-all='']")
    c1 = page.locator(".sheet-panel .card:not(.nutcard) .badge.num").first.inner_text()
    S = page.evaluate("window.__S()")
    check(S["qty"].get("pasta_pomodoro", {}).get("pasta_corta") == 120 and c1 != c0, f"pasta a 120 g solo in questa ricetta ({c0} -> {c1})")
    page.click(".sheet-panel .icon-btn[data-a=close]")
    page.fill("input[data-in=cq]", "")

    # sfizio: Coca-Cola per la cena di lunedì (catalogo e prezzo simulati)
    page.click(".tab[data-t=menu]")
    page.click(".sfizio-chip.add >> nth=1")
    page.click("[data-a=spQuick] >> nth=0")
    page.wait_for_selector("#sp-list [data-a=spPick]")
    shot(page, "31-cerca-sfizio")
    page.click("#sp-list [data-a=spPick] >> nth=0")
    page.wait_for_timeout(500)
    S = page.evaluate("window.__S()")
    sf = [x for v in S["week"]["sfizi"].values() for x in v]
    check(len(sf) == 1 and sf[0]["q"] == 330, f"sfizio aggiunto: una lattina da 330 ml ({sf})")
    check(page.locator(".sfizio-chip:not(.add)").count() == 1, "lo sfizio compare sotto il pasto")
    shot(page, "32-menu-sfizio")
    page.click(".tab[data-t=spesa]")
    open_reps(page)
    check(page.locator(".group:has-text('Bevande, dolci e snack') .item:has-text('COCA-COLA')").count() == 1, "lo sfizio è nella lista della spesa")
    page.locator(".item:has(.left:has-text('🏷️')) [data-a=priceSheet]").first.click()     # un prodotto con le marche online (il menu cambia a ogni prova)
    check(page.locator(".sheet-panel .impact:has-text('sul menu')").count() >= 2, "dalla spesa: impatto della marca sul menu della settimana")
    shot(page, "33-impatto-menu")
    page.click(".sheet-panel .icon-btn[data-a=close]")

    # pagina «I miei prodotti»
    page.click(".tab[data-t=spesa]")
    page.click("button[data-a=productsSheet]")
    n_rows = page.locator(".sheet-panel [data-a=priceSheet]").count()
    check(n_rows > 80, f"I miei prodotti: {n_rows} ingredienti")
    page.fill("input[data-in=prodq]", "rummo")
    rows = page.locator(".sheet-panel #prod-list [data-a=priceSheet]")
    check(rows.count() >= 2, f"ricerca «rummo»: {rows.count()} ingredienti")
    shot(page, "27-miei-prodotti")
    page.click(".sheet-panel #prod-list .item:has-text('Spaghetti')")
    page.click(".sheet-panel [data-a=pickOpt]:has-text('Rummo') >> nth=0")
    S = page.evaluate("window.__S()")
    check(S["choice"]["esselunga"].get("spaghetti"), "spaghetti Rummo scelti da «I miei prodotti»")
    check(page.locator(".sheet-panel #prod-list").count() == 1, "dopo la scelta si torna alla pagina prodotti")
    page.click(".sheet-panel .icon-btn[data-a=close]")
    page.unroute("https://api.anthropic.com/v1/messages")

    # scelta della marca: pasta Rummo invece della scelta automatica (se il file prezzi ha le alternative)
    has_opts = page.evaluate("(() => { const f = window.DATA.feeds.esselunga; return !!(f && f.prices.pasta_corta && f.prices.pasta_corta.opts && f.prices.pasta_corta.opts.length >= 3); })()")
    if has_opts:
        page.click(".tab[data-t=menu]")
        page.locator("[data-a=pick][data-k='5c']").first.click()
        page.click("[data-a=pf][data-c=primo]")
        page.click("#pick-list .dish-row:has-text('Penne all') [data-a=setSlot]")
        page.click(".tab[data-t=spesa]")
        page.click(".item:has-text('Pasta corta') [data-a=priceSheet]")
        n_opts = page.locator(".sheet-panel [data-a=pickOpt]").count()
        check(n_opts >= 4, f"pasta corta: {n_opts - 1} prodotti tra cui scegliere")
        shot(page, "26-scegli-marca")
        opt = page.locator(".sheet-panel [data-a=pickOpt] >> nth=3")
        chosen = opt.locator(".left").inner_text().split(" · ")[0]
        opt.click()
        row = page.locator(".item:has-text('Pasta corta')").first.inner_text()
        check(chosen[:20] in row, f"la lista mostra il prodotto scelto ({chosen[:40]})")
        S = page.evaluate("window.__S()")
        check(S["choice"]["esselunga"].get("pasta_corta"), "scelta salvata")
    else:
        print("     (salto la scelta della marca: il file prezzi non ha ancora le alternative)")

    # tema scuro
    page.emulate_media(color_scheme="dark")
    page.reload()
    shot(page, "19-menu-scuro")
    page.click(".tab[data-t=stasera]")
    page.click(".dchip[data-e='1']")
    shot(page, "20-stasera-scuro")
    page.click(".tab[data-t=spesa]")
    shot(page, "21-spesa-scuro")

    # Coop letta dal telefono: Native.http finto che risponde con le ricerche EasyCoop registrate (tools/fixture_coop.py)
    fx = (ROOT / "tools" / "fixtures" / "coop.json").read_text(encoding="utf-8")
    r = page.evaluate("""async (fx) => {
      const F = JSON.parse(fx); let calls = 0;
      window.__phoneDelay = 0;
      window.Native = Object.assign(window.Native || {}, { metered: () => false, http: (id, method, url, headers, body) => {
        calls++; const q = JSON.parse(JSON.parse(body).query.match(/search:("(?:[^"\\\\]|\\\\.)*")/)[1]);
        setTimeout(() => window.__http(id, F[q] ? 200 : 500, F[q] || ''), 0); } });
      const S = window.__S(), {readPhoneChain, price} = window.__test;
      S.market = 'coop'; S.feeds = S.feeds || {}; delete S.feeds.coop;
      const t0 = Date.now(); await readPhoneChain('coop', false);
      const f = S.feeds.coop; if (!f) return {calls, n: 0};
      const pasta = f.prices.pasta_corta, carote = f.prices.carote;
      return {calls, n: Object.keys(f.prices).length, missing: f.missing.length,
              pasta: pasta && [pasta.prod, pasta.p, pasta.opts.length, [...new Set(pasta.opts.map(o => o.b))].slice(0, 6)],
              carote: carote ? carote.opts.map(o => o.n) : [], price: price('pasta_corta'), s: (Date.now() - t0) / 1000};
    }""", fx)
    print("   coop dal telefono:", json.dumps(r, ensure_ascii=False)[:900])
    check(r["n"] >= 60, f"Coop dal telefono: almeno 60 ingredienti con prezzo vero ({r['n']})")
    check(bool(r.get("pasta")) and r["pasta"][2] >= 5, "Coop: pasta con più marche tra cui scegliere")
    check(not any("purina" in n.lower() for n in r["carote"]), "Coop: niente cibo per animali tra le carote")
    page.evaluate("window.__S().market = 'esselunga'; window.__test.save()")

    # Iperal letto dal telefono con la sessione di chi è entrato (ricerche vere registrate, prezzi stimati: tools/fixture_iperal.py)
    fx = (ROOT / "tools" / "fixtures" / "iperal.json").read_text(encoding="utf-8")
    r = page.evaluate("""async (fx) => {
      const F = JSON.parse(fx); window.__phoneDelay = 0; window.__cart = null;
      window.Native = Object.assign(window.Native || {}, { metered: () => false, iperalOpen() {}, iperalCart: j => { window.__cart = JSON.parse(j); },
        http: (id, method, url) => {
          if (/products\/\d+$/.test(url)) return setTimeout(() => window.__http(id, 200, JSON.stringify({data: {metaData: {product_description: {nutritional_values:
            '<table><tr><td>Energia</td><td>147 kJ - 35 kcal</td></tr><tr><td>Proteine</td><td>1,2 g</td></tr></table>'}}}})), 0);
          const q = decodeURIComponent(url.match(/[?&]q=([^&]*)/)[1]);
          let t = F[q] || '';
          if (t && window.__noPrice) { const j = JSON.parse(t); j.data.products.forEach(p => delete p.price); t = JSON.stringify(j); }
          setTimeout(() => window.__http(id, t ? 200 : 500, t ? '   ' + t : ''), 0); } });
      const S = window.__S(), T = window.__test;
      S.market = 'iperal'; S.iperalOk = true; S.feeds = S.feeds || {}; delete S.feeds.iperal;
      await T.readPhoneChain('iperal', false);
      const f = S.feeds.iperal; if (!f) return {n: 0};
      await T.loadNutrition();
      const out = T.iperalItems(), ban = f.prices.banane, nut = Object.keys(S.nutr || {}).length, img = (T.catItem('passata') || {}).img || '';
      return {n: Object.keys(f.prices).length, items: out.items.length, miss: out.miss.length, first: out.items.slice(0, 3),
              ban: ban && ban.opts.filter(o => o.sf).map(o => [o.n, o.sf, o.p]).slice(0, 2), bad: out.items.filter(i => !(i.id > 0 && i.q > 0)).length, nut, img};
    }""", fx)
    print("   iperal dal telefono:", json.dumps(r, ensure_ascii=False)[:600])
    check(r["n"] >= 60, f"Iperal: almeno 60 ingredienti con prodotto e prezzo del punto vendita ({r['n']})")
    check(r["items"] >= 10 and r["bad"] == 0, f"Iperal: lista della spesa → carrello con codici e quantità ({r['items']} prodotti, {r['miss']} a mano)")
    check(r["img"].startswith("https://www.iperalspesaonline.it/photo/"), f"Iperal: foto del prodotto dal catalogo ({r['img'][:60]})")
    check(r["nut"] >= 5 and page.evaluate("window.__S().nutr.passata.kcal") == 35, f"Iperal: kcal e proteine dall'etichetta del prodotto ({r['nut']} ingredienti)")
    r2 = page.evaluate("""async () => { const S = window.__S(), T = window.__test; window.__noPrice = true; S.iperalOk = false; delete S.feeds.iperal; S.cat = {};
      await T.readPhoneChain('iperal', false); window.__noPrice = false;
      return {feed: !!S.feeds.iperal, cat: Object.keys(S.cat.iperal || {}).length, log: S.phoneLog.iperal}; }""")
    check(not r2["feed"] and r2["cat"] >= 60 and r2["log"]["ok"], f"Iperal senza account: niente prezzi, ma prodotti e foto sì ({r2['cat']}, {r2['log']['msg']})")
    page.evaluate("async () => { window.__noPrice = false; window.__S().iperalOk = true; await window.__test.readPhoneChain('iperal', false); }")
    page.click(".tab[data-t=spesa]")
    page.click("[data-a=iperalCart]")
    cart = page.evaluate("window.__cart")
    check(isinstance(cart, list) and len(cart) == r["items"], "«Metti tutto nel carrello Iperal» manda la lista all'app")
    page.evaluate("window.__iperalCart(JSON.stringify({ok: true, n: 12}))")
    check("carrello Iperal" in page.locator("#toast").inner_text(), "carrello Iperal pronto: avviso con la fascia di ritiro da scegliere")
    shot(page, "22b-iperal")
    page.evaluate("window.__S().market = 'esselunga'; window.__test.save()")

    # database delle ricette dal server: una versione più nuova con un piatto in più
    subprocess.run([sys.executable, str(ROOT / "tools" / "pubblica_ricette.py"), "--solo-file"], check=True, capture_output=True)
    db = json.loads((ROOT / "dist" / "ricette.json").read_text(encoding="utf-8"))
    db["versione"] = "2099-01-01T00:00:00"
    db["piatti"].append({"id": "test_nuovo", "n": "Piatto nuovo dal server", "e": "🍝", "cat": "primo", "att": 5, "cott": 10, "tot": 15, "sc": "calda", "veg": True,
                         "ing": [["pasta_corta", 100], ["olio", 10]], "steps": ["Cuoci la pasta.", "Condisci con l'olio."]})
    RICETTE[0] = json.dumps(db, ensure_ascii=False)
    # senza data/prezzi/gist.txt (copia pubblica) l'app non ha indirizzi da cui scaricare le ricette
    if (ROOT / "data" / "prezzi" / "gist.txt").exists():
        n0 = page.evaluate("window.__test.allCount()")
        page.evaluate("window.__test.refreshRecipes()")
        page.wait_for_timeout(300)
        n1 = page.evaluate("window.__test.allCount()")
        check(n1 == n0 + 1, f"ricette nuove scaricate dal server ({n0} -> {n1})")
        page.reload()
        check(page.evaluate("window.__test.allCount()") == n1, "le ricette scaricate restano dopo il riavvio")
    RICETTE[0] = None
    page.evaluate("localStorage.removeItem('schiscetta.ricette')")

    # calorie, porzioni e menu salvati
    page.evaluate("localStorage.setItem('schiscetta.v1', JSON.stringify({setup:true,pc:1,pp:1,market:'esselunga',week:{start:'2026-10-19',slots:{}}}))")
    page.reload()
    page.click("[data-a=autoSheet]"); page.click("[data-a=autofill][data-m=equilibrato]")
    nut = page.locator(".slot .meta.nut")
    check(nut.count() >= 10 and "kcal" in nut.first.inner_text(), f"kcal su ogni pasto del menu ({nut.count()})")
    check(page.locator(".slot .comp").count() >= 3, "complementi (pane, frutta…) per arrivare alle kcal del pasto")
    shot(page, "30-menu-calorie")
    page.click("[data-a=settings]")
    txt = page.locator(".sheet-panel").inner_text()
    check("kcal al giorno" in txt and "Calorie e porzioni" in txt, "impostazioni: calcolo delle kcal dal profilo")
    page.locator("[data-ch=prof][data-f=age]").fill("40")
    page.locator("[data-ch=prof][data-f=age]").dispatch_event("change")
    check(page.evaluate("window.__S().profile.age") == 40, "l'età si salva nel profilo")
    page.locator("[data-ch=prof][data-f=age]").scroll_into_view_if_needed()
    shot(page, "31-profilo-calorie")
    page.evaluate("window.__back()")
    before = page.evaluate("JSON.stringify(window.__S().week.slots)")
    page.click("[data-a=saveMenuSheet]")
    page.fill("#menu-name", "Settimana di prova")
    page.click("[data-a=saveMenu]:not([data-id])")
    page.click("[data-a=clearAsk]"); page.click(".sheet-panel [data-a=clear]")
    check(page.evaluate("Object.keys(window.__S().week.slots).length") == 0, "menu svuotato")
    page.click("[data-a=savedSheet]")
    shot(page, "32-menu-salvati")
    check("Settimana di prova" in page.locator(".sheet-panel").inner_text(), "il menu salvato compare nell'elenco con il nome")
    page.click("[data-a=useMenu]")
    after = page.evaluate("JSON.stringify(window.__S().week.slots)")
    used = page.evaluate("window.__S().saved[0].used")
    check(before == after and used == "2026-10-19", f"menu salvato riapplicato e data di ultimo uso ({used})")

    # spesa per pochi giorni
    page.click(".tab[data-t=spesa]")
    page.click("[data-a=repAll]")
    full = page.locator(".total-card .big").inner_text()
    n_full = page.locator("[data-a=check]").count()
    page.click("[data-a=winDays][data-v='3']")
    page.click("[data-a=winFrom][data-v='0']")
    part = page.locator(".total-card .big").inner_text()
    n_part = page.locator("[data-a=check]").count()
    shot(page, "33-spesa-3-giorni")
    check(n_part < n_full and part != full, f"spesa per 3 giorni: meno prodotti ({n_part} su {n_full}), totale {part} invece di {full}")
    page.locator("[data-a=check]").first.click()
    page.click("[data-a=confirmSheet]"); page.click("[data-a=doConfirm]")
    page.click(".tab[data-t=spesa]")
    check(page.locator("[data-a=winNext]").count() == 1, "dopo la spesa di 3 giorni c'è «Prossima spesa»")
    page.click("[data-a=winNext]")
    W = page.evaluate("window.__S().week.win")
    ck = page.locator(".item.done[data-a=check]").count()
    check(W["from"] == 3 and ck == 0, f"la prossima spesa parte da giovedì con la lista pulita (da {W['from']}, spunte {ck})")

    # ingrediente senza prezzi veri: si cerca la marca nel catalogo (cerca.php e prodotto.php finti)
    page.evaluate("const S = window.__S(); S.market = 'esselunga'; delete (S.prices.esselunga || {}).pelati; window.__test.save()")
    page.click(".tab[data-t=piatti]")
    page.fill("input[data-in=cq]", "amatriciana")
    page.click("[data-a=dish][data-id=amatriciana]")
    page.click(".sheet-panel .cost-list li:has-text('Pomodori pelati')")
    check(page.locator("[data-a=spOpen][data-mode=brand]").count() == 1, "ingrediente senza marche online: c'è «Cerca la marca nel catalogo»")
    page.click("[data-a=spOpen][data-mode=brand]")
    page.wait_for_selector("[data-a=spPick]")
    page.click("[data-a=spPick] >> nth=0")
    page.wait_for_timeout(300)
    S = page.evaluate("window.__S()")
    check(S["prices"]["esselunga"].get("pelati", 0) > 0 and "COCA" in S["brandNote"]["esselunga"].get("pelati", ""), f"marca scelta dal catalogo salvata con il suo prezzo ({S['prices']['esselunga'].get('pelati')})")
    page.evaluate("window.__back(); window.__back()")
    page.fill("input[data-in=cq]", "")
    # prodotti per la casa nella lista, dal catalogo
    page.click(".tab[data-t=spesa]")
    n0 = page.evaluate("window.__S().week.extras.length")
    page.click("[data-a=spOpen][data-mode=extra]")
    page.click("[data-a=spQuick][data-q=dentifricio]")
    page.wait_for_selector("[data-a=spPick]")
    page.click("[data-a=spPick] >> nth=0")
    page.wait_for_timeout(300)
    ex = page.evaluate("window.__S().week.extras")
    check(len(ex) == n0 + 1 and ex[-1]["price"] == 8.75 and ex[-1].get("m") == "esselunga", f"prodotto per la casa aggiunto alla lista con il prezzo ({ex[-1] if ex else None})")
    shot(page, "39-casa")
    # foto dei prodotti nella lista della spesa (lette una volta e ricordate)
    open_reps(page)
    page.wait_for_timeout(800)
    np = page.locator(".group .item .emo.pimg img").count()
    check(np >= 5 and len(page.evaluate("window.__S().pimg") or {}) >= 5, f"lista della spesa: i prodotti hanno la foto ({np})")
    shot(page, "39a-foto-spesa")
    # scrivendo nel campo «Altro da comprare» compaiono i prodotti del supermercato con marca e prezzo
    page.fill("#extra-in", "deodorante")
    page.wait_for_selector("#extra-sug [data-a=exPick] .num")
    sug = page.locator("#extra-sug [data-a=exPick]").first.inner_text()
    check("8,75" in sug and "Coca-Cola" in sug, f"proposte dal catalogo con marca e prezzo ({sug!r})")
    check(page.locator("#extra-sug [data-a=exPick] .emo img").count() >= 1, "proposte dal catalogo con la foto del prodotto")
    shot(page, "39b-proposte")
    page.click("#extra-sug [data-a=exPick] >> nth=0")
    page.wait_for_timeout(300)
    ex = page.evaluate("window.__S().week.extras")
    check(len(ex) == n0 + 2 and ex[-1]["price"] == 8.75 and page.locator("#extra-sug [data-a=exPick]").count() == 0, "proposta scelta: in lista con il prezzo, proposte chiuse")
    check(ex[-1].get("img", "").startswith("data:") and page.locator(".item .emo img").count() >= 1, "in lista il prodotto ha la sua foto")

    # foto del piatto in cima alla ricetta, con autore e licenza
    if page.evaluate("!!(window.__test.dish('carbonara') || {}).img"):
        page.click(".tab[data-t=piatti]")
        page.click(".dcard[data-id=carbonara]")
        page.wait_for_timeout(300)
        check(page.locator(".sheet-panel .dhero img").count() == 1 and "Wikimedia Commons" in page.locator(".sheet-panel .credit").inner_text(), "ricetta con la foto del piatto e i crediti")
        check(page.locator(".dcard[data-id=carbonara] .emo img").count() == 1, "foto anche nell'elenco delle ricette")
        shot(page, "39c-foto-ricetta")
        page.click(".sheet-panel .icon-btn[data-a=close]")
    else:
        check(False, "la carbonara ha la sua foto")

    # 👍 su un piatto non da schiscetta: nel filtro «Mi piacciono» del pranzo c'è lo stesso
    page.evaluate("const S = window.__S(); S.favs = { cacio_pepe: true }; window.__test.save()")
    page.click(".tab[data-t=menu]")
    page.locator("[data-a=pick][data-k='2p']").first.click()
    page.click("[data-a=pf][data-c=fav]")
    rows = page.locator("#pick-list .dish-row .nm").all_inner_texts()
    check(any("Cacio e pepe" in r for r in rows), f"pranzo, filtro 👍: compare anche il piatto non da schiscetta ({rows})")
    page.click("[data-a=pf][data-c=all]")
    page.evaluate("window.__back()")

    # 👎: mai nel menu automatico
    page.evaluate("""() => { const S = window.__S(); S.dislikes = {}; for (const p of ['pasta_pomodoro', 'amatriciana', 'cacio_pepe', 'pizzoccheri', 'gricia']) S.dislikes[p] = true; window.__test.save(); }""")
    bad = 0
    for k in range(3):
        page.evaluate("const S = window.__S(); S.week.slots = {}; window.__test.save()")
        page.click(".tab[data-t=menu]")
        page.reload()
        page.click("[data-a=autoSheet]"); page.click("[data-a=autofill][data-m=equilibrato]")
        bad += page.evaluate("Object.values(window.__S().week.slots).filter(s => s && window.__S().dislikes[s.d]).length")
    check(bad == 0, f"i piatti con 👎 non entrano mai nel menu automatico ({bad})")
    page.evaluate("const S = window.__S(); S.dislikes = {}; window.__test.save()")

    # importo corretto a mano (con le cose fuori lista) e «Annulla»
    page.evaluate("""() => { const S = window.__S(); S.week.status = 'cook'; S.week.win = { days: 0, from: 0 };
      S.week.trips = { settimana: { date: '2026-10-18', spent: 30 } }; S.week.spent = 30; window.__test.save(); }""")
    page.reload()
    page.click(".tab[data-t=spesa]")
    page.click("[data-a=confirmSheet][data-edit='1']")
    page.fill("#spent-in", "")
    page.type("#spent-in", "250")
    page.fill("#spent-date", "2026-10-17")
    diff = page.locator("#spent-diff").inner_text()
    page.click("[data-a=doConfirm]")
    page.wait_for_timeout(300)
    tr = page.evaluate("window.__S().week.trips.settimana")
    tip = page.locator(".tip.green").first.inner_text()
    shot(page, "37-spesa-fuori-lista")
    check(tr.get("spent") == 250 and tr.get("date") == "2026-10-17" and "fuori lista" in diff and "fuori lista" in tip,
          f"importo modificato con data e cose fuori lista ({tr}; {diff})")
    page.click("[data-a=undoShop]")
    page.wait_for_timeout(300)
    S = page.evaluate("window.__S()")
    check(S["week"]["status"] == "plan" and not S["week"]["trips"].get("settimana"), "annullata: la spesa torna da fare")
    page.click("[data-a=settings]")
    check("gruzzolo" not in page.locator(".sheet-panel").inner_text().lower(), "impostazioni senza collegamenti esterni per le spese")
    page.evaluate("window.__back()")

    # «Ho fatto la spesa» per sbaglio: l'avviso ha «Annulla»
    page.click(".tab[data-t=spesa]")
    page.click("[data-a=confirmSheet]")
    page.fill("#spent-in", "33")
    page.click("[data-a=doConfirm]")
    page.wait_for_timeout(300)
    page.click("#toast [data-a=undoShop]")
    page.wait_for_timeout(300)
    S = page.evaluate("window.__S()")
    check(S["week"]["status"] == "plan" and not S["week"]["trips"].get("settimana"), "annulla dall'avviso: di nuovo da fare")
    page.click(".tab[data-t=menu]")

    # marca del supermercato di default
    o = page.evaluate("(() => { const S = window.__S(); S.market = 'esselunga'; delete (S.choice.esselunga || {}).pasta_corta; return window.__test.chosenOpt('pasta_corta'); })()")
    check(o and (o.get("b") in ("Esselunga", "Smart")) and not o.get("chosen"), f"in automatico la pasta è quella Esselunga ({o and o.get('n')})")
    o2 = page.evaluate("(() => { const S = window.__S(); S.storeBrand = false; const o = window.__test.chosenOpt('pasta_corta'); S.storeBrand = true; return o; })()")
    check(o2 and o2.get("n") != o.get("n"), f"spegnendo l'opzione torna il predefinito ({o2 and o2.get('n')})")

    # allergie e ingredienti che non mangi
    page.click("[data-a=settings]")
    page.click("[data-a=allergySheet]")
    page.click("[data-a=allergyToggle][data-k=crostacei]")
    page.fill("input[data-in=alq]", "cipoll")
    page.click("#al-list [data-a=noIngToggle] >> nth=0")
    shot(page, "35-allergie")
    S = page.evaluate("window.__S()")
    check(S.get("allergie", {}).get("crostacei") and S.get("noIng", {}).get("cipolla"), "allergia e ingrediente escluso salvati")
    page.evaluate("window.__back(); window.__back()")
    page.click("[data-a=autoSheet][data-redo='1']")
    page.click("[data-a=autofill][data-m=equilibrato]")
    bad = page.evaluate("""() => { const S = window.__S(); return Object.values(S.week.slots).filter(s => s && s.d).map(s => s.d)
      .filter(id => { const p = window.__test.dish(id); return p.ing.some(([i]) => i === 'cipolla' || i === 'gamberetti'); }); }""")
    check(not bad, f"nel menu automatico niente cipolla né gamberetti ({bad})")
    page.click(".tab[data-t=piatti]")
    check("ricette nascoste" in page.locator("main").inner_text(), "il ricettario dice quante ricette sono nascoste")
    page.evaluate("const S = window.__S(); S.allergie = {}; S.noIng = {}; window.__test.save()")
    page.click(".tab[data-t=menu]")

    # tipi di menu: leggero (stomaco delicato) e proteico
    page.click(".tab[data-t=menu]")
    page.click("[data-a=autoSheet][data-redo='1']")
    shot(page, "34-tipi-di-menu")
    page.click("[data-a=autofill][data-m=leggero]")
    ids = page.evaluate("Object.values(window.__S().week.slots).filter(s => s && s.d).map(s => s.d)")
    heavy = [i for i in ids if not page.evaluate(f"window.__test.light('{i}')")]
    check(len(ids) >= 12 and not heavy, f"menu leggero: {len(ids)} piatti, tutti adatti allo stomaco delicato ({heavy})")
    page.click("[data-a=autoSheet][data-redo='1']")
    page.click("[data-a=autofill][data-m=proteico]")
    pr = page.evaluate("Object.values(window.__S().week.slots).filter(s => s && s.d).map(s => window.__test.prot(s.d))")
    page.click("[data-a=autoSheet][data-redo='1']")
    page.click("[data-a=autofill][data-m=equilibrato]")
    pe = page.evaluate("Object.values(window.__S().week.slots).filter(s => s && s.d).map(s => window.__test.prot(s.d))")
    check(sum(pr) / len(pr) > sum(pe) / len(pe) + 3, f"menu proteico: più proteine a piatto ({sum(pr) / len(pr):.0f} g contro {sum(pe) / len(pe):.0f} g)")

    # statistiche su molti menu automatici (1 persona, 1 schiscetta)
    stats = page.evaluate("""() => {
      const out = [];
      for (let k = 0; k < 40; k++) {
        localStorage.setItem('schiscetta.v1', JSON.stringify({setup: true, pc: 1, pp: 1, market: 'esselunga', week: {start: '2026-10-19', slots: {}}}));
        out.push(k);
      }
      return out.length;
    }""")
    res = []
    for k in range(12):
        page.evaluate("localStorage.setItem('schiscetta.v1', JSON.stringify({setup:true,pc:1,pp:1,market:'esselunga',week:{start:'2026-10-19',slots:{}}}))")
        page.reload()
        page.click("[data-a=autoSheet]"); page.click("[data-a=autofill][data-m=equilibrato]")
        S = page.evaluate("window.__S()")
        slots = S["week"]["slots"]
        dishes = [v.get("d") for v in slots.values() if v.get("d")]
        lefts = sum(1 for v in slots.values() if v.get("left"))
        warn = page.locator(".warnline").count()
        tot = page.locator(".hero .big").inner_text()
        res.append((tot, len(dishes), len(set(dishes)), lefts, warn))
    for r in res: print("   menu auto:", r)
    check(all(r[1] == r[2] for r in res), "nessun piatto ripetuto nei menu automatici (avanzi a parte)")
    check(all(r[3] <= 1 for r in res), "al massimo un avanzo a settimana nei menu automatici")
    check(all(r[4] == 0 for r in res), "nessun deperibile in fondo alla settimana nei menu automatici")

    # Google Wallet: pagamenti letti dal telefono (Native finto, come WalletStore.java) -> spesa del giro
    pw = ctx.new_page()
    pw.on("pageerror", lambda e: errors.append(str(e)))
    pw.add_init_script("""
      window.__wl = []; window.__wlCalls = [];
      const st = (pay, s) => { const x = window.__wl.find(i => i.pay === pay); if (x) x.stato = s; window.__wlCalls.push(s + ':' + pay); };
      window.Native = { share() {}, keepScreenOn() {}, setDark() {}, setReminder() {}, askNotifications() {}, startTimer() {}, cancelTimer() {},
        walletList: () => JSON.stringify(window.__wl.filter(i => i.stato === 'attesa' || i.stato === 'si')),
        walletDone: pay => st(pay, 'fatto'), walletNo: pay => st(pay, 'no'), walletEnabled: () => true, walletSettings() {},
        appVersion: () => '{"code":19,"name":"1.19"}', canInstall: () => true, allowInstall() {}, update: url => { window.__updUrl = url; } };""")
    pw.goto(URL)
    pw.evaluate("""() => { localStorage.setItem('schiscetta.v1', JSON.stringify({setup: true, pc: 1, pp: 1, market: 'esselunga', gzToken: 'tok-prova', gzOn: true,
      week: {start: '2026-10-19', slots: {'0c': {d: 'pasta_pomodoro'}, '1c': {d: 'pasta_pesto'}}}})); }""")
    pw.reload()
    check(not any(k in pw.evaluate("window.__S()") for k in ("gzToken", "gzOn", "gzQ")), "al primo avvio il vecchio codice e la coda di invio spariscono")
    W1 = {"pay": "pay_1792059313000_5230", "ts": 1792059313000, "date": "2026-10-18", "negozio": "ESSELUNGA VIALE PIAVE", "totale": 52.3, "stato": "attesa"}
    pw.evaluate("w => { window.__wl.push(w); window.__wallet(); }", W1)
    check(pw.locator(".sheet-panel [data-a=walletYes]").count() == 1 and "52,30" in pw.locator(".sheet-panel").inner_text(), "Wallet: la spesa al supermercato viene proposta")
    shot(pw, "38-wallet")
    pw.click("[data-a=walletYes]")
    pw.wait_for_timeout(300)
    S = pw.evaluate("window.__S()")
    tr = S["week"]["trips"].get("settimana", {})
    check(tr.get("spent") == 52.3 and tr.get("date") == "2026-10-18" and tr.get("fonte") == "wallet" and S["week"]["status"] == "cook" and "fatto:" + W1["pay"] in pw.evaluate("window.__wlCalls"),
          f"Wallet «Sì»: spesa del giro segnata ({tr})")
    pw.evaluate("window.__test.receiptTotal(55.1, '18/10/2026')")
    tr = pw.evaluate("window.__S().week.trips.settimana")
    check(tr.get("fonte") == "scontrino" and tr.get("spent") == 55.1, f"scontrino dopo il Wallet: stessa spesa, totale dello scontrino ({tr})")
    # doppione: la stessa notifica già registrata non torna (WalletStore scarta i doppioni; qui è già «fatto»)
    pw.evaluate("window.__wallet()")
    check(pw.locator(".sheet-panel [data-a=walletYes]").count() == 0, "pagamento già registrato: non viene richiesto di nuovo")
    # secondo pagamento con la spesa già segnata: sostituisci o somma
    W2 = {"pay": "pay_1792062000000_1000", "ts": 1792062000000, "date": "2026-10-18", "negozio": "Esselunga", "totale": 10.0, "stato": "si"}
    pw.evaluate("w => { window.__wl.push(w); window.__wallet(); }", W2)
    check(pw.locator("[data-a=walletYes][data-how=somma]").count() == 1, "c'è già una spesa per il giro: chiede se sostituire o sommare")
    pw.click("[data-a=walletYes][data-how=somma]")
    pw.wait_for_timeout(300)
    tr = pw.evaluate("window.__S().week.trips.settimana")
    check(tr.get("spent") == 65.1 and len(pw.evaluate("window.__S().week.trips")) == 1, f"somma: stessa spesa con il totale dei due pagamenti ({tr})")
    # «No, altro»: niente registrato
    W3 = {"pay": "pay_1792063000000_399", "ts": 1792063000000, "date": "2026-10-18", "negozio": "Conad", "totale": 3.99, "stato": "attesa"}
    pw.evaluate("w => { window.__wl.push(w); window.__wallet(); }", W3)
    pw.click("[data-a=walletNo]")
    pw.wait_for_timeout(300)
    check("no:" + W3["pay"] in pw.evaluate("window.__wlCalls") and pw.evaluate("window.__S().week.trips.settimana.spent") == 65.1,
          "«No, altro»: il pagamento non diventa spesa")
    # annullamento
    pw.click(".tab[data-t=spesa]")
    pw.click("[data-a=undoShop]")
    pw.wait_for_timeout(300)
    check(pw.evaluate("window.__S().week.status") == "plan", "annullata: la spesa da Wallet torna da fare")
    pw.click("[data-a=settings]")
    check("Leggi la spesa da Google Wallet" in pw.locator(".sheet-panel").inner_text(), "impostazioni: lettura da Google Wallet con lo stato")
    pw.evaluate("window.__back()")
    # aggiornamento dall'app: versione nuova nel gist -> avviso -> «Aggiorna» scarica e installa
    VERS[0] = json.dumps({"code": 20, "name": "1.20", "url": "https://gist.githubusercontent.com/charles1812/x/raw/schiscetta-v1.20.apk", "note": "prova"})
    pw.click(".tab[data-t=menu]")
    pw.evaluate("window.__test.checkUpdate()")
    pw.wait_for_timeout(300)
    check(pw.locator(".upd [data-a=doUpdate]").count() == 1 and "1.20" in pw.locator(".upd").inner_text(), "versione nuova: l'avviso «Aggiorna» compare nel menu")
    shot(pw, "40-aggiornamento")
    pw.click(".upd [data-a=doUpdate]")
    check((pw.evaluate("window.__updUrl") or "").endswith("schiscetta-v1.20.apk"), "«Aggiorna» scarica la nuova versione")
    VERS[0] = json.dumps({"code": 19, "name": "1.19", "url": "x"})
    pw.evaluate("window.__test.checkUpdate()")
    pw.wait_for_timeout(300)
    check(pw.locator(".upd").count() == 0, "stessa versione: nessun avviso")
    # dopo l'aggiornamento: le novità della versione, una volta sola
    nv = pw.evaluate("window.__test.novita")
    pw.evaluate(f"Native.appVersion = () => JSON.stringify({{code: 99, name: '{nv}'}}); window.__test.checkUpdate()")
    pw.wait_for_timeout(300)
    check(pw.locator(".upd:has-text('Aggiornata alla versione') [data-a=novitaOk]").count() == 1, "dopo l'aggiornamento: riquadro con le novità")
    pw.click(".upd [data-a=novitaOk]")
    check(pw.locator(".upd").count() == 0 and pw.evaluate("window.__S().novitaVista") == nv, "novità chiuse: non ricompaiono")
    # anti-spreco: quello che è avanzato entra nei piatti prima che scada e non si ricompra
    pw.evaluate("""() => { localStorage.setItem('schiscetta.v1', JSON.stringify({setup: true, pc: 1, pp: 1, market: 'esselunga',
      dispensa: [{id: 'l1', iid: 'zucchine', q: 500, exp: '2026-10-21'}, {id: 'l2', iid: 'ricotta', q: 200, exp: '2026-10-22'}],
      week: {start: '2026-10-19', slots: {}}})); }""")
    pw.reload()
    pw.click(".tab[data-t=menu]")
    check(pw.locator(".sec-title:has-text('In casa')").count() == 1 and pw.locator("[data-a=lotSheet]").count() == 2, "menu: riquadro «In casa» con gli avanzi")
    pw.click("[data-a=autoSheet]"); pw.click("[data-a=autofill][data-m=equilibrato]")
    pw.wait_for_timeout(300)
    lots = pw.evaluate("window.__test.shopping().lots.map(l => ({iid: l.iid, left: l.left, uses: (l.uses || []).length}))")
    check(all(l["uses"] > 0 for l in lots) and sum(l["left"] for l in lots) < 300, f"menu automatico: usa zucchine e ricotta in casa prima che scadano ({lots})")
    shot(pw, "38b-in-casa")
    sh = pw.evaluate("window.__test.shopping(null, true)")
    z = [i for i in sh["items"] if i["iid"] == "zucchine"]
    check((not z or z[0]["have"] > 0) and (z or any(h["iid"] == "zucchine" for h in sh["home"])), f"la spesa conta le zucchine che hai già ({z})")
    pw.click("[data-a=lotSheet] >> nth=0")
    check(pw.locator(".sheet-panel [data-a=dish]").count() >= 3, "scheda dell'avanzo: piatti che lo usano")
    pw.click("[data-a=lotDel]")
    check(len(pw.evaluate("window.__S().dispensa")) == 1, "avanzo finito o buttato: tolto")
    # a fine settimana gli avanzi delle confezioni comprate passano alla settimana dopo, con la scadenza
    pw.evaluate("() => { const S = window.__S(); S.week.status = 'cook'; S.week.shopDate = '2026-10-18'; window.__test.save(); }")
    nxt = pw.evaluate("window.__test.carryOver('2026-10-26')")
    check(len(nxt) >= 2 and all(l["exp"] >= "2026-10-26" for l in nxt), f"nuova settimana: gli avanzi non scaduti passano in casa ({len(nxt)})")
    # famiglia: più persone, ognuna con i suoi giorni, porzioni e schiscetta; piano delle cene
    pw.evaluate("""() => { localStorage.setItem('schiscetta.v1', JSON.stringify({setup: true, market: 'esselunga',
      profile: {on: true, sex: 'f', age: 35, h: 165, w: 58, act: 1.375, goal: 'keep', comp: false, colaz: 'normale'},
      people: [
        {id: 'p1', name: 'Giulia', e: '👩', c: [true,true,true,true,true,true,true], p: [true,true,true,true,true,false,false], lunch: 'insieme', cat: null},
        {id: 'qmarco', name: 'Marco', e: '👨', c: [true,true,true,false,true,true,true], p: [true,true,true,true,true,false,false], lunch: 'sua', cat: 'legumi',
         prof: {on: true, sex: 'm', age: 40, h: 185, w: 90, act: 1.55, goal: 'keep', comp: false, colaz: 'normale'}}],
      plan: {pesce: 1, formaggio: 1, carne: 1, pasta: 1},
      week: {start: '2026-10-19', slots: {}}})); }""")
    pw.reload()
    pw.click(".tab[data-t=menu]")
    pw.click("[data-a=autoSheet]"); pw.click("[data-a=autofill][data-m=equilibrato]")
    pw.wait_for_timeout(300)
    S = pw.evaluate("window.__S()")
    own = {k: v for k, v in S["week"]["slots"].items() if k.endswith("-qmarco")}
    fits = [pw.evaluate(f"window.__test.fits({json.dumps(v.get('d'))}, 'legumi')") for v in own.values() if v.get("d")]
    check(len(own) == 5 and fits and all(fits), f"schiscetta tutta sua di Marco, solo legumi, dal lunedì al venerdì ({len(own)}, {fits})")
    check(pw.evaluate("window.__test.eaters('3c')") == ["p1"] and sorted(pw.evaluate("window.__test.eaters('2c')")) == ["p1", "qmarco"], "giovedì Marco non c'è a cena")
    tags = {}
    for k, v in S["week"]["slots"].items():
        if k.endswith("c") and v.get("d"):
            for g in pw.evaluate(f"window.__test.tags({json.dumps(v['d'])})"): tags[g] = tags.get(g, 0) + 1
    check(all(tags.get(g, 0) >= 1 for g in ("pesce", "formaggio", "carne", "pasta")), f"piano delle cene rispettato: almeno un pesce, un formaggio, una carne, una pasta ({tags})")
    d0 = S["week"]["slots"]["0c"]["d"]
    n2, n3 = pw.evaluate(f"window.__test.slotN('0c', {json.dumps(d0)})"), pw.evaluate(f"window.__test.slotN('3c', {json.dumps(d0)})")
    check(n3 < 1 and n2 - n3 > n3, f"porzioni su misura: Giulia (58 kg) meno della dose, Marco (90 kg) di più ({n3} lei, {round(n2 - n3, 2)} lui)")
    ev = pw.evaluate("window.__test.eveningPlan(0)")
    check(len(ev["blocks"]) >= 2 and any(b["role"] in ("lunch", "both") and any(x["id"] == "qmarco" for x in b["who"]) for b in ev["blocks"]),
          f"sera: cena e schiscette di domani, compresa quella di Marco ({[(b['role'], b['dish']['n']) for b in ev['blocks']]})")
    check(pw.locator(".slot:has-text('Schiscetta di Marco')").count() == 5 and pw.locator(".who").count() > 5, "menu: la schiscetta di Marco e chi mangia sotto i pasti")
    shot(pw, "41-famiglia-menu")
    # assenza di una sola settimana: lunedì sera Marco è fuori
    c0 = pw.evaluate("window.__test.shopping().consumo")
    pw.click("[data-a=whoSheet][data-k='0c']")
    pw.click("[data-a=whoToggle][data-p=qmarco]")
    pw.wait_for_timeout(200)
    check(pw.evaluate("window.__test.eaters('0c')") == ["p1"] and pw.evaluate("window.__test.shopping().consumo") < c0, "assenza di questa settimana: meno porzioni e meno da comprare")
    pw.evaluate("window.__back()")
    # scheda «Chi mangia»: calendario, schiscetta e piano
    pw.click("[data-a=settings]"); pw.click("[data-a=peopleSheet]")
    check(pw.locator(".sheet-panel .pday").count() == 28 and pw.locator(".sheet-panel [data-a=planStep]").count() == 14, "Chi mangia: calendario di ogni persona e piano delle cene")
    shot(pw, "42-chi-mangia")
    pw.click("[data-a=presT][data-p=qmarco][data-t=c][data-d='4']")
    check(pw.evaluate("window.__S().people[1].c[4]") is False, "il calendario cambia i giorni di ogni settimana")
    pw.evaluate("window.__back()")
    pw.click("[data-a=newWeek]")
    ea = pw.evaluate("window.__S().eaten || []")
    check(len(ea) == 1 and len(ea[0]["ids"]) >= 5, f"nuova settimana: ricorda i piatti mangiati per la varietà ({len(ea)})")
    pw.click("[data-a=settings]"); pw.click("[data-a=peopleSheet]")
    pw.click("[data-a=pAdd]")
    check(len(pw.evaluate("window.__S().people")) == 3, "aggiungi una persona")
    pw.evaluate("window.__back()"); pw.evaluate("window.__back()")
    # lista: «per cosa?» (piatti, complementi, colazione), checklist della dispensa, menu economico, niente cose pronte
    pw.evaluate("""() => { localStorage.setItem('schiscetta.v1', JSON.stringify({setup: true, market: 'esselunga',
      profile: {on: true, sex: 'm', age: 30, h: 194, w: 80, act: 1.55, goal: 'gain', comp: true, colaz: 'poca'},
      people: [{id: 'p1', name: 'Io', e: '🙂', c: [true,true,true,true,true,true,true], p: [true,true,true,true,true,false,false], lunch: 'insieme', cat: null,
        colaz: [{i: 'kefir', q: 200, n: 7}]}],
      week: {start: '2026-10-19', slots: {}}})); }""")
    pw.reload()
    pw.click(".tab[data-t=menu]")
    pw.click("[data-a=autoSheet]"); pw.click("[data-a=autofill][data-m=equilibrato]")
    pw.wait_for_timeout(300)
    u = pw.evaluate("window.__test.usesOf('kefir')")
    check(len(u) == 1 and u[0]["q"] == 1400 and "7 volte" in u[0]["d"], f"colazione: kefir 200 g ogni giorno nella spesa ({u})")
    uy = pw.evaluate("window.__test.usesOf('yogurt')")
    check(uy and all(x.get("comp") for x in uy), f"«per cosa?»: gli yogurt sono complementi dei pasti ({len(uy)})")
    pw.click(".tab[data-t=spesa]")
    if pw.locator(".rep:not(.open)").count():
        if pw.locator("[data-a=repAll]").inner_text().startswith("Chiudi"): pw.click("[data-a=repAll]")
        pw.click("[data-a=repAll]")
    pw.click(".item:has-text('Yogurt greco') [data-a=usesSheet]")
    check("complemento" in pw.locator(".sheet-panel").inner_text() and pw.locator(".sheet-panel .item").count() >= 5, "scheda «per cosa?» con i pasti e la spiegazione dei complementi")
    shot(pw, "43-per-cosa")
    pw.click(".sheet-panel .icon-btn[data-a=close]")
    first = pw.locator(".item.pcheck").first
    pi = first.locator("[data-a=pcheck][data-v=manca]").get_attribute("data-i")
    first.locator("[data-a=pcheck][data-v=manca]").click()
    items = pw.evaluate("window.__test.shopping(null, true).items.map(i => i.iid)")
    check(pi in items and pw.locator(".item.pcheck.manca").count() == 1, f"dispensa: «Manca» mette {pi} nella lista")
    pw.locator(".item.pcheck").nth(1).locator("[data-a=pcheck][data-v=ok]").click()
    check(pw.locator(".item.pcheck.ok").count() == 1, "dispensa: «Ce l'ho» la spunta")
    shot(pw, "44-dispensa")
    pw.click(".tab[data-t=menu]")
    pw.click("[data-a=autoSheet][data-redo='1']"); pw.click("[data-a=autofill][data-m=risparmio]")
    pw.wait_for_timeout(300)
    check(not pw.evaluate("window.__test.usesOf('yogurt').filter(x => x.comp).length") and not pw.evaluate("window.__test.usesOf('mandorle').filter(x => x.comp).length"),
          "menu economico: complementi solo pane, banane e mele")
    pw.click("[data-a=settings]"); pw.click("[data-a=allergySheet]"); pw.click("[data-a=noPronti]")
    noi = pw.evaluate("window.__S().noIng")
    check(noi.get("ragu") and noi.get("pure") and not pw.evaluate("window.__test.fits('pure_pollo', 'carne') === undefined"), "niente cose pronte: ragù pronto, purè in fiocchi… esclusi")
    pw.evaluate("window.__back()"); pw.evaluate("window.__back()")
    # spesa per 4 giorni, scontrino con le quantità vere, menu nuovo dal giorno dopo (anche a metà settimana)
    pw.evaluate("""() => { localStorage.setItem('schiscetta.v1', JSON.stringify({setup: true, market: 'esselunga',
      people: [{id: 'p1', name: 'Io', e: '🙂', c: [true,true,true,true,true,true,true], p: [true,true,true,true,true,false,false], lunch: 'insieme', cat: null}],
      week: {start: '2026-10-19', slots: {'0c': {d: 'cosce_pollo_forno'}, '1c': {d: 'pasta_pomodoro'}, '2c': {d: 'cosce_pollo_forno'}, '3c': {d: 'caprese'}, '5c': {d: 'pasta_pomodoro'}},
        win: {days: 4, from: 0}}})); }""")
    pw.reload()
    need = pw.evaluate("(window.__test.shopping(null, true).items.find(i => i.iid === 'cosce_pollo') || {}).need || 0")
    n = pw.evaluate("""() => window.__test.receiptHome({data: '2026-10-18', righe: [
      {ingrediente: 'cosce_pollo', quantita: 1, unita: 'pz', peso_confezione: 1200, prezzo_unitario: 6.9},
      {ingrediente: 'banane', quantita: 1.4, unita: 'kg', peso_confezione: 0, prezzo_unitario: 1.5}]})""")
    lots = pw.evaluate("window.__S().dispensa")
    pollo = [l for l in lots if l["iid"] == "cosce_pollo"]
    ban = [l for l in lots if l["iid"] == "banane"]
    check(n == 2 and pollo and abs(pollo[0]["q"] - (1200 - need)) < 1 and pollo[0]["win"] == ["2026-10-19", 0, 4] and ban,
          f"scontrino: quello comprato in più va in casa, non per i pasti di questa spesa ({pollo}, {ban})")
    pw.click(".tab[data-t=menu]")
    check(pw.locator(".item:has-text('Cosce di pollo') .left:has-text('congelalo')").count() == 1, "carne in più che scade: «congelalo»")
    pw.click(".item:has-text('Cosce di pollo')[data-a=lotSheet]"); pw.click("[data-a=lotFreeze]")
    check(pw.evaluate("window.__S().dispensa.find(l => l.iid === 'cosce_pollo').frozen"), "«L'ho congelato»: dura altri 3 mesi")
    pw.evaluate("() => { const S = window.__S(); S.week.status = 'cook'; S.week.shopDate = '2026-10-18'; S.week.trips = {'0-4': {date: '2026-10-18', spent: 30}}; window.__test.save(); }")
    pw.reload()
    pw.click(".tab[data-t=spesa]")
    pw.click("[data-a=newFrom]")
    S = pw.evaluate("window.__S()")
    check(S["week"]["start"] == "2026-10-23" and {"cosce_pollo", "banane"} <= {l["iid"] for l in S["dispensa"]}, f"menu nuovo da venerdì 23, con gli avanzi in casa ({S['week']['start']}, {[l['iid'] for l in S['dispensa']]})")
    pw.click("[data-a=autoSheet]"); pw.click("[data-a=autofill][data-m=equilibrato]")
    pw.wait_for_timeout(300)
    used = pw.evaluate("window.__test.shopping().lots.filter(l => l.iid === 'banane').map(l => [(l.uses || []).length, l.exp])")
    check(used and used[0][0] > 0, f"il menu nuovo usa le banane avanzate prima che scadano ({used})")
    check(pw.evaluate("window.__test.eaters('1p')") == [], "menu da venerdì: sabato niente schiscetta (i giorni seguono il calendario vero)")
    # scontrino «Menu nuovo da oggi con questa spesa»: tutto in casa, menu da oggi a pranzo con quello che hai
    pw.evaluate("""() => { localStorage.setItem('schiscetta.v1', JSON.stringify({setup: true, market: 'iperal', apiKey: 'sk-ant-test',
      people: [{id: 'p1', name: 'Io', e: '🙂', c: [true,true,true,true,true,true,true], p: [true,true,true,true,true,true,true], lunch: 'insieme', cat: null}],
      week: {start: '2026-10-12', slots: {'0c': {d: 'pasta_pomodoro'}}}})); }""")
    pw.reload()
    today = pw.evaluate("window.__test.today()")
    n = pw.evaluate("""() => window.__test.receiptAll({data: '', righe: [
      {ingrediente: 'cosce_pollo', quantita: 1, unita: 'pz', peso_confezione: 800}, {ingrediente: 'petto_pollo', quantita: 1, unita: 'pz', peso_confezione: 500},
      {ingrediente: 'spinaci', quantita: 1, unita: 'pz', peso_confezione: 450}, {ingrediente: 'piselli', quantita: 1, unita: 'pz', peso_confezione: 450},
      {ingrediente: 'tortellini', quantita: 1, unita: 'pz', peso_confezione: 250}, {ingrediente: 'mozzarella', quantita: 3, unita: 'pz', peso_confezione: 125},
      {ingrediente: 'yogurt', quantita: 8, unita: 'pz', peso_confezione: 150}, {ingrediente: 'riso_basmati', quantita: 1, unita: 'pz', peso_confezione: 1000},
      {ingrediente: 'patate', quantita: 1, unita: 'pz', peso_confezione: 1500}, {ingrediente: 'ragu', quantita: 1, unita: 'pz', peso_confezione: 350},
      {ingrediente: 'pasta_corta', quantita: 1, unita: 'pz', peso_confezione: 500}, {ingrediente: 'banane', quantita: 1, unita: 'kg', peso_confezione: 0},
      {ingrediente: 'cotto', quantita: 1, unita: 'pz', peso_confezione: 120}, {ingrediente: 'latte', quantita: 1, unita: 'pz', peso_confezione: 1000}]})""")
    S = pw.evaluate("window.__S()")
    filled = sum(1 for v in S["week"]["slots"].values() if v)
    check(S["week"]["start"] == today and len(S["dispensa"]) >= 12 and filled >= 10 and S["week"]["mode"] == "casa",
          f"scontrino → menu nuovo da oggi con quello che hai comprato ({S['week']['start']}, {len(S['dispensa'])} in casa, {filled} pasti)")
    pw.reload()
    pw.click(".tab[data-t=menu]")
    check(pw.locator(".tip:has-text('Con quello che hai in casa copri')").count() == 1 and pw.locator(".homeline").count() >= 1,
          f"menu: quanti pasti copri con quello che hai e «tutto in casa» sui pasti ({pw.locator('.homeline').count()})")
    check(pw.locator(".slot:has-text('Pranzo di oggi')").count() == 1, "il menu parte dal pranzo di oggi")
    shot(pw, "45-menu-dalla-spesa")
    ev = pw.evaluate("window.__test.eveningPlan(0)")
    check(any(b.get("today") for b in ev["blocks"]) and len(ev["blocks"]) >= 2, f"oggi una sessione sola: pranzo di oggi + cena + schiscetta di domani ({[(b['role'], b.get('today')) for b in ev['blocks']]})")
    nd = pw.evaluate("""() => { const S = window.__S(); delete S.week.slots['4c']; window.Native = Object.assign(window.Native || {}, { setReminder: (on, h, m, j) => { window.__rem = [on, j]; } }); window.__test.save(); return window.__test.shopNeededDay(); }""")
    rem = pw.evaluate("window.__rem || null")
    pre = pw.evaluate("""(nd) => { const S = window.__S(), sh = window.__test.shopping(); return Object.keys(S.week.slots).filter(k => { const d = +k[0], c = k[1] === 'p' && d > 0 ? d - 1 : d;
      return new Date(S.week.start).getTime() + c * 864e5 < new Date(nd).getTime() && sh.short[k] && sh.short[k].size; }); }""", nd)
    check(nd and nd > today and not pre and rem and rem[0] and "finisce il cibo" in rem[1], f"notifica prima che finisca il cibo: fino a {nd} tutto in casa ({pre}; {rem[1][:160] if rem else None})")
    # scambio di due pasti: il piatto di oggi con un altro del menu, e tutto si ricalcola
    sl0 = pw.evaluate("window.__S().week.slots")
    pw.click(".tab[data-t=menu]")
    pw.click(".slot[data-k='0c']")
    pw.click("[data-a=swapSheet]")
    check(pw.locator(".sheet-panel [data-a=swapDo]").count() >= 3, "scambia: gli altri pasti del menu, con cosa manca dopo lo scambio")
    shot(pw, "48-scambia")
    tgt = pw.locator(".sheet-panel [data-a=swapDo]").first.get_attribute("data-a2")
    pw.locator(".sheet-panel [data-a=swapDo]").first.click()
    sl1 = pw.evaluate("window.__S().week.slots")
    check(sl1["0c"].get("d") != sl0["0c"].get("d") and sl1[tgt].get("d") == sl0["0c"].get("d"),
          f"scambio fatto: 0c ↔ {tgt} ({sl0['0c']}, {sl0[tgt]} → {sl1['0c']}, {sl1[tgt]})")
    used = pw.evaluate("window.__test.shopping().lots.filter(l => (l.uses || []).length).length")
    check(used >= 8, f"il menu usa quasi tutto quello che hai comprato ({used} prodotti su {len(S['dispensa'])})")
    # foto di prodotti in casa (Claude simulato): la ricotta che avevi già
    def api2(route):
        route.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"},
                      body=json.dumps({"stop_reason": "end_turn", "content": [{"type": "text", "text": json.dumps({"prodotti": [
                          {"nome": "Ricotta fresca", "marca": "Primia", "ingrediente": "ricotta", "confezioni": 1, "peso_confezione": 250, "rimasto_percento": 100},
                          {"nome": "Caffè", "marca": "Lavazza", "ingrediente": "", "confezioni": 1, "peso_confezione": 250, "rimasto_percento": 50}]})}]}))
    pw.route("https://api.anthropic.com/v1/messages", api2)
    pw.click("[data-a=homeAddSheet] >> nth=0")
    pw.set_input_files("input[data-ch=homeFile]", str(rec))
    pw.wait_for_selector("[data-a=haApply]", timeout=15000)
    shot(pw, "46-foto-in-casa")
    pw.click("[data-a=haApply]")
    check(any(l["iid"] == "ricotta" and l["q"] == 250 for l in pw.evaluate("window.__S().dispensa")), "foto dei prodotti: la ricotta va in casa (il caffè non è un ingrediente)")
    pw.click("[data-a=homeAddSheet][data-m=mano]")
    pw.fill("input[data-in=haq]", "uova")
    pw.fill("#ha-uova", "4"); pw.click("[data-a=haManual][data-i=uova]")
    check(any(l["iid"] == "uova" and l["q"] == 4 for l in pw.evaluate("window.__S().dispensa")), "aggiunta a mano: 4 uova in casa")
    # scanner dei codici a barre (logica: senza fotocamera nei test)
    pw.route("https://world.openfoodfacts.org/**", lambda r: r.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"},
        body=json.dumps({"product": {"product_name": "Kefir bianco naturale", "brands": "Fattorie Osella", "quantity": "480 g"}})))
    pw.evaluate("() => { const S = window.__S(); S.cat = {iperal: {ricotta: {c: '1', n: 'Ricotta Fresca Primia 250 g', img: '', ean: '8001111111111'}}}; window.__test.save(); }")
    pw.evaluate("() => { while (window.__back() && document.querySelector('#sheet')) {} }")
    pw.click(".tab[data-t=spesa]")
    pw.click("[data-a=scanSheet] >> nth=0")
    pw.evaluate("window.__test.scanFake()")
    n0 = len(pw.evaluate("window.__S().dispensa"))
    pw.evaluate("window.__test.onScan('8001111111111')")
    pw.wait_for_timeout(200)
    d = pw.evaluate("window.__S().dispensa")
    check(len(d) == n0 + 1 and d[-1]["iid"] == "ricotta" and d[-1]["q"] == 250, f"scanner: codice dal catalogo Iperal → ricotta 250 g in casa ({d[-1] if d else None})")
    pw.evaluate("window.__test.onScan('8009999999999')")
    pw.wait_for_selector("#scan-list [data-a=scanPick][data-i=kefir]")
    shot(pw, "47-scanner")
    pw.click("#scan-list [data-a=scanPick][data-i=kefir]")
    S = pw.evaluate("window.__S()")
    check(S["ean"]["8009999999999"]["iid"] == "kefir" and S["dispensa"][-1]["q"] == 480, f"scanner: codice nuovo (Open Food Facts) → scegli kefir, 480 g, e lo ricorda ({S['ean']})")
    pw.click("[data-a=scanDone]")
    # la dispensa vera di Charles (18/10): il menu dalla spesa deve usare fusi, petto, spinaci, ricotta… e non lasciare niente
    pw.evaluate("""() => { localStorage.setItem('schiscetta.v1', JSON.stringify({setup: true, market: 'iperal',
      profile: {on: true, sex: 'm', age: 30, h: 194, w: 80, act: 1.55, goal: 'gain', comp: true, colaz: 'poca'},
      people: [{id: 'p1', name: 'Io', e: '🙂', c: [true,true,true,true,true,true,true], p: [true,true,true,true,true,true,true], lunch: 'insieme', cat: null}],
      week: {start: '2026-10-12', slots: {}}})); }""")
    pw.reload()
    pw.evaluate("""() => window.__test.receiptAll({data: '2026-10-18', righe: [
      ['spinaci', 450], ['piselli', 450], ['burro', 200], ['tortellini', 250], ['grana', 100], ['yogurt', 1400], ['mozzarella', 375], ['cotto', 120],
      ['latte', 1000], ['fusi_pollo', 725], ['pollo', 565], ['riso_basmati', 500], ['patate', 1500], ['ragu', 350], ['pane', 590], ['pasta_corta', 500],
      ['banane', 1300], ['mele', 1800], ['ricotta', 250], ['uova', 6]].map(([i, g]) => ({ingrediente: i, quantita: 1, unita: 'pz', peso_confezione: g}))})""")
    sh = pw.evaluate("() => { const sh = window.__test.shopping(); return sh.lots.map(l => [l.iid, Math.round(l.q), Math.round(l.left), (l.uses || []).length]); }")
    unused = [l for l in sh if l[3] == 0 and l[0] not in ("latte", "burro", "grana")]
    print("   dispensa di Charles:", sh)
    check(not unused, f"menu dalla spesa: usa fusi, petto, spinaci, ricotta e il resto (non usati: {unused})")
    more = pw.evaluate("() => window.__test.shopping().more")
    print("   porzioni più abbondanti:", more)
    for iid in ("fusi_pollo", "pollo", "ricotta", "mozzarella", "spinaci"):       # i piselli surgelati possono restare: durano mesi
        l = next(x for x in sh if x[0] == iid)
        check(l[2] <= l[1] * 0.35, f"{iid}: ne resta poco ({l[2]} di {l[1]})")
    # spesa già «In casa» e un menu vecchio che non usa i fusi: «Fai il menu dalle scorte» rifà il menu e non tocca le scorte
    d0 = pw.evaluate("() => { const S = window.__S(); S.week.slots = {'0c': {d: 'pasta_forno'}}; S.week.status = 'cook'; window.__test.save(); return S.dispensa.map(l => [l.iid, l.q]); }")
    pw.reload()
    pw.click(".tab[data-t=menu]")
    pw.click("[data-a=menuScorte]")
    S = pw.evaluate("window.__S()")
    sh = pw.evaluate("() => window.__test.shopping().lots.map(l => [l.iid, Math.round(l.q), Math.round(l.left)])")
    check(sorted(d0) == sorted([l["iid"], l["q"]] for l in S["dispensa"]), "menu dalle scorte: «In casa» resta uguale (niente spesa doppia)")
    fu = next(x for x in sh if x[0] == "fusi_pollo")
    check(S["week"]["start"] == pw.evaluate("window.__test.today()") and fu[2] <= fu[1] * 0.35, f"menu dalle scorte da oggi: usa i fusi ({fu})")
    r = pw.evaluate("""() => { const S = window.__S(), sh = window.__test.shopping(), nd = window.__test.shopNeededDay();
      const pre = Object.keys(S.week.slots).filter(k => { const d = +k[0], c = k[1] === 'p' && d > 0 ? d - 1 : d; return new Date(S.week.start).getTime() + c * 864e5 < new Date(nd).getTime() && sh.short[k] && sh.short[k].size; });
      return [nd, pre, S.week.win]; }""")
    check(r[0] and r[0] >= pw.evaluate("window.__test.today()")[:8] + "22" and not r[1] and r[2]["from"] >= 4, f"menu dalle scorte: con la spesa di Charles niente da comprare fino a giovedì, poi la lista parte da lì ({r})")
    # ricette spiegate passo passo: dosi vere nei passaggi (2 persone → doppie)
    pw.evaluate("() => { while (window.__back() && document.querySelector('#sheet')) {} }")
    pw.evaluate("() => { window.__S().pc = 2; }")
    pw.evaluate("() => { const b = document.createElement('button'); b.dataset.a = 'dish'; b.dataset.id = 'riso_cantonese'; b.id = 'tmp-dish'; document.querySelector('#app, body').appendChild(b); }")
    pw.locator("#tmp-dish").dispatch_event("click")
    pw.wait_for_selector("ol.steps b")
    st = pw.locator("ol.steps").inner_text()
    check("160 g di riso basmati" in st and "2 uova" in st and "cucchia" in st and "{" not in st, f"ricetta passo passo con le dosi vere per 2 ({st[:160]!r})")
    shot(pw, "50-ricetta-passo-passo")
    pw.evaluate("() => { while (window.__back() && document.querySelector('#sheet')) {} }")
    pw.click(".tab[data-t=menu]")
    shot(pw, "48-menu-scorte")
    # «Ho cucinato altro»: teglia con tutti i fusi, il petto e le patate, 3 porzioni, a cena
    pw.click("[data-a=cookedSheet] >> nth=0")
    pw.click("[data-a=ckT][data-v=c]")
    ids = pw.evaluate("() => window.__S().dispensa.filter(l => ['fusi_pollo', 'pollo', 'patate'].includes(l.iid)).map(l => l.id)")
    for i in ids: pw.click(f"[data-a=ckLot][data-id='{i}']")
    pw.click("[data-a=ckPorz][data-v='1']"); pw.click("[data-a=ckPorz][data-v='1']")
    pw.fill("input[data-ckn]", "Teglia di pollo e patate")
    shot(pw, "49-ho-cucinato")
    pw.click("[data-a=cookedSave]")
    r = pw.evaluate("""() => { const S = window.__S(), sh = window.__test.shopping(), nd = window.__test.shopNeededDay();
      const sl = Object.keys(S.week.slots).sort((a, b) => a[0] - b[0] || (a[1] === 'p' ? -1 : 1)).map(k => [k, S.week.slots[k].own ? 'own' : S.week.slots[k].skip ? 'skip' : (S.week.slots[k].d || 'avanzo'), !!(sh.short[k] && sh.short[k].size)]);
      return { left: S.dispensa.filter(l => ['fusi_pollo', 'pollo', 'patate'].includes(l.iid)).length, sl, nd, start: S.week.start }; }""")
    print("   ho cucinato:", r)
    own = [x[0] for x in r["sl"] if x[1] == "own"]
    check(r["left"] == 0 and own[:3] == ["0c", "1p", "1c"] and len(own) == 3, f"ho cucinato: pollo e patate tolti da «In casa», cena di oggi + 2 avanzi nei prossimi pasti ({own})")
    check(r["sl"][0][0] == "0p" and r["sl"][0][1] == "skip" and r["nd"] and r["nd"] > r["start"] and not any(x[2] for x in r["sl"][:8]), f"ho cucinato: pranzo di oggi lasciato com'era, il resto rifatto con le scorte (prossima spesa {r['nd']})")
    # cronologia: la teglia è in «Mangiato»; annulla rimette pollo e patate in casa
    pw.click(".tab[data-t=spesa]")
    pw.click("[data-a=spTab][data-v=mangiato]")
    check(pw.locator("[data-a=diaryUndo]").count() == 1 and "Teglia di pollo e patate" in pw.locator("main").inner_text(), "cronologia: la teglia è in «Mangiato»")
    shot(pw, "51-mangiato")
    pw.click("[data-a=diaryUndo]")
    r = pw.evaluate("() => { const S = window.__S(); return [S.dispensa.filter(l => ['fusi_pollo', 'pollo', 'patate'].includes(l.iid)).map(l => [l.iid, l.q]), Object.values(S.week.slots).filter(x => x && x.own).length, (S.diario || []).length]; }")
    check(len(r[0]) == 3 and r[1] == 0 and r[2] == 0, f"annulla: pollo e patate di nuovo in casa, niente più teglia nel menu ({r})")
    # calendario: un pasto si apre con tutte le azioni; «L'ho cucinato così» va nella cronologia
    pw.evaluate("() => { window.__TEST_LIST = 0; }")
    pw.click(".tab[data-t=menu]")
    check(pw.locator(".cal-c[data-a=mealSheet]").count() >= 8, f"menu a calendario: pranzi e cene con i piatti ({pw.locator('.cal-c[data-a=mealSheet]').count()})")
    shot(pw, "52-calendario")
    k = pw.locator(".cal-c[data-a=mealSheet]").nth(1).get_attribute("data-k")
    pw.locator(".cal-c[data-a=mealSheet]").nth(1).click()
    acts = pw.locator(".sheet-panel").inner_text()
    check("L'ho cucinato così" in acts and "altre dosi" in acts and "Ho mangiato altro" in acts and "Cambia piatto" in acts, f"scheda del pasto: ricetta, cucinato, altro, cambia ({acts[:120]!r})")
    shot(pw, "53-pasto")
    pw.click("[data-a=cookedAsIs]")
    d = pw.evaluate("() => (window.__S().diario || []).map(e => [e.n, e.plan])")
    check(len(d) == 1 and d[0][1], f"«L'ho cucinato così»: nella cronologia ({d})")
    # altre dosi: la scheda parte con le dosi del piatto prese da «In casa»
    pw.locator(f".cal-c[data-k='{k}']").click()
    pw.click("[data-a=diaryUndo]")
    pw.locator(f".cal-c[data-k='{k}']").click()
    pw.click("[data-a=cookedSheet][data-pre]")
    n = pw.locator("input[data-ckq]").count()
    check(n >= 2, f"«con altre dosi»: dosi del piatto già scelte da «In casa» ({n} ingredienti)")
    pw.evaluate("() => { while (window.__back() && document.querySelector('#sheet')) {} }")
    # dispensa: in casa, da comprare, di base
    pw.click(".tab[data-t=dispensa]")
    check(pw.locator("[data-a=lotSheet]").count() >= 10 and pw.locator("[data-a=menuScorte]").count() == 1, "scheda Dispensa: quello che hai e «Rifai il menu da qui»")
    shot(pw, "54-dispensa")
    pw.click("[data-a=dpTab][data-v=base]")
    pw.click("[data-a=pbase][data-v=manca] >> nth=0")
    check(False in pw.evaluate("() => Object.values(window.__S().pantry)"), "di base: «Manca» si ricorda")
    shot(pw, "55-di-base")
    # spese fatte: una spesa senza menu (a mano) resta nello storico
    pw.click(".tab[data-t=spesa]")
    pw.click("[data-a=spTab][data-v=spese]")
    pw.click("[data-a=spesaAddSheet] >> nth=0")
    pw.fill("[data-sa=eur]", "52,30")
    pw.click("[data-a=spesaAdd]")
    check("52,30" in pw.locator("main").inner_text(), "spese fatte: la spesa aggiunta compare")
    pw.click(".tab[data-t=dispensa]")
    pw.click("[data-a=menuScorte]")
    pw.click(".tab[data-t=spesa]")
    pw.click("[data-a=spTab][data-v=spese]")
    check("52,30" in pw.locator("main").inner_text(), "spese fatte: resta anche dopo «Rifai il menu da qui»")
    pw.close()
    check(not GZ, f"nessuna chiamata a spese.php durante tutte le prove ({GZ})")
    b.close()

for e in errors: print("ERRORE JS:", e)
print(f"\n{len(fails)} controlli falliti, {len(errors)} errori JS")
sys.exit(1 if fails or errors else 0)
