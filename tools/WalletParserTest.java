package com.charles.schiscetta;

/**
 * Prova della lettura delle notifiche di Google Wallet (WalletParser), con notifiche finte.
 * Uso: python tools/test_wallet.py   (compila e lancia con il JDK, senza Android)
 */
public class WalletParserTest {
    static int fails = 0;

    static void check(boolean ok, String msg) {
        System.out.println((ok ? "ok   " : "FAIL ") + msg);
        if (!ok) fails++;
    }

    static void pay(String title, String text, String negozio, double imp, String msg) {
        WalletParser.Pay p = WalletParser.parse(title, text);
        check(p != null && p.negozio.equals(negozio) && Math.abs(p.importo - imp) < 0.001,
            msg + " -> " + (p == null ? "scartata" : p.negozio + " " + p.importo));
    }

    static void none(String title, String text, String msg) {
        WalletParser.Pay p = WalletParser.parse(title, text);
        check(p == null, msg + " -> " + (p == null ? "scartata" : "tenuta: " + p.negozio + " " + p.importo));
    }

    public static void main(String[] a) {
        // supermercati e formati dell'importo
        pay("Esselunga", "€ 52,30 con Visa •••• 1234", "Esselunga", 52.30, "supermercato, «€ 52,30»");
        pay("CONAD CITY MILANO", "62,40 € con Mastercard", "CONAD CITY MILANO", 62.40, "«62,40 €»");
        pay("Carrefour Market", "EUR 7,05", "Carrefour Market", 7.05, "«EUR 7,05»");
        pay("Lidl Italia", "€1.234,56 con Visa", "Lidl Italia", 1234.56, "migliaia «€1.234,56»");
        pay("MD SPA 123", "€ 18,90", "MD SPA 123", 18.90, "MD come parola intera");
        pay("Supermercato Rossi", "€ 9,99", "Supermercato Rossi", 9.99, "parola «supermercato»");
        pay("€ 33,10", "IPER LA GRANDE I\ncon Visa", "IPER LA GRANDE I", 33.10, "importo nel titolo, negozio nel testo");
        // non supermercati, rimborsi, rifiutati
        none("Bar Centrale", "€ 3,20 con Visa", "bar: non è un supermercato");
        none("Amazon", "€ 25,00", "Amazon: non è un supermercato");
        none("Farmacia Comunale", "€ 12,00", "farmacia");
        none("MCDONALDS", "€ 9,50", "«md» non deve scattare dentro altre parole");
        none("Esselunga", "Rimborso di € 4,50", "rimborso");
        none("Esselunga", "Pagamento rifiutato € 52,30", "pagamento rifiutato");
        none("Coop", "Transazione annullata: € 10,00", "annullato");
        none("Esselunga", "Accredito € 5,00", "accredito");
        none("Esselunga", "Carta aggiunta a Google Wallet", "notifica senza importo");
        // impronta e doppioni (stessa regola di Gruzzolo)
        check(WalletParser.pay(1792059313000L, 52.30).equals("pay_1792059313000_5230"), "impronta pay_<ms>_<centesimi>");
        check(WalletParser.samePayment(1000000, 52.30, 1000000 + 60_000, 52.30), "doppia notifica entro 2 minuti: stesso pagamento");
        check(WalletParser.samePayment(1000000, 52.30, 1000000 + 30_000, 52.60), "importo entro l'1%: stesso pagamento");
        check(!WalletParser.samePayment(1000000, 52.30, 1000000 + 180_000, 52.30), "dopo 3 minuti: pagamento diverso");
        check(!WalletParser.samePayment(1000000, 52.30, 1000000 + 30_000, 55.00), "importo diverso: pagamento diverso");
        // pacchetti
        check(WalletParser.accepts("com.google.android.apps.walletnfcrel", false), "accetta Google Wallet");
        check(!WalletParser.accepts("com.android.shell", false) && WalletParser.accepts("com.android.shell", true), "la shell solo nelle build di debug");
        check(!WalletParser.accepts("com.whatsapp", true), "altre app no");
        System.out.println("\n" + fails + " controlli falliti");
        System.exit(fails == 0 ? 0 : 1);
    }
}
