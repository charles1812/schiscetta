#!/usr/bin/env python3
"""Compila e lancia la prova della lettura delle notifiche di Google Wallet (Java puro, senza Android).

Uso: python tools/test_wallet.py
"""
import os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "android", "app", "src", "main", "java", "com", "charles", "schiscetta", "WalletParser.java")
TEST = os.path.join(ROOT, "tools", "WalletParserTest.java")

with tempfile.TemporaryDirectory() as d:
    subprocess.run(["javac", "-encoding", "UTF-8", "-d", d, SRC, TEST], check=True)
    sys.exit(subprocess.run(["java", "-Dfile.encoding=UTF-8", "-cp", d, "com.charles.schiscetta.WalletParserTest"]).returncode)
