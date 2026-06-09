import 'package:flutter/material.dart';
import 'giris_yap_form_ekrani.dart';

class GirisEkrani extends StatelessWidget {
  const GirisEkrani({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0F1526), Color(0xFF060913), Color(0xFF02040A)],
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const SizedBox(height: 40),
              Column(
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border:
                          Border.all(color: const Color(0xFF00F5D4), width: 2),
                      boxShadow: [
                        BoxShadow(
                            color: const Color(0xFF00F5D4).withAlpha(100),
                            blurRadius: 20,
                            spreadRadius: 2)
                      ],
                    ),
                    child: const Icon(Icons.analytics_rounded,
                        size: 55, color: Color(0xFF00F5D4)),
                  ),
                  const SizedBox(height: 20),
                  const Text("LADES",
                      style: TextStyle(
                          fontSize: 54,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 4,
                          color: Color(0xFFE2F1FF),
                          shadows: [
                            Shadow(color: Color(0xFF00F5D4), blurRadius: 15)
                          ])),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Text("Tahmin Et. ",
                          style: TextStyle(
                              color: Color(0xFF00F5D4),
                              fontWeight: FontWeight.w500)),
                      Text("Hisse Al. ",
                          style: TextStyle(color: Colors.white70)),
                      Text("Ladesi Kazan.",
                          style: TextStyle(
                              color: Color(0xFFFF006E),
                              fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 30),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: const [
                    GirisOzellikIkonu(
                        icon: Icons.trending_up_rounded,
                        label: "Lades Tahmini",
                        color: Color(0xFF00F5D4)),
                    GirisOzellikIkonu(
                        icon: Icons.pie_chart_rounded,
                        label: "Token Girişi",
                        color: Color(0xFFFF006E)),
                    GirisOzellikIkonu(
                        icon: Icons.account_balance_wallet_rounded,
                        label: "Kazanım",
                        color: Color(0xFFFFBE0B)),
                  ],
                ),
              ),
              Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 32, vertical: 10),
                    child: Container(
                      width: double.infinity,
                      height: 56,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                              color: const Color(0xFF00F5D4).withAlpha(80),
                              blurRadius: 12,
                              offset: const Offset(0, 4))
                        ],
                      ),
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00F5D4),
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                        ),
                        onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const GirisYapFormEkrani())),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Text("GİRİŞ YAP",
                                style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1.5)),
                            SizedBox(width: 8),
                            Icon(Icons.chevron_right_rounded,
                                color: Colors.black),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class GirisOzellikIkonu extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const GirisOzellikIkonu(
      {super.key,
      required this.icon,
      required this.label,
      required this.color});
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(height: 6),
        Text(label,
            style: const TextStyle(color: Colors.white70, fontSize: 11)),
      ],
    );
  }
}
