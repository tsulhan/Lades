import 'package:flutter/material.dart';
import '../constants/app_constants.dart';
import 'giris_yap_form_ekrani.dart';

class ProfilEkrani extends StatefulWidget {
  const ProfilEkrani({super.key});

  @override
  State<ProfilEkrani> createState() => _ProfilEkraniState();
}

class _ProfilEkraniState extends State<ProfilEkrani>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    String email = gecerliKullaniciEmail ?? "kullanici@lades.com";
    num bakiye = kullaniciBakiyeleri[email] ?? 0;

    // 📊 AKTİF İDDİALARIM: Kullanıcının EVET veya HAYIR havuzuna yatırım yaptığı ve hala AKTİF olan ladesler
    List aktifIddialar = globalLadesler.where((lades) {
      if (lades['aktif'] != true) return false;

      Map evetYatirimlar = lades['evet_yatirimlar'] ?? {};
      Map hayirYatirimlar = lades['hayir_yatirimlar'] ?? {};

      return lades['yaratan'] == email ||
          evetYatirimlar.containsKey(email) ||
          hayirYatirimlar.containsKey(email);
    }).toList();

    // 📜 GEÇMİŞ / ÖZET: Sonuçlanmış (aktif == false) ve kullanıcının katılmış olduğu ladeslerin dinamik listesi
    List kapananLadesler = globalLadesler.where((lades) {
      if (lades['aktif'] == true) return false;

      Map evetYatirimlar = lades['evet_yatirimlar'] ?? {};
      Map hayirYatirimlar = lades['hayir_yatirimlar'] ?? {};

      return lades['yaratan'] == email ||
          evetYatirimlar.containsKey(email) ||
          hayirYatirimlar.containsKey(email);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF060913),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: Colors.white, size: 20),
          onPressed: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                      "Ana sayfaya dönmek için alt menüyü kullanabilirsiniz."),
                  duration: Duration(seconds: 1),
                ),
              );
            }
          },
        ),
        title: const Text(
          "Profilim",
          style: TextStyle(
              fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16),
        ),
        backgroundColor: const Color(0xFF0D111A),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.redAccent),
            onPressed: () {
              gecerliKullaniciEmail = null;
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(
                    builder: (context) => const GirisYapFormEkrani()),
                (route) => false,
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // 👤 ÜST PROFİL BİLGİ ALANI
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              children: [
                // Neon Parlamalı Profil Avatarı
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D111A),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF00F5D4).withValues(alpha: 0.2),
                        blurRadius: 15,
                        spreadRadius: 1,
                      ),
                    ],
                    border: Border.all(
                        color: const Color(0xFF00F5D4).withValues(alpha: 0.5),
                        width: 1),
                  ),
                  child: const Icon(Icons.person_rounded,
                      size: 44, color: Color(0xFF00F5D4)),
                ),
                const SizedBox(height: 10),
                Text(
                  email,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),

                // 🪙 Bakiye Kartı
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D111A),
                    borderRadius: BorderRadius.circular(12),
                    border:
                        Border.all(color: Colors.white.withValues(alpha: 0.05)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 18,
                            height: 18,
                            decoration: const BoxDecoration(
                                color: Color(0xFFFFBE0B),
                                shape: BoxShape.circle),
                            alignment: Alignment.center,
                            child: const Text("T",
                                style: TextStyle(
                                    color: Colors.black,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900)),
                          ),
                          const SizedBox(width: 10),
                          const Text("BAKİYE",
                              style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.5)),
                        ],
                      ),
                      Text(
                        "${bakiye.toStringAsFixed(0)} Token",
                        style: const TextStyle(
                            color: Color(0xFF00F5D4),
                            fontSize: 15,
                            fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 🎛️ TABBAR ALANI (AKTİF / GEÇMİŞ)
          Container(
            color: const Color(0xFF0D111A),
            child: TabBar(
              controller: _tabController,
              indicatorColor: const Color(0xFF00F5D4),
              indicatorWeight: 3,
              labelColor: const Color(0xFF00F5D4),
              unselectedLabelColor: Colors.white54,
              labelStyle: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  letterSpacing: 0.5),
              tabs: const [
                Tab(text: "AKTİF LADESLERİM"),
                Tab(text: "GEÇMİŞ / ÖZET"),
              ],
            ),
          ),

          // 📱 SEKMELERİN İÇERİK ALANI
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // 🟢 1. SEKME: AKTİF LADESLER LİSTESİ (DİNAMİK)
                aktifIddialar.isEmpty
                    ? const Center(
                        child: Text("Aktif katıldığınız lades bulunmuyor.",
                            style:
                                TextStyle(color: Colors.white38, fontSize: 13)))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: aktifIddialar.length,
                        itemBuilder: (context, index) {
                          var lades = aktifIddialar[index];
                          double evetHavuz =
                              (lades['evet_havuz'] ?? 0).toDouble();
                          double hayirHavuz =
                              (lades['hayir_havuz'] ?? 0).toDouble();
                          double toplam = evetHavuz + hayirHavuz;

                          double evetYuzde =
                              toplam > 0 ? (evetHavuz / toplam) * 100 : 50;
                          double hayirYuzde =
                              toplam > 0 ? (hayirHavuz / toplam) * 100 : 50;

                          // Kullanıcının hangi tarafta ne kadar yatırımı olduğunu bulalım
                          double kullaniciEvet =
                              ((lades['evet_yatirimlar'] ?? {})[email] ?? 0)
                                  .toDouble();
                          double kullaniciHayir =
                              ((lades['hayir_yatirimlar'] ?? {})[email] ?? 0)
                                  .toDouble();
                          String tarafMetni = kullaniciEvet > 0
                              ? "EVET (${kullaniciEvet.toStringAsFixed(0)} T)"
                              : "HAYIR (${kullaniciHayir.toStringAsFixed(0)} T)";
                          if (kullaniciEvet == 0 && kullaniciHayir == 0)
                            tarafMetni = "YARATICI";

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0D111A),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.05)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(lades['soru'] ?? '',
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold)),
                                const SizedBox(height: 12),
                                // Oran Çubukları
                                Row(
                                  children: [
                                    Expanded(
                                      flex: evetYuzde.round() > 0
                                          ? evetYuzde.round()
                                          : 1,
                                      child: Container(
                                        height: 24,
                                        decoration: const BoxDecoration(
                                          color: Color(0xFF00F5D4),
                                          borderRadius: BorderRadius.horizontal(
                                              left: Radius.circular(6)),
                                        ),
                                        alignment: Alignment.center,
                                        child: Text(
                                            "EVET %${evetYuzde.toStringAsFixed(0)}",
                                            style: const TextStyle(
                                                color: Colors.black,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold)),
                                      ),
                                    ),
                                    const SizedBox(width: 2),
                                    Expanded(
                                      flex: hayirYuzde.round() > 0
                                          ? hayirYuzde.round()
                                          : 1,
                                      child: Container(
                                        height: 24,
                                        decoration: const BoxDecoration(
                                          color: Color(0xFFFF006E),
                                          borderRadius: BorderRadius.horizontal(
                                              right: Radius.circular(6)),
                                        ),
                                        alignment: Alignment.center,
                                        child: Text(
                                            "HAYIR %${hayirYuzde.toStringAsFixed(0)}",
                                            style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold)),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                        "Toplam Havuz: ${toplam.toStringAsFixed(0)} T",
                                        style: const TextStyle(
                                            color: Colors.white54,
                                            fontSize: 11)),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                          color: Colors.amber
                                              .withValues(alpha: 0.1),
                                          borderRadius:
                                              BorderRadius.circular(4)),
                                      child: Text("Tarafınız: $tarafMetni",
                                          style: const TextStyle(
                                              color: Colors.amber,
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),

                // 🔴 2. SEKME: GEÇMİŞ / KAZANÇ-KAYIP LİSTESİ (DİNAMİK ENTEGRASYON)
                kapananLadesler.isEmpty
                    ? const Center(
                        child: Text("Sonuçlanmış bir ladesiniz bulunmuyor.",
                            style:
                                TextStyle(color: Colors.white38, fontSize: 13)))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: kapananLadesler.length,
                        itemBuilder: (context, index) {
                          var lades = kapananLadesler[index];
                          String durumMetni = lades['durum'] ?? 'Sonuçlandı';

                          // Kullanıcının bu ladesteki yatırımlarını alalım
                          double kullaniciEvet =
                              ((lades['evet_yatirimlar'] ?? {})[email] ?? 0)
                                  .toDouble();
                          double kullaniciHayir =
                              ((lades['hayir_yatirimlar'] ?? {})[email] ?? 0)
                                  .toDouble();

                          double evetHavuz =
                              (lades['evet_havuz'] ?? 0).toDouble();
                          double hayirHavuz =
                              (lades['hayir_havuz'] ?? 0).toDouble();
                          double toplamHavuz = evetHavuz + hayirHavuz;

                          bool kazandi = false;
                          String miktarMetni = "0 T";
                          String secilenTaraf = "YARATICI";

                          if (kullaniciEvet > 0) {
                            secilenTaraf = "EVET";
                            if (durumMetni.contains("Evet")) {
                              kazandi = true;
                              // Havuz kazanç hesaplama: (Yatırım / Evet Havuzu) * Toplam Havuz
                              double kazanc = evetHavuz > 0
                                  ? (kullaniciEvet / evetHavuz) * toplamHavuz
                                  : 0;
                              double netKazanc =
                                  kazanc - kullaniciEvet; // Net kar
                              String isaret = netKazanc >= 0 ? "+" : "";
                              miktarMetni =
                                  "$isaret${netKazanc.toStringAsFixed(0)} T";
                            } else {
                              kazandi = false;
                              miktarMetni =
                                  "-${kullaniciEvet.toStringAsFixed(0)} T";
                            }
                          } else if (kullaniciHayir > 0) {
                            secilenTaraf = "HAYIR";
                            if (durumMetni.contains("Hayır")) {
                              kazandi = true;
                              // Havuz kazanç hesaplama: (Yatırım / Hayır Havuzu) * Toplam Havuz
                              double kazanc = hayirHavuz > 0
                                  ? (kullaniciHayir / hayirHavuz) * toplamHavuz
                                  : 0;
                              double netKazanc =
                                  kazanc - kullaniciHayir; // Net kar
                              String isaret = netKazanc >= 0 ? "+" : "";
                              miktarMetni =
                                  "$isaret${netKazanc.toStringAsFixed(0)} T";
                            } else {
                              kazandi = false;
                              miktarMetni =
                                  "-${kullaniciHayir.toStringAsFixed(0)} T";
                            }
                          } else {
                            // Kullanıcı sadece iddiayı açan kişiyse ve oynamadıysa
                            miktarMetni = "0 T";
                          }

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0D111A),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                  color: kazandi
                                      ? const Color(0xFF00F5D4)
                                          .withValues(alpha: 0.1)
                                      : const Color(0xFFFF006E)
                                          .withValues(alpha: 0.1)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(lades['soru'] ?? '',
                                          style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 13,
                                              fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 6),
                                      Row(
                                        children: [
                                          Text(lades['tarih'] ?? 'Sonuçlandı',
                                              style: const TextStyle(
                                                  color: Colors.white38,
                                                  fontSize: 11)),
                                          const SizedBox(width: 8),
                                          Text("• Seçim: $secilenTaraf",
                                              style: const TextStyle(
                                                  color: Colors.white54,
                                                  fontSize: 11)),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                // Kazanç / Kayıp Durum Belirteci
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: kazandi
                                            ? const Color(0xFF00F5D4)
                                                .withValues(alpha: 0.15)
                                            : const Color(0xFFFF006E)
                                                .withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        kazandi ? "KAZANDI" : "KAYBETTİ",
                                        style: TextStyle(
                                          color: kazandi
                                              ? const Color(0xFF00F5D4)
                                              : const Color(0xFFFF006E),
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      miktarMetni,
                                      style: TextStyle(
                                        color: kazandi
                                            ? const Color(0xFF00F5D4)
                                            : const Color(0xFFFF006E),
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
