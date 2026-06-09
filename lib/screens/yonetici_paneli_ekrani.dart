import 'package:flutter/material.dart';
import 'lades_sonuc_ekrani.dart';
import '../constants/app_constants.dart'; // 🌟 Sizin paylaştığınız app_constants dosyasını okur

class YoneticiPaneliEkrani extends StatefulWidget {
  const YoneticiPaneliEkrani({super.key});

  @override
  State<YoneticiPaneliEkrani> createState() => _YoneticiPaneliEkraniState();
}

class _YoneticiPaneliEkraniState extends State<YoneticiPaneliEkrani> {
  final _yeniKodController = TextEditingController();

  @override
  void dispose() {
    _yeniKodController.dispose();
    super.dispose();
  }

  // 🔑 Yeni Davet/Promo Kodu Üretme Fonksiyonu
  void _kodOlustur() {
    String yeniKod = _yeniKodController.text.trim().toUpperCase();
    if (yeniKod.isEmpty) return;

    if (globalGecerliKodlar.contains(yeniKod) ||
        lokalDavetKodlari.contains(yeniKod)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text("Bu kod sistemde zaten mevcut!"),
            backgroundColor: Colors.orangeAccent),
      );
      return;
    }

    setState(() {
      globalGecerliKodlar.add(yeniKod);
    });
    _yeniKodController.clear();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
          content: Text("'$yeniKod' kodu sisteme başarıyla eklendi!"),
          backgroundColor: AppColors.primary),
    );
  }

  @override
  Widget build(BuildContext context) {
    // 🛡️ KESİN GÜVENLİK DUVARI (GUARD):
    // app_constants.dart içindeki 'gecerliKullaniciYoneticiMi' durumunu kontrol ediyoruz.
    // taylansulhan@gmail.com girdiğinde bu değer false olacağından sızma anında bloke edilir.
    bool isAdmin = gecerliKullaniciYoneticiMi;

    if (!isAdmin) {
      return Scaffold(
        backgroundColor: const Color(0xFF0D111A),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.shield_outlined, color: Colors.redAccent, size: 64),
                SizedBox(height: 16),
                Text(
                  "YETKİSİZ ERİŞİM",
                  style: TextStyle(
                      color: Colors.redAccent,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1),
                ),
                SizedBox(height: 8),
                Text(
                  "Bu sayfayı görüntülemek için yönetici yetkilerine sahip olmanız gerekmektedir.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white54, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // 🔑 Eğer kullanıcı admindeyse (tsulhan@gmail.com vb.), panel normal şekilde yüklenir:
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          "Yönetici Kontrol Paneli",
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
            // ================= 1. BÖLÜM: LADES SONUÇLANDIRMA ALANI =================
            const Text(
              "SÖZLEŞME VE LADES KARAR MERKEZİ",
              style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                  letterSpacing: 1),
            ),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF0D111A),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white10),
              ),
              child: ListTile(
                leading:
                    const Icon(Icons.gavel_rounded, color: AppColors.secondary),
                title: const Text(
                  "Biten Ladesleri Yönet & Dağıt",
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold),
                ),
                subtitle: const Text(
                  "Aktif iddiaları sonlandır ve ödül havuzunu dağıt",
                  style: TextStyle(color: Colors.white54, fontSize: 11),
                ),
                trailing: const Icon(Icons.arrow_forward_ios_rounded,
                    color: Colors.white24, size: 16),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const LadesSonucEkrani()),
                  );
                },
              ),
            ),

            const SizedBox(height: 24),

            // ================= 2. BÖLÜM: KOD GENERATOR (PROMO / DAVET KODU) =================
            const Text(
              "KOD GENERATOR (SİSTEM SABİTLERİ)",
              style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                  letterSpacing: 1),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF0D111A),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _yeniKodController,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: "Örn: LADES2026",
                        hintStyle: const TextStyle(
                            color: Colors.white24, fontSize: 13),
                        filled: true,
                        fillColor: const Color(0xFF141A26),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide.none),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: _kodOlustur,
                    child: const Text("KOD ÜRET",
                        style: TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 12)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // ================= 3. BÖLÜM: GELEN TALEPLER PANELİ (TOKEN & DAVET) =================
            const Text(
              "GELEN KULLANICI TALEPLERİ",
              style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                  letterSpacing: 1),
            ),
            const SizedBox(height: 10),

            if (globalTokenTalepleri.isEmpty &&
                globalDavetKoduTalepleri.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    color: const Color(0xFF0D111A),
                    borderRadius: BorderRadius.circular(12)),
                child: const Center(
                    child: Text("Bekleyen herhangi bir talep bulunmuyor.",
                        style: TextStyle(color: Colors.white38, fontSize: 12))),
              )
            else ...[
              // Token Talepleri
              ...globalTokenTalepleri.map((talep) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D111A),
                    borderRadius: BorderRadius.circular(10),
                    border:
                        Border.all(color: Colors.amber.withValues(alpha: 0.2)),
                  ),
                  child: ListTile(
                    dense: true,
                    leading: const Icon(Icons.monetization_on_rounded,
                        color: Colors.amber, size: 20),
                    title: Text(talep['email'] ?? 'Bilinmeyen Kullanıcı',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.bold)),
                    subtitle: Text("Miktar: ${talep['miktar']} Token",
                        style: const TextStyle(
                            color: Colors.white54, fontSize: 11)),
                    trailing: IconButton(
                      icon: const Icon(Icons.check_circle_outline_rounded,
                          color: Colors.greenAccent, size: 22),
                      onPressed: () {
                        setState(() {
                          String email = talep['email'] ?? '';
                          double eklenen =
                              (talep['miktar'] as num?)?.toDouble() ?? 0.0;
                          kullaniciBakiyeleri[email] =
                              ((kullaniciBakiyeleri[email] as num?)
                                          ?.toDouble() ??
                                      0.0) +
                                  eklenen;
                          globalTokenTalepleri.remove(talep);
                        });
                      },
                    ),
                  ),
                );
              }).toList(),

              // Davet Kodu Talepleri
              ...globalDavetKoduTalepleri.map((talep) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D111A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: AppColors.secondary.withValues(alpha: 0.2)),
                  ),
                  child: ListTile(
                    dense: true,
                    leading: const Icon(Icons.vpn_key_rounded,
                        color: AppColors.secondary, size: 20),
                    title: Text(talep['email'] ?? 'Bilinmeyen Kullanıcı',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.bold)),
                    subtitle: Text("Talep Nedeni: Davet Kodu İsteği",
                        style: const TextStyle(
                            color: Colors.white54, fontSize: 11)),
                    trailing: IconButton(
                      icon: const Icon(Icons.send_rounded,
                          color: Colors.blueAccent, size: 20),
                      onPressed: () {
                        setState(() {
                          globalDavetKoduTalepleri.remove(talep);
                        });
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text(
                                    "Davet kodu kullanıcıya gönderildi.")));
                      },
                    ),
                  ),
                );
              }).toList(),
            ],

            const SizedBox(height: 24),

            // ================= 4. BÖLÜM: KAYITLI KULLANICI LİSTESİ =================
            const Text(
              "SİSTEME KAYITLI KULLANICI LİSTESİ",
              style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                  letterSpacing: 1),
            ),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF0D111A),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white10),
              ),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: globalKullanicilar.length,
                separatorBuilder: (context, index) =>
                    const Divider(color: Colors.white10, height: 1),
                itemBuilder: (context, index) {
                  var user = globalKullanicilar[index];
                  String uEmail = user['email'] ?? '';
                  double bakiye =
                      (kullaniciBakiyeleri[uEmail] as num?)?.toDouble() ?? 0.0;

                  return ListTile(
                    dense: true,
                    leading: CircleAvatar(
                      backgroundColor: const Color(0xFF141A26),
                      radius: 14,
                      child: Text(
                        (user['adSoyad'] ?? 'U').substring(0, 1).toUpperCase(),
                        style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.bold),
                      ),
                    ),
                    title: Text(user['adSoyad'] ?? 'İsimsiz Kullanıcı',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.bold)),
                    subtitle: Text(uEmail,
                        style: const TextStyle(
                            color: Colors.white38, fontSize: 11)),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                          color: const Color(0xFF1F2633),
                          borderRadius: BorderRadius.circular(8)),
                      child: Text(
                        "${bakiye.toStringAsFixed(0)} T",
                        style: const TextStyle(
                            color: Colors.amber,
                            fontWeight: FontWeight.bold,
                            fontSize: 12),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
