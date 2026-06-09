import 'package:flutter/material.dart';
import '../constants/app_constants.dart';

class TokenIsteGirisEkrani extends StatefulWidget {
  final VoidCallback onTalepGonderildi;
  const TokenIsteGirisEkrani({super.key, required this.onTalepGonderildi});

  @override
  State<TokenIsteGirisEkrani> createState() => _TokenIsteGirisEkraniState();
}

class _TokenIsteGirisEkraniState extends State<TokenIsteGirisEkrani> {
  final _miktarController = TextEditingController();

  void _talepGonder() {
    if (_miktarController.text.isEmpty) return;

    setState(() {
      globalTokenTalepleri.add({
        'email': gecerliKullaniciEmail,
        'miktar': int.tryParse(_miktarController.text) ?? 0,
      });
    });
    widget.onTalepGonderildi();
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Talep yöneticiye iletildi.")));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Token İste")),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            TextField(
              controller: _miktarController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                  labelText: "İstenen Token Miktarı",
                  border: OutlineInputBorder()),
            ),
            const SizedBox(height: 20),
            ElevatedButton(onPressed: _talepGonder, child: const Text("GÖNDER"))
          ],
        ),
      ),
    );
  }
}
