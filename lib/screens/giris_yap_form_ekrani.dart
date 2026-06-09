import 'package:flutter/material.dart';
import '../constants/app_constants.dart';
import '../main.dart'; // Bu satırı silebilirsin ya da hata vermesini engellemek için kodda tuttuk ama yönlendirmeyi düzelttik

class GirisYapFormEkrani extends StatefulWidget {
  const GirisYapFormEkrani({super.key});

  @override
  State<GirisYapFormEkrani> createState() => _GirisYapFormEkraniState();
}

class _GirisYapFormEkraniState extends State<GirisYapFormEkrani> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _sifreController = TextEditingController();

  void _girisYap() {
    if (_formKey.currentState!.validate()) {
      String email = _emailController.text.trim();
      String sifre = _sifreController.text.trim();

      if (kullaniciSifreleri.containsKey(email) &&
          kullaniciSifreleri[email] == sifre) {
        gecerliKullaniciEmail = email;
        gecerliKullaniciYoneticiMi = (email == 'tsulhan@gmail.com');

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text("Giriş Başarılı! Hoş geldin, $email"),
              backgroundColor: AppColors.primary),
        );

        // 🎯 Buradaki yönlendirme hedefi 'AnaEkran' olarak düzeltildi
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const AnaEkran()),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text("Hatalı e-posta veya şifre!"),
              backgroundColor: AppColors.secondary),
        );
      }
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _sifreController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text("🎲 LADES PANELİ",
                    style: TextStyle(
                        color: AppColors.textMain,
                        fontSize: 24,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text("Giriş Yap ve Bahse Katıl",
                    style: TextStyle(color: AppColors.textGrey, fontSize: 14)),
                const SizedBox(height: 32),
                TextFormField(
                  controller: _emailController,
                  style: const TextStyle(color: AppColors.textMain),
                  decoration: InputDecoration(
                    labelText: "E-posta Adresi",
                    labelStyle: const TextStyle(color: AppColors.textGrey),
                    filled: true,
                    fillColor: const Color(0xFF0D111A),
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade900)),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.primary)),
                  ),
                  validator: (v) => (v == null || !v.contains('@'))
                      ? "Geçerli bir e-posta girin!"
                      : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _sifreController,
                  obscureText: true,
                  style: const TextStyle(color: AppColors.textMain),
                  decoration: InputDecoration(
                    labelText: "Şifre",
                    labelStyle: const TextStyle(color: AppColors.textGrey),
                    filled: true,
                    fillColor: const Color(0xFF0D111A),
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade900)),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.primary)),
                  ),
                  validator: (v) =>
                      (v == null || v.isEmpty) ? "Şifre boş olamaz!" : null,
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12))),
                    onPressed: _girisYap,
                    child: const Text("GİRİŞ YAP",
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
}
