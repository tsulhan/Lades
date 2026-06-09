import 'package:flutter/material.dart';
import 'package:firebase_database/firebase_database.dart';
import '../constants/app_constants.dart';

class YeniLadesFormu extends StatefulWidget {
  const YeniLadesFormu({super.key});

  @override
  State<YeniLadesFormu> createState() => _YeniLadesFormuState();
}

class _YeniLadesFormuState extends State<YeniLadesFormu> {
  final _formKey = GlobalKey<FormState>();
  final _soruController = TextEditingController();
  final _tokenController = TextEditingController();
  DateTime? _secilenTarih;
  String _secilenTaraf = 'EVET';

  Future<void> _tarihSec(BuildContext context) async {
    final DateTime? secilen = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.primary,
              onPrimary: Colors.black,
              surface: Color(0xFF0D111A),
              onSurface: AppColors.textMain,
            ),
          ),
          child: child!,
        );
      },
    );
    if (secilen != null && secilen != _secilenTarih) {
      setState(() {
        _secilenTarih = secilen;
      });
    }
  }

  void _ladesiBaslat() async {
    if (_formKey.currentState!.validate()) {
      if (_secilenTarih == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Lütfen Lades kapanış tarihini seçin!"),
            backgroundColor: AppColors.accent,
          ),
        );
        return;
      }

      String soru = _soruController.text.trim();
      double token = double.tryParse(_tokenController.text.trim()) ?? 0;
      String email = gecerliKullaniciEmail ?? "misafir@lades.com";

      if (token <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text("Geçerli bir token miktarı girin!"),
              backgroundColor: AppColors.accent),
        );
        return;
      }

      DatabaseReference ladesRef = FirebaseDatabase.instance.ref('ladesler');

      try {
        await ladesRef.push().set({
          'kategori': 'AKTİF',
          'soru': soru,
          'baslik': soru,
          'yaratan': email,
          'bakiye': token,
          'evet_havuz': _secilenTaraf == 'EVET' ? token : 0.0,
          'hayir_havuz': _secilenTaraf == 'HAYIR' ? token : 0.0,
          'tarih': _secilenTarih.toString(),
          'aktif': true,
          'yaratan_taraf': _secilenTaraf,
          'olusturulma_zamani': ServerValue.timestamp,
        });

        _soruController.clear();
        _tokenController.clear();
        setState(() {
          _secilenTarih = null;
          _secilenTaraf = 'EVET';
        });

        FocusScope.of(context).unfocus();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                  "🎯 Lades İddiası başarıyla oluşturuldu ve web üzerinde yayında!",
                  style: TextStyle(
                      color: Colors.black, fontWeight: FontWeight.bold)),
              backgroundColor: AppColors.primary,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text("Hata oluştu: $e"),
                backgroundColor: AppColors.secondary),
          );
        }
      }
    }
  }

  @override
  void dispose() {
    _soruController.dispose();
    _tokenController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 10),
            TextFormField(
              controller: _soruController,
              style: const TextStyle(color: AppColors.textMain, fontSize: 14),
              maxLines: 2,
              decoration: InputDecoration(
                labelText: "Lades Sorusu / İddia Konusu",
                labelStyle:
                    const TextStyle(color: AppColors.textGrey, fontSize: 12),
                prefixIcon: const Icon(Icons.help_outline_rounded,
                    color: AppColors.primary, size: 20),
                filled: true,
                fillColor: const Color(0xFF0D111A),
                enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey.shade900)),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.primary)),
              ),
              validator: (value) => (value == null || value.trim().isEmpty)
                  ? "Lütfen bir lades sorusu girin!"
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _tokenController,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: AppColors.textMain, fontSize: 14),
              decoration: InputDecoration(
                labelText: "Ortaya Konacak Başlangıç Token Miktarı",
                labelStyle:
                    const TextStyle(color: AppColors.textGrey, fontSize: 12),
                prefixIcon: const Icon(Icons.monetization_on_rounded,
                    color: AppColors.primary, size: 20),
                filled: true,
                fillColor: const Color(0xFF0D111A),
                enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey.shade900)),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.primary)),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty)
                  return "Lütfen token miktarını girin!";
                if (double.tryParse(value.trim()) == null)
                  return "Geçerli bir sayı girin!";
                return null;
              },
            ),
            const SizedBox(height: 16),
            const Text(
                "Hangi Taraftasınız? (Tokenınız bu olasılığa yatırılacak)",
                style: TextStyle(color: AppColors.textGrey, fontSize: 12)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _secilenTaraf = 'EVET'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _secilenTaraf == 'EVET'
                            ? AppColors.primary.withValues(alpha: 0.15)
                            : const Color(0xFF0D111A),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: _secilenTaraf == 'EVET'
                                ? AppColors.primary
                                : Colors.grey.shade800,
                            width: _secilenTaraf == 'EVET' ? 2 : 1),
                      ),
                      child: const Center(
                          child: Text("EVET'E YATIR",
                              style: TextStyle(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.bold))),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _secilenTaraf = 'HAYIR'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _secilenTaraf == 'HAYIR'
                            ? AppColors.secondary.withValues(alpha: 0.15)
                            : const Color(0xFF0D111A),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: _secilenTaraf == 'HAYIR'
                                ? AppColors.secondary
                                : Colors.grey.shade800,
                            width: _secilenTaraf == 'HAYIR' ? 2 : 1),
                      ),
                      child: const Center(
                          child: Text("HAYIR'A YATIR",
                              style: TextStyle(
                                  color: AppColors.secondary,
                                  fontWeight: FontWeight.bold))),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            InkWell(
              onTap: () => _tarihSec(context),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    color: const Color(0xFF0D111A),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade900)),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_today_rounded,
                        color: AppColors.primary, size: 18),
                    const SizedBox(width: 12),
                    Text(
                      _secilenTarih == null
                          ? "Lades Kapanış Tarihi Seç"
                          : "Kapanış: ${_secilenTarih!.day}.${_secilenTarih!.month}.${_secilenTarih!.year}",
                      style: TextStyle(
                          color: _secilenTarih == null
                              ? AppColors.textGrey
                              : AppColors.textMain,
                          fontWeight: _secilenTarih == null
                              ? FontWeight.normal
                              : FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 28),
            WidgetoryButton(onPressed: _ladesiBaslat),
          ],
        ),
      ),
    );
  }
}

class WidgetoryButton extends StatelessWidget {
  final VoidCallback onPressed;
  const WidgetoryButton({super.key, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.secondary,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12))),
        onPressed: onPressed,
        child: const Text("LADESİ BAŞLAT!",
            style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 1)),
      ),
    );
  }
}
