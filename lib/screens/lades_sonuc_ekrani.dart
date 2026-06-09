import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

class LadesSonucEkrani extends StatefulWidget {
  const LadesSonucEkrani({super.key});

  @override
  State<LadesSonucEkrani> createState() => _LadesSonucEkraniState();
}

class _LadesSonucEkraniState extends State<LadesSonucEkrani> {
  void _ladesiSonuclandirVeDagit(
      Map<String, dynamic> lades, String dogruSonuc) {
    // 🛠️ Güvenli veri okuma filtresi (Hatalı Null cast durumunu engeller)
    var hamKatilimcilar = lades['katilimcilar'];
    List<dynamic> katilimcilar =
        (hamKatilimcilar is List) ? hamKatilimcilar : [];

    if (katilimcilar.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content:
              Text("Bu ladese katılan kimse olmadığı için ödül dağıtılmadı."),
          backgroundColor: Colors.orangeAccent,
        ),
      );
      setState(() {
        lades['durum'] = 'Sonuçlandı ($dogruSonuc)';
      });
      return;
    }

    double toplamHavuz = 0.0;
    double kazananlarinToplamYatirimi = 0.0;

    for (var katilimci in katilimcilar) {
      if (katilimci == null || katilimci is! Map) continue;
      double miktar = 0.0;
      if (katilimci['miktar'] != null) {
        miktar = (katilimci['miktar'] as num).toDouble();
      }
      toplamHavuz += miktar;

      if (katilimci['tahmin'] == dogruSonuc) {
        kazananlarinToplamYatirimi += miktar;
      }
    }

    if (kazananlarinToplamYatirimi == 0.0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              "Bu iddiada '$dogruSonuc' tahminini yapan kimse yok. Tokenlar havuzda kaldı!"),
          backgroundColor: Colors.redAccent,
        ),
      );
      setState(() {
        lades['durum'] = 'Sonuçlandı ($dogruSonuc)';
      });
      return;
    }

    double carpan = toplamHavuz / kazananlarinToplamYatirimi;

    for (var katilimci in katilimcilar) {
      if (katilimci == null || katilimci is! Map) continue;
      String email = katilimci['email'] ?? '';
      if (email.isEmpty) continue;

      double miktar = 0.0;
      if (katilimci['miktar'] != null) {
        miktar = (katilimci['miktar'] as num).toDouble();
      }

      if (katilimci['tahmin'] == dogruSonuc) {
        double kazanilanToplam = miktar * carpan;

        final mevcutBakiye =
            (kullaniciBakiyeleri[email] as num?)?.toDouble() ?? 0.0;
        kullaniciBakiyeleri[email] = mevcutBakiye + kazanilanToplam;

        globalBildirimler.add({
          'id': DateTime.now().millisecondsSinceEpoch,
          'baslik': 'Tebrikler, Kazandınız! 🏆',
          'icerik':
              '"${lades['baslik']}" iddisında kazandınız. Hesabınıza ${kazanilanToplam.toStringAsFixed(1)} ₺ eklendi!',
          'tarih': DateTime.now(),
          'okundu': false,
        });
      } else {
        globalBildirimler.add({
          'id': DateTime.now().millisecondsSinceEpoch,
          'baslik': 'Lades Sonuçlandı 😔',
          'icerik':
              '"${lades['baslik']}" iddisını kaybettiniz. Bir dahaki sefere bol şans!',
          'tarih': DateTime.now(),
          'okundu': false,
        });
      }
    }

    setState(() {
      lades['durum'] = 'Sonutcnowlandı ($dogruSonuc)';
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
            "Lades sonuçlandı! ${toplamHavuz.toStringAsFixed(1)} ₺ havuz kazananlara dağıtıldı."),
        backgroundColor: AppColors.primary,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          "Lades Sonuçları Ekranı",
          style: TextStyle(
              fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16),
        ),
        backgroundColor: const Color(0xFF0D111A),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "AKTİF SÖZLEŞMELERİ VE İDDİALARI KARARA BAĞLA",
              style: TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
                fontSize: 11,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 16),
            globalLadesler.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.only(top: 40.0),
                      child: Text(
                        "Sonuçlandırılacak aktif lades bulunmuyor.",
                        style: TextStyle(color: Colors.white54, fontSize: 13),
                      ),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: globalLadesler.length,
                    itemBuilder: (context, index) {
                      var lades = globalLadesler[index];

                      String mevcutDurum =
                          (lades['durum'] ?? 'Aktif').toString();
                      bool kapatilabilirMi =
                          !mevcutDurum.contains('Sonuçlandı');

                      // 🛠️ Null-safe koruması listeye de eklendi
                      var hamKatilimcilar = lades['katilimcilar'];
                      List<dynamic> katilimciListesi =
                          (hamKatilimcilar is List) ? hamKatilimcilar : [];

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0D111A),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: kapatilabilirMi
                                ? Colors.white10
                                : Colors.white24,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    lades['baslik'] ?? 'İsimsiz Lades',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: kapatilabilirMi
                                        ? AppColors.primary
                                            .withValues(alpha: 0.1)
                                        : Colors.white10,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    kapatilabilirMi
                                        ? "Aktif / Açık"
                                        : mevcutDurum,
                                    style: TextStyle(
                                      color: kapatilabilirMi
                                          ? AppColors.primary
                                          : Colors.white54,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              "Toplam Katılımcı: ${katilimciListesi.length} kişi",
                              style: const TextStyle(
                                  color: Colors.white54, fontSize: 12),
                            ),
                            const SizedBox(height: 14),
                            if (kapatilabilirMi) ...[
                              const Text(
                                "LADESİ SONUÇLANDIR (KAZANANI SEÇ):",
                                style: TextStyle(
                                  color: Colors.white38,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.primary,
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                      ),
                                      onPressed: () =>
                                          _ladesiSonuclandirVeDagit(
                                              lades, 'Evet'),
                                      child: const Text(
                                        "EVET KAZANDI",
                                        style: TextStyle(
                                          color: Colors.black,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 11,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.secondary,
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                      ),
                                      onPressed: () =>
                                          _ladesiSonuclandirVeDagit(
                                              lades, 'Hayır'),
                                      child: const Text(
                                        "HAYIR KAZANDI",
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 11,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              )
                            ] else
                              Text(
                                "Durum: $mevcutDurum",
                                style: const TextStyle(
                                  color: Colors.white38,
                                  fontSize: 12,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
          ],
        ),
      ),
    );
  }
}
