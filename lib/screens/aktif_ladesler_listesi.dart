import 'package:flutter/material.dart';
import 'package:firebase_database/firebase_database.dart';
import '../constants/app_constants.dart';

class AktifLadeslerListesi extends StatefulWidget {
  const AktifLadeslerListesi({super.key});

  @override
  State<AktifLadeslerListesi> createState() => _AktifLadeslerListesiState();
}

class _AktifLadeslerListesiState extends State<AktifLadeslerListesi> {
  final DatabaseReference _dbRef = FirebaseDatabase.instance.ref('ladesler');

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DatabaseEvent>(
      stream: _dbRef.onValue,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
              child: CircularProgressIndicator(color: AppColors.primary));
        }

        if (snapshot.hasError) {
          return Center(
              child: Text("Hata: ${snapshot.error}",
                  style: const TextStyle(color: AppColors.secondary)));
        }

        List<Map<dynamic, dynamic>> ladesListesi = [];

        if (snapshot.hasData && snapshot.data!.snapshot.value != null) {
          Map<dynamic, dynamic> gelenVeriler =
              snapshot.data!.snapshot.value as Map<dynamic, dynamic>;
          gelenVeriler.forEach((key, value) {
            var lades = Map<dynamic, dynamic>.from(value);
            lades['fbKey'] = key;
            ladesListesi.add(lades);
          });
        }

        if (ladesListesi.isEmpty) {
          return const Center(
            child: Text(
                "Şu an aktif bir lades iddiası bulunmuyor.\nİlk iddiayı sen başlat!",
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textGrey, fontSize: 14)),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16.0),
          itemCount: ladesListesi.length,
          itemBuilder: (context, index) {
            var lades = ladesListesi[index];
            return Card(
              color: const Color(0xFF0D111A),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey.shade900)),
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                key: ValueKey(lades['fbKey']),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(6)),
                          child: Text(lades['kategori'] ?? 'AKTİF',
                              style: const TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold)),
                        ),
                        Text("Havuz: ${lades['bakiye']} Token",
                            style: const TextStyle(
                                color: AppColors.accent,
                                fontWeight: FontWeight.bold,
                                fontSize: 13)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(lades['soru'] ?? '',
                        style: const TextStyle(
                            color: AppColors.textMain,
                            fontSize: 15,
                            fontWeight: FontWeight.w500)),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                                side:
                                    const BorderSide(color: AppColors.primary)),
                            onPressed: () {},
                            child: Text("EVET (${lades['evet_havuz'] ?? 0})",
                                style: const TextStyle(
                                    color: AppColors.primary, fontSize: 12)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                                side: const BorderSide(
                                    color: AppColors.secondary)),
                            onPressed: () {},
                            child: Text("HAYIR (${lades['hayir_havuz'] ?? 0})",
                                style: const TextStyle(
                                    color: AppColors.secondary, fontSize: 12)),
                          ),
                        ),
                      ],
                    )
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
