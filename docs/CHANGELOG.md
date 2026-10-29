# Değişiklik günlüğü

Biçim [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/), sürümleme [SemVer](https://semver.org/lang/tr/) ilkelerine dayanır.

## [1.0.3] - 2026-10-29

### Değişti
- Depo düzeni sadeleştirildi: kök dizinde yalnızca `index.html`, `README.md`, `LICENSE` ve klasörler kalır. `vendor/leaflet`, `favicon.svg` ve `manifest.webmanifest` `assets/` altına, `CHANGELOG.md` `docs/` altına, `CONTRIBUTING.md` `.github/` altına taşındı.
- Leaflet dosyaları da sürüm parametresi (`?v=`) taşır.

### Eklendi
- Testler: sayfanın yüklediği hiçbir yerel dosya 404 vermemeli, manifest hatasız çözülmeli

## [1.0.2] - 2026-10-29

### Güvenlik
- Paylaşım bağlantısındaki rota rengi/adı ve arama sonuçlarındaki yer adları HTML olarak sayfaya yerleştiriliyordu. Kötü niyetli bir bağlantı ya da düzenlenmiş bir OSM yer adı sitede kod çalıştırıp tarayıcıdaki kayıtlı rotaları okuyabilirdi. Renk artık yalnızca `#rrggbb` kabul eder, ad ve yer adları düz metin olarak yerleştirilir, koordinatlar sayıya zorlanır.

### Düzeltildi
- 481 ile 689 px arası genişlikte (dar pencere, tablet, yatay telefon) arama sonucu seçilince ya da paylaşılan rota açılınca harita ilçe/şehir ölçeğine uzaklaşıyordu. Sığdırma payı artık sabit bir eşik yerine panelin gerçek konumundan hesaplanır.
- Aramada yazarken hiçbir geri bildirim yoktu, "çalışmıyor" hissi veriyordu. Artık yazarken "ara ↵" satırı çıkar, arama sürerken "Aranıyor…", servis hata verirse açıklayıcı bir mesaj gösterilir.
- Dar ekranda bir sonuç seçilince panel kendiliğinden katlanır, harita görünür.

## [1.0.1] - 2026-10-29

### Düzeltildi
- CARTO, tüm karolar için API anahtarı istemeye başladığından Renkli, Açık ve Koyu katmanlarda "API KEY REQUIRED" filigranı görünüyordu. Bu katmanlar artık varsayılan olarak anahtarsız Esri karolarından gelir; `config.js` içine ücretsiz bir `cartoKey` girilirse CARTO kullanılır.

### Eklendi
- `assets/` adreslerine sürüm parametresi (`?v=`): sayfa güncellenince tarayıcı eski kodu önbellekten çalıştırmaz; testle denetlenir
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
- Apple Maps (MapKit JS) katmanı, bkz. [APPLE-MAPS.md](APPLE-MAPS.md)
