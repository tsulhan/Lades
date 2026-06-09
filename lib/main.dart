import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'constants/app_constants.dart';
import 'screens/aktif_ladesler_listesi.dart';
import 'screens/yeni_lades_formu.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // 🌐 Web sitesinin Firebase ile ilk el sıkışmasını gerçekleştiren komut
  await Firebase.initializeApp();
  runApp(const LadesApp());
}

class LadesApp extends StatelessWidget {
  const LadesApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Lades İddia Paneli',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: AppColors.background,
        primaryColor: AppColors.primary,
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0D111A),
          elevation: 0,
        ),
      ),
      home: const AnaEkran(),
    );
  }
}

class AnaEkran extends StatefulWidget {
  const AnaEkran({super.key});

  @override
  State<AnaEkran> createState() => _AnaEkranState();
}

class _AnaEkranState extends State<AnaEkran> {
  int _seciliSekme = 0;

  final List<Widget> _sayfalar = [
    const AktifLadeslerListesi(),
    const YeniLadesFormu(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🎲 LADES PANELİ',
            style: TextStyle(
                fontWeight: FontWeight.bold,
                color: AppColors.textMain,
                fontSize: 16)),
        centerTitle: true,
      ),
      body: _sayfalar[_seciliSekme],
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: const Color(0xFF0D111A),
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textGrey,
        currentIndex: _seciliSekme,
        onTap: (index) {
          setState(() {
            _seciliSekme = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
              icon: Icon(Icons.bolt_rounded, size: 20),
              label: 'Aktif Ladesler'),
          BottomNavigationBarItem(
              icon: Icon(Icons.add_circle_outline_rounded, size: 20),
              label: 'Yeni İddia'),
        ],
      ),
    );
  }
}
