import 'package:flutter/material.dart';

// --- KULLANICI VE YÖNETİCİ BİLGİLERİ ---
List<Map<String, dynamic>> globalKullanicilar = [
  {
    'email': 'tsulhan@gmail.com',
    'sifre': '123456',
    'adSoyad': 'T. Sulhan',
    'kullaniciAdi': 'tsulhan',
  },
  {
    'email': 'taylansulhan@gmail.com',
    'sifre': '1234',
    'adSoyad': 'Taylan Sulhan',
    'kullaniciAdi': 'taylansulhan',
  },
];

// 🔐 EKRANLARIN ŞİFRE DOĞRULAMASI İÇİN ARADIĞI MERKEZİ HAVUZ
Map<String, String> kullaniciSifreleri = {
  'tsulhan@gmail.com': '123456',
  'taylansulhan@gmail.com': '1234',
};

// --- EKRANLARIN ARADIĞI EKSİK GLOBAL LİSTELER ---
List<Map<String, dynamic>> globalLadesler = [];
List<Map<String, dynamic>> globalTokenTalepleri = [];
List<Map<String, String>> globalDavetKoduTalepleri = [];

// --- GÜVENLİK VE BAKİYE ---
List<String> globalGecerliKodlar = ['LADES2024', 'TOKEN123', 'KAZAN55'];
Map<String, dynamic> kullaniciBakiyeleri = {
  'tsulhan@gmail.com': 1000.0,
  'taylansulhan@gmail.com': 500.0,
};

// --- OTURUM YÖNETİMİ ---
String? gecerliKullaniciEmail;
bool gecerliKullaniciYoneticiMi = false;

// --- TASARIM RENKLERİ ---
class AppColors {
  static const Color background = Color(0xFF060913);
  static const Color primary = Color(0xFF00F5D4);
  static const Color secondary = Color(0xFFFF006E);
  static const Color accent = Color(0xFFFFBE0B);
  static const Color textMain = Color(0xFFE2F1FF);
  static const Color textGrey = Colors.white70;
}

// --- BİLDİRİMLER VE DAVET KODLARI ---
List<Map<String, dynamic>> globalBildirimler = [
  {
    'id': 1,
    'baslik': 'Hoş Geldiniz! 🎯',
    'icerik':
        'Lades dünyasına hoş geldiniz. İddiaları takip edin ve tokenları katlayın!',
    'tarih': DateTime.now(),
    'okundu': false,
  }
];

List<String> lokalDavetKodlari = ['LADES2026', 'PROMO400', 'VIP123'];
