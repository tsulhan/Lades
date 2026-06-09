import 'package:flutter/material.dart';
import '../models/bildirim_model.dart'; // Bir önceki adımda oluşturduğumuz modele ulaşıyoruz

class BildirimYonetici extends ChangeNotifier {
  // İçeride sakladığımız gizli bildirim listesi
  final List<BildiriModel> _bildirimler = [];

  // Dışarıya bildirimleri en yeniden en eskiye doğru sıralı olarak gösteriyoruz
  List<BildiriModel> get tumBildirimler =>
      List.unmodifiable(_bildirimler.reversed.toList());

  // Okunmamış bildirim sayısını hesaplayan küçük makine
  int get okunmamisSayi => _bildirimler.where((b) => !b.okundu).length;

  // Yeni bir lades açıldığında tetiklenecek fonksiyon
  void yeniLadesBildirimi(String ladesAdi) {
    _bildirimler.add(BildiriModel(
      id: DateTime.now().millisecondsSinceEpoch,
      tip: BildirimTipi.yeniLades,
      baslik: "🚀 Yeni Lades Açıldı!",
      icerik: ladesAdi,
      tarih: DateTime.now(),
    ));
    notifyListeners(); // Arayüze "Ekranı güncelle, yeni bildirim geldi!" haberini uçurur
  }

  // Ladesin kapanmasına az zaman kaldığında tetiklenecek fonksiyon
  void kapatmayaYakinBildirimi(String ladesAdi) {
    _bildirimler.add(BildiriModel(
      id: DateTime.now().millisecondsSinceEpoch,
      tip: BildirimTipi.kapatmayaYakin,
      baslik: "⏰ Son 1 Gün!",
      icerik: "$ladesAdi ladesi yarın kapanıyor, pozisyonunu al!",
      tarih: DateTime.now(),
    ));
    notifyListeners();
  }

  // Kullanıcı tahmini doğru çıkıp token kazandığında tetiklenecek fonksiyon
  void kazancBildirimi(String ladesAdi, int miktar) {
    _bildirimler.add(BildiriModel(
      id: DateTime.now().millisecondsSinceEpoch,
      tip: BildirimTipi.kazanc,
      baslik: "🎉 Lades Kazandın!",
      icerik: '"$ladesAdi" ladesinde +$miktar Token kazandın!',
      tarih: DateTime.now(),
    ));
    notifyListeners();
  }

  // Kullanıcı tahmini yanlış çıkıp token kaybettiğinde tetiklenecek fonksiyon
  void kayipBildirimi(String ladesAdi, int miktar) {
    _bildirimler.add(BildiriModel(
      id: DateTime.now().millisecondsSinceEpoch,
      tip: BildirimTipi.kayip,
      baslik: "😔 Lades Kaybedildi",
      icerik: '"$ladesAdi" ladesinde -$miktar Token kaybettin.',
      tarih: DateTime.now(),
    ));
    notifyListeners();
  }

  // Hepsini okundu olarak işaretleme fonksiyonu
  void tumunuOkunduYap() {
    for (var b in _bildirimler) {
      b.okundu = true;
    }
    notifyListeners();
  }

  // Tek bir bildirimi silme fonksiyonu
  void bildirimiSil(int id) {
    _bildirimler.removeWhere((b) => b.id == id);
    notifyListeners();
  }

  // Tüm bildirim geçmişini temizleme fonksiyonu
  void tumunuTemizle() {
    _bildirimler.clear();
    notifyListeners();
  }
}

// Uygulamanın her yerinden bu yöneticiye ulaşabilmek için oluşturduğumuz tekil nesne (Global Instance)
final BildirimYonetici bildirimYonetici = BildirimYonetici();
