#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de Prueba Rápida de Locución con Google AI Studio (Gemini 2.0 Audio)
Permite generar una locución inmediata y verificar la prosodia dramática.
"""
import os
import sys
import argparse

sys.path.insert(0, r"C:\tiktok")
from generar_audio_gemini import generate_voice_smart, resolve_gemini_api_key

def main():
    parser = argparse.ArgumentParser(description="Prueba Rápida de Audio Gemini")
    parser.add_argument("--texto", default="Tu cerebro encoge 2 milímetros cada vez que miras este símbolo.", help="Texto a sintetizar")
    parser.add_argument("--voz", default="Charon", help="Voz Gemini: Charon, Puck, Kore, Fenrir, Aoede")
    parser.add_argument("--nicho", default="Misterio", help="Nicho temático para dirección escénica")
    parser.add_argument("--salida", default=r"C:\tiktok\audio\test_gemini.mp3", help="Ruta del archivo de salida")
    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.salida), exist_ok=True)
    api_key = resolve_gemini_api_key()

    print("==================================================")
    print("PRUEBA RÁPIDA DE LOCUCIÓN: GOOGLE AI STUDIO")
    print(f"  Voz: {args.voz} | Nicho: {args.nicho}")
    print(f"  Texto: \"{args.texto}\"")
    print(f"  Destino: {args.salida}")
    print(f"  API Key Detectada: {'SÍ' if api_key else 'NO (Modo Fallback Edge-TTS)'}")
    print("==================================================")

    dur, provider = generate_voice_smart(args.texto, args.salida, args.voz, args.nicho, api_key)
    print(f"\n[Éxito] Audio generado en: {args.salida}")
    print(f"  Proveedor: {provider}")
    print(f"  Duración: {dur:.2f} segundos")
    print(f"  Tamaño: {os.path.getsize(args.salida)} bytes")
    print("\nPara reproducir en PowerShell:")
    print(f'  Start-Process "{args.salida}"')

if __name__ == "__main__":
    main()
