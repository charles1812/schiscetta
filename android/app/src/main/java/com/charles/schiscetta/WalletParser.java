package com.charles.schiscetta;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Notifiche di pagamento di Google Wallet: negozio, importo, solo supermercati, niente rimborsi né doppioni.
 * Java puro, senza Android: si prova dal PC con tools/WalletParserTest.java.
 * «pay» identifica il pagamento (ora della notifica e centesimi): serve a Schiscetta per non chiederlo due volte.
 */
final class WalletParser {
    static final String WALLET = "com.google.android.apps.walletnfcrel";

    static final class Pay {
        final String negozio;
        final double importo;
        Pay(String negozio, double importo) { this.negozio = negozio; this.importo = importo; }
    }

    /** rimborsi, accrediti, pagamenti rifiutati o annullati: non sono spese */
    private static final Pattern NOT_A_PAYMENT = Pattern.compile(
        "rimbors|accredit|rifiutat|annullat|non riuscit|non autorizzat|non completat|storn|refund|declined|cancel", Pattern.CASE_INSENSITIVE);
    /** catene e parole che indicano un supermercato (come parole intere: «MD» non deve scattare dentro altre parole) */
    private static final Pattern SUPERMARKET = Pattern.compile(
        "(^|[^\\p{L}\\p{N}])(esselunga|conad|coop|ipercoop|carrefour|lidl|pam|panorama|eurospin|iper|md|aldi|penny|tigros|bennet|"
        + "despar|eurospar|interspar|spar|u2|unes|il gigante|famila|crai|sigma|supermerc\\p{L}*|ipermerc\\p{L}*|todis|tuodi|basko|naturasi)"
        + "([^\\p{L}\\p{N}]|$)", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    /** «€ 62,40», «62,40 €», «EUR 62,40», «€1.234,56» */
    private static final String NUM = "(\\d{1,3}(?:[.\\u00a0 ]\\d{3})+(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)";
    private static final Pattern AMOUNT = Pattern.compile("(?:€|EUR)\\s*" + NUM + "|" + NUM + "\\s*(?:€|EUR)", Pattern.CASE_INSENSITIVE);

    private WalletParser() { }

    static boolean accepts(String pkg, boolean debug) {
        return WALLET.equals(pkg) || (debug && "com.android.shell".equals(pkg));
    }

    /** null se non è un pagamento in un supermercato */
    static Pay parse(String title, String text) {
        title = title == null ? "" : title.trim();
        text = text == null ? "" : text.trim();
        String all = title + "\n" + text;
        if (NOT_A_PAYMENT.matcher(all).find()) return null;
        Double imp = amount(text);
        if (imp == null) imp = amount(title);
        if (imp == null || imp <= 0 || imp >= 2000) return null;
        // il negozio è il titolo; se il titolo è solo l'importo, la prima riga del testo
        String negozio = amount(title) != null && title.replaceAll("[\\d.,€\\s]|EUR", "").isEmpty() ? text.split("\\n")[0] : title;
        if (!SUPERMARKET.matcher(negozio).find() && !SUPERMARKET.matcher(all).find()) return null;
        negozio = negozio.replaceAll("\\s+", " ").trim();
        if (negozio.length() > 60) negozio = negozio.substring(0, 60).trim();
        return new Pay(negozio, imp);
    }

    static Double amount(String s) {
        Matcher m = AMOUNT.matcher(s == null ? "" : s);
        if (!m.find()) return null;
        String n = (m.group(1) != null ? m.group(1) : m.group(2)).replace(" ", "").replace(" ", "");
        if (n.contains(",")) n = n.replace(".", "").replace(",", ".");          // 1.234,56 -> 1234.56
        else if (n.matches("\\d{1,3}(\\.\\d{3})+")) n = n.replace(".", "");      // 1.234 -> 1234
        try { return Math.round(Double.parseDouble(n) * 100) / 100.0; } catch (NumberFormatException e) { return null; }
    }

    static String pay(long postTime, double importo) {
        return "pay_" + postTime + "_" + Math.round(importo * 100);
    }

    /** stesso pagamento se l'ora differisce meno di 2 minuti e l'importo meno dell'1% */
    static boolean samePayment(long t1, double a1, long t2, double a2) {
        return Math.abs(t1 - t2) < 120_000 && Math.abs(a1 - a2) <= Math.max(a1, a2) * 0.01;
    }

    static String euro(double v) {
        return String.format(Locale.ITALY, "%.2f €", v);
    }
}
