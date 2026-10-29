# Değişiklik günlüğü

Biçim [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/), sürümleme [SemVer](https://semver.org/lang/tr/) ilkelerine dayanır.

## [1.0.1] - 2026-10-29

### Düzeltildi
- CARTO, tüm karolar için API anahtarı istemeye başladığından Renkli, Açık ve Koyu katmanlarda "API KEY REQUIRED" filigranı görünüyordu. Bu katmanlar artık varsayılan olarak anahtarsız Esri karolarından gelir; `config.js` içine ücretsiz bir `cartoKey` girilirse CARTO kullanılır.

### Eklendi
- Katman sağlayıcısını denetleyen testler (anahtar yokken CARTO'ya istek gitmemesi, anahtar varken her isteğin anahtarı taşıması)

## [1.0.0] - 2026-10-29

İlk herkese açık sürüm.

### Eklendi
- Haritaya sınırsız marker koyma, sürükleme, geri alma, temizleme
- Bölüm bölüm mesafe dökümü ve yürüyen toplam
- Çoklu rota ve en kısaya göre fark karşılaştırması (metre ve yüzde)
- "Yola oturt": marker arasını OSM yaya ağına oturtma (FOSSGIS Valhalla)
- Yürüme hızına göre süre tahmini (4 ile 6 km/sa)
- Beş harita katmanı: Detay, Renkli, Açık, Koyu, Uydu
- Türkiye odaklı yer arama (Nominatim), çoklu sonuç listesi
- Tarayıcıda otomatik kayıt, bağlantıyla paylaşım, GPX dışa aktarma
- Katlanabilir panel, mobil uyumlu düzen, ana ekrana eklenebilir (PWA manifest)
- Leaflet depoya gömüldü (CDN bağımlılığı yok)
- Uçtan uca tarayıcı testi

### Düzeltildi (yayın öncesi testlerde bulunanlar)
- Düzenlemeden hemen sonra sekme kapatılırsa son değişiklik kaydedilmiyordu
- Paylaşım bağlantısı açıldığında kullanıcının kayıtlı rotaları ezilebiliyordu
- Uygulama açıkken paylaşım linki yapıştırılınca hiçbir şey olmuyordu
- Dar ekranda paylaşılan rota açılırken harita dünya ölçeğine uzaklaşıyordu
- Mobilde panel haritayı neredeyse tamamen kapatıyordu

### Değişti
- Arama artık yazarken otomatik çalışmaz, yalnızca Enter ile arar (Nominatim kullanım politikası)

## [Planlanan]
- Apple Maps (MapKit JS) katmanı, bkz. [docs/APPLE-MAPS.md](docs/APPLE-MAPS.md)
