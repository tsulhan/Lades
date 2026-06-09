import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

class BildirimlerEkrani extends StatefulWidget {
  const BildirimlerEkrani({super.key});

  @override
  State<BildirimlerEkrani> createState() => _BildirimlerEkraniState();
}

class _BildirimlerEkraniState extends State<BildirimlerEkrani> {
  @override
  void initState() {
    super.initState();
    // Sayfa açıldığı an tüm okunmamış sistem bildirimlerini okundu olarak işaretle
    for (var b in globalBildirimler) {
      b['okundu'] = true;
    }
  }

  // 🛠️ Yardımcı Fonksiyon: Bildirim türüne göre ikon ve renk belirler (.withValues uyumlu)
  Map<String, dynamic> _getBildirimStili(String baslik) {
    if (baslik.contains('Yeni Bir Lades')) {
      return {
        'icon': Icons.bolt_rounded,
        'color': const Color(0xFFFFBE0B),
        'bg': const Color(0xFFFFBE0B).withValues(alpha: 0.08),
      };
    } else if (baslik.contains('Sonuçlandı') || baslik.contains('🏁')) {
      return {
        'icon': Icons.emoji_events_rounded,
        'color': const Color(0xFF00F5D4),
        'bg': const Color(0xFF00F5D4).withValues(alpha: 0.08),
      };
    } else {
      return {
        'icon': Icons.notifications_active_rounded,
        'color': const Color(0xFFFF006E),
        'bg': const Color(0xFFFF006E).withValues(alpha: 0.08),
      };
    }
  }

  @override
  Widget build(BuildContext context) {
    var istekListesi =
        globalLadesler.where((l) => l['kategori'] == 'İSTEK').toList();
    List<Map<String, dynamic>> birlesikListesi = [];

    // Yeni gelen genel/bakiye bildirimlerini ekle
    for (var b in globalBildirimler) {
      birlesikListesi.add({
        'tip': 'GENEL',
        'baslik': b['baslik'] ?? 'Bildirim',
        'icerik': b['icerik'] ?? '',
        'tarih': b['tarih'],
      });
    }

    // Davet kodu isteklerini ekle
    for (var ist in istekListesi) {
      birlesikListesi.add({
        'tip': 'İSTEK',
        'baslik': 'Davet Kodu Talebi 🔑',
        'icerik':
            ist['soru']?.toString() ?? 'Bir kullanıcı davet kodu talep etti.',
        'tarih': DateTime.now().subtract(const Duration(minutes: 30)),
      });
    }

    return Scaffold(
      backgroundColor: const Color(0xFF060913),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          "Bildirimler",
          style: TextStyle(
              fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16),
        ),
        backgroundColor: const Color(0xFF0D111A),
        elevation: 0,
        actions: [
          if (birlesikListesi.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: Center(
                child: Text(
                  "${birlesikListesi.length} Bildirim",
                  style: const TextStyle(color: Colors.white38, fontSize: 12),
                ),
              ),
            )
        ],
      ),
      body: birlesikListesi.isEmpty
          ? const Center(
              child: Text(
                "Yeni bildirim bulunmuyor.",
                style: TextStyle(color: Colors.grey, fontSize: 14),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: birlesikListesi.length,
              itemBuilder: (context, index) {
                var bildirim = birlesikListesi[index];

                IconData ikon;
                Color ikonRengi;
                Color arkaPlanRengi;

                if (bildirim['tip'] == 'İSTEK') {
                  ikon = Icons.vpn_key_rounded;
                  ikonRengi = const Color(0xFF00F5D4);
                  arkaPlanRengi = const Color(0xFF1F2633);
                } else {
                  var stil = _getBildirimStili(bildirim['baslik']);
                  ikon = stil['icon'];
                  ikonRengi = stil['color'];
                  arkaPlanRengi = stil['bg'];
                }

                return Card(
                  color: const Color(0xFF0D111A),
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                        color: Colors.grey.withValues(alpha: 0.05), width: 1),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4.0),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: arkaPlanRengi,
                        child: Icon(ikon, color: ikonRengi, size: 20),
                      ),
                      title: Text(
                        bildirim['baslik'],
                        style: TextStyle(
                          color: bildirim['tip'] == 'İSTEK'
                              ? const Color(0xFF00F5D4)
                              : Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      subtitle: Padding(
                        padding: const EdgeInsets.only(top: 4.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              bildirim['icerik'],
                              style: const TextStyle(
                                  color: Colors.white70, fontSize: 12),
                            ),
                            if (bildirim['tarih'] != null &&
                                bildirim['tarih'] is DateTime) ...[
                              const SizedBox(height: 6),
                              Text(
                                "${bildirim['tarih'].day}.${bildirim['tarih'].month} - ${bildirim['tarih'].hour}:${bildirim['tarih'].minute.toString().padLeft(2, '0')}",
                                style: const TextStyle(
                                    color: Colors.white24, fontSize: 9),
                              ),
                            ]
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
