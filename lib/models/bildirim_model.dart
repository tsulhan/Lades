// Bildirimlerin türlerini ayırt etmek için kullandığımız özel bir liste (enum)
enum BildirimTipi { yeniLades, kapatmayaYakin, kazanc, kayip, sistem }

// Bir bildirimin sahip olması gereken tüm özellikleri içeren şablon sınıfımız
class BildiriModel {
  final int id; // Her bildirime özel benzersiz bir numara
  final BildirimTipi tip; // Bildirimin türü (kazanç, kayıp vb.)
  final String baslik; // Bildirim başlığı
  final String icerik; // Bildirim detay metni
  final DateTime tarih; // Bildirimin geldiği zaman
  bool okundu; // Bildirim tıklandı mı/okundu mu bilgisi (varsayılan: hayır)

  // Bu şablondan yeni bir bildirim üretmek için gereken yapıcı (constructor) fonksiyon
  BildiriModel({
    required this.id,
    required this.tip,
    required this.baslik,
    required this.icerik,
    required this.tarih,
    this.okundu =
        false, // Yeni gelen bildirim ilk başta okunmamış (false) sayılır
  });
}
