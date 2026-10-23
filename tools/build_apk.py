#!/usr/bin/env python3
"""Compila l'APK release di Schiscetta senza Gradle, con gli strumenti dell'Android SDK.

Uso:
    python tools/build_apk.py             # HTML + APK release firmato -> dist/schiscetta.apk
    python tools/build_apk.py --bump      # prima aumenta la versione (android/version.json)
    python tools/build_apk.py --install   # alla fine installa sul telefono/emulatore collegato (adb)

Firma: chiave release in android/keystore/release.jks, creata la prima volta con una password casuale
salvata in android/keystore/release.properties. La cartella non è versionata: FANNE UN BACKUP.
Senza la stessa chiave Android non installa gli aggiornamenti sopra l'app (bisogna disinstallare e si
perdono i dati, salvo backup dall'app).

Passi: build.py (HTML) -> aapt2 compile/link -> javac -> d8 -> zip -> zipalign -> apksigner.
"""
import glob, json, os, secrets, shutil, subprocess, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AND = os.path.join(ROOT, "android")
SRC = os.path.join(AND, "app", "src", "main")
BUILD = os.path.join(AND, "build-cli")
OUT = os.path.join(ROOT, "dist", "schiscetta.apk")
KS = os.path.join(AND, "keystore", "release.jks")
PROPS = os.path.join(AND, "keystore", "release.properties")
VERSION = os.path.join(AND, "version.json")
MIN_SDK, TARGET_SDK, ALIAS = "26", "34", "schiscetta"


def sh(cmd, env=None):
    r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if r.returncode != 0:
        print(r.stdout, r.stderr)
        sys.exit("Comando fallito: " + " ".join(cmd[:2]))
    return r.stdout


def keystore_env():
    """Crea la chiave release se manca e restituisce l'ambiente con la password (mai sulla riga di comando)."""
    if not os.path.exists(KS):
        os.makedirs(os.path.dirname(KS), exist_ok=True)
        pw = secrets.token_urlsafe(24)
        with open(PROPS, "w", encoding="utf-8") as f:
            f.write(f"# Chiave release di Schiscetta: conserva una copia di release.jks e di questo file\n"
                    f"storeFile=release.jks\nkeyAlias={ALIAS}\nstorePassword={pw}\nkeyPassword={pw}\n")
        env = dict(os.environ, SCHISCETTA_KS_PASS=pw)
        sh(["keytool", "-genkeypair", "-keystore", KS, "-storetype", "PKCS12", "-storepass:env", "SCHISCETTA_KS_PASS",
            "-alias", ALIAS, "-keyalg", "RSA", "-keysize", "3072", "-validity", "10000",
            "-dname", "CN=Schiscetta, O=Schiscetta, C=IT"], env)
        print("Creata la chiave release in android/keystore/ (fanne un backup!)")
    props = dict(l.strip().split("=", 1) for l in open(PROPS, encoding="utf-8") if "=" in l and not l.startswith("#"))
    return dict(os.environ, SCHISCETTA_KS_PASS=props["storePassword"])


DEBUG = "--debug" in sys.argv   # build di prova: debuggable (WebView ispezionabile, Wallet accetta anche le notifiche della shell)


def main():
    sdk = os.environ.get("ANDROID_HOME") or os.path.join(os.environ.get("LOCALAPPDATA", ""), "Android", "Sdk")
    plat = sorted(glob.glob(os.path.join(sdk, "platforms", "android-*")))[-1]
    bt = sorted(glob.glob(os.path.join(sdk, "build-tools", "*")))[-1]
    android_jar = os.path.join(plat, "android.jar")
    exe, bat = (".exe", ".bat") if os.name == "nt" else ("", "")
    aapt2, d8, zipalign, apksigner = (os.path.join(bt, n) for n in (f"aapt2{exe}", f"d8{bat}", f"zipalign{exe}", f"apksigner{bat}"))

    ver = json.load(open(VERSION, encoding="utf-8"))
    if "--bump" in sys.argv:
        ver["code"] += 1
        major, minor = ver["name"].split(".")[:2]
        ver["name"] = f"{major}.{int(minor) + 1}"
        json.dump(ver, open(VERSION, "w", encoding="utf-8"))
    print(f"SDK {os.path.basename(plat)}, build-tools {os.path.basename(bt)} · versione {ver['name']} ({ver['code']})")

    sh([sys.executable, os.path.join(ROOT, "tools", "build.py")])
    shutil.rmtree(BUILD, ignore_errors=True)
    assets = os.path.join(BUILD, "assets"); os.makedirs(assets)
    shutil.copy(os.path.join(ROOT, "dist", "schiscetta.html"), os.path.join(assets, "index.html"))

    # 1) risorse e manifest
    res_zip = os.path.join(BUILD, "res.zip")
    sh([aapt2, "compile", "--dir", os.path.join(SRC, "res"), "-o", res_zip])
    gen = os.path.join(BUILD, "gen"); os.makedirs(gen)
    base = os.path.join(BUILD, "base.apk")
    sh([aapt2, "link", "-o", base, "-I", android_jar, "--manifest", os.path.join(SRC, "AndroidManifest.xml"),
        "-A", assets, "--java", gen, "--min-sdk-version", MIN_SDK, "--target-sdk-version", TARGET_SDK,
        "--version-code", str(ver["code"]), "--version-name", ver["name"], res_zip]
       + (["--debug-mode"] if DEBUG else []))

    # 2) Java -> class -> dex
    classes = os.path.join(BUILD, "classes"); os.makedirs(classes)
    javas = glob.glob(os.path.join(SRC, "java", "**", "*.java"), recursive=True) + glob.glob(os.path.join(gen, "**", "*.java"), recursive=True)
    sh(["javac", "--release", "11", "-nowarn", "-Xlint:-options", "-cp", android_jar, "-d", classes] + javas)
    dex = os.path.join(BUILD, "dex"); os.makedirs(dex)
    sh([d8, "--release", "--min-api", MIN_SDK, "--lib", android_jar, "--output", dex] + glob.glob(os.path.join(classes, "**", "*.class"), recursive=True))

    # 3) apk non firmato = base + classes.dex, poi allineato
    unsigned = os.path.join(BUILD, "unsigned.apk")
    shutil.copy(base, unsigned)
    with zipfile.ZipFile(unsigned, "a", zipfile.ZIP_DEFLATED) as z:
        z.write(os.path.join(dex, "classes.dex"), "classes.dex")
    aligned = os.path.join(BUILD, "aligned.apk")
    sh([zipalign, "-p", "-f", "4", unsigned, aligned])

    # 4) firma release
    env = keystore_env()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    out = OUT.replace(".apk", "-debug.apk") if DEBUG else OUT
    sh([apksigner, "sign", "--ks", KS, "--ks-key-alias", ALIAS, "--ks-pass", "env:SCHISCETTA_KS_PASS",
        "--key-pass", "env:SCHISCETTA_KS_PASS", "--out", out, aligned], env)
    sh([apksigner, "verify", out])
    for f in glob.glob(out + ".idsig"): os.remove(f)
    print(f"Creato dist/{os.path.basename(out)} ({os.path.getsize(out) / 1024:.0f} KB), {'DEBUG (solo prove)' if DEBUG else 'release'} firmato e verificato")

    if "--install" in sys.argv:
        print(sh(["adb", "install", "-r", out]).strip())


if __name__ == "__main__":
    main()
