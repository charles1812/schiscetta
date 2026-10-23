#!/usr/bin/env python3
"""Registra le risposte vere della ricerca EasyCoop (come le chiede l'app) per il test della lettura dal telefono.

Uso: python tools/fixture_coop.py   -> tools/fixtures/coop.json  {query: testo della risposta}
"""
import json, os, re, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ING = json.load(open(os.path.join(ROOT, "data", "ingredienti.json"), encoding="utf-8"))["ingredienti"]
GQL = ('{products(search:%s,pageSize:40){items{name sku manufacturer stock_status price_range{minimum_price{final_price{value} '
       'regular_price{value}}}} aggregations{attribute_code options{label value}}}}')


def ask(q):
    body = json.dumps({"query": GQL % json.dumps(q)}).encode()
    req = urllib.request.Request("https://www.easycoop.com/graphql", body,
                                 {"Content-Type": "application/json", "Store": "c_901", "User-Agent": "Mozilla/5.0"})
    d = json.load(urllib.request.urlopen(req, timeout=30))
    # tengo solo le marche: le altre aggregazioni non servono e pesano
    d["data"]["products"]["aggregations"] = [a for a in d["data"]["products"]["aggregations"] if a["attribute_code"] == "manufacturer"]
    return json.dumps(d, ensure_ascii=False)


out = {}
for i in ING:
    name = re.sub(r"\(.*?\)", "", i["n"]).strip()
    for q in dict.fromkeys([name, name.split()[0]]):
        out[q] = ask(q)
        time.sleep(0.4)
os.makedirs(os.path.join(ROOT, "tools", "fixtures"), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, "tools", "fixtures", "coop.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(len(out), "risposte salvate")
