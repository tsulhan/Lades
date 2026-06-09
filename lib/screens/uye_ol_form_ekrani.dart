import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

class UyeOlFormEkrani extends StatefulWidget {
  const UyeOlFormEkrani({super.key});

  @override
  State<UyeOlFormEkrani> createState() => _UyeOlFormEkraniState();
}

class _UyeOlFormEkraniState extends State<UyeOlFormEkrani> {
  final _formKey = GlobalKey<FormState>();

  final _davetKoduController = TextEditingController();
  final _kullaniciAdiController = TextEditingController();
  final _emailController = TextEditingController();
  final _sifreController = TextEditingController();
  final _dialogAdSoyadController = TextEditingController();

  bool _sifreGizli = true;

  void _kodIsteDialogGoster() {
    _dialogAdSoyadController.clear();
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF0D111A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF00F5D4), width: 1),
          ),
          title: const Row(
            children: [
              Icon(Icons.vpn_key_rounded, color: Color(0xFF00F5D4)),
              SizedBox(width: 10),
              Text("Davet Kodu İste",
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                  "Davet kodu talebinde bulunmak için lütfen adınızı ve soyadınızı girin.",
                  style: TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _dialogAdSoyadController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: InputDecoration(
                  labelText: "Ad Soyad",
                  labelStyle:
                      const TextStyle(color: Colors.white54, fontSize: 12),
                  filled: true,
                  fillColor: const Color(0xFF1F2633),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: Colors.grey.shade800)),
                  focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFF00F5D4))),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("İPTAL",
                  style: TextStyle(
                      color: Colors.white54, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00F5D4),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8))),
              onPressed: () {
                String adSoyad = _dialogAdSoyadController.text.trim();
                if (adSoyad.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text("Lütfen Ad Soyad alanını doldurun!"),
                      backgroundColor: Colors.redAccent));
                  return;
                }
                setState(() {
                  globalBildirimler.add({
                    'id': DateTime.now().millisecondsSinceEpoch.toString(),
                    'baslik': 'Yeni Davet Kodu Talebi',
                    'mesaj': '$adSoyad davet kodu istedi.',
                    'zaman': 'Az önce',
                    'okundu': false,
                    'tip': 'SİSTEM'
                  });
                });
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text("Talebiniz iletildi, $adSoyad!"),
                    backgroundColor: const Color(0xFF00F5D4)));
              },
              child: const Text("İSTEK GÖNDER",
                  style: TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                      fontSize: 12)),
            ),
          ],
        );
      },
    );
  }

  // 💾 YENİ KULLANICI KAYIT OLMA AŞAMASI
  void _uyeOl() {
    FocusScope.of(context).unfocus();

    String kod = _davetKoduController.text.trim().toUpperCase();
    String kAdi = _kullaniciAdiController.text.trim();
    String email = _emailController.text.trim().toLowerCase();
    String sifre = _sifreController.text.trim();

    if (kod.isEmpty || kAdi.isEmpty || email.isEmpty || sifre.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text("Lütfen tüm alanları doldurun!"),
            backgroundColor: Colors.redAccent),
      );
      return;
    }

    if (!lokalDavetKodlari.contains(kod)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text("Yetersiz veya geçersiz bir Davet Kodu girdiniz!"),
            backgroundColor: Colors.redAccent),
      );
      return;
    }

    setState(() {
      // 🔐 Şifre doğrulaması için merkezi havuzumuza (kullaniciSifreleri) email ve şifreyi kaydediyoruz
      kullaniciSifreleri[email] = sifre;

      // Bakiye havuzuna ekliyoruz
      if (!kullaniciBakiyeleri.containsKey(email)) {
        kullaniciBakiyeleri[email] = 1000;
      }

      // Davet kodunu siliyoruz
      lokalDavetKodlari.remove(kod);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
          content:
              Text("Hesabınız başarıyla oluşturuldu! Giriş yapabilirsiniz."),
          backgroundColor: Color(0xFF00F5D4)),
    );

    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF060913),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text("Kayıt Ol",
            style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.white,
                fontSize: 16)),
        backgroundColor: const Color(0xFF0D111A),
        elevation: 0,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _davetKoduController,
                        style:
                            const TextStyle(color: Colors.white, fontSize: 14),
                        decoration: _inputDecoration("Davet Kodu"),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor:
                              const Color(0xFF00F5D4).withValues(alpha: 0.15),
                          side: const BorderSide(
                              color: Color(0xFF00F5D4), width: 1),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _kodIsteDialogGoster,
                        child: const Text("KOD İSTE",
                            style: TextStyle(
                                color: Color(0xFF00F5D4),
                                fontWeight: FontWeight.bold,
                                fontSize: 12)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _kullaniciAdiController,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: _inputDecoration("Kullanıcı Adı"),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _emailController,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: _inputDecoration("E-posta"),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _sifreController,
                  obscureText: _sifreGizli,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: _inputDecoration("Şifre").copyWith(
                    suffixIcon: IconButton(
                      icon: Icon(
                          _sifreGizli ? Icons.visibility_off : Icons.visibility,
                          color: Colors.grey),
                      onPressed: () =>
                          setState(() => _sifreGizli = !_sifreGizli),
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00F5D4),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: _uyeOl,
                    child: const Text("KAYIT OL",
                        style: TextStyle(
                            color: Colors.black, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Colors.white54, fontSize: 13),
      filled: true,
      fillColor: const Color(0xFF0D111A),
      enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade800)),
      focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF00F5D4))),
    );
  }
}
