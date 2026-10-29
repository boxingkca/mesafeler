# Mesafeler

Haritaya marker koyarak **yürüdüğün gerçek mesafeyi** ölç, farklı sokak rotalarını yan yana karşılaştır.

**Canlı: [boxingkca.github.io/mesafeler](https://boxingkca.github.io/mesafeler/)**

[![Lisans: MIT](https://img.shields.io/badge/lisans-MIT-ffb020.svg)](LICENSE)
![Kurulum yok](https://img.shields.io/badge/kurulum-yok-2dd4bf.svg)
![Bağımlılık](https://img.shields.io/badge/çalışma%20zamanı%20bağımlılığı-Leaflet-38bdf8.svg)

<p align="center"><img src="docs/screenshot-panel.png" alt="Kontrol paneli: iki rota karşılaştırması, bölüm bölüm mesafe, süre tahmini" width="340"></p>

> English: a small, installation-free web tool to measure walking distance by dropping markers on a map, compare alternative street-by-street routes, estimate walking time, export GPX and share routes with a link. Turkish UI, tuned for Istanbul/Türkiye. See [Running locally](#yerelde-çalıştırma).

## Neden var

Harita uygulamaları sana **kendi bulduğu** yolu gösterir, senin yürüyeceğin yolu değil.

Yürürken bu fark önemlidir. Bir uygulama çoğu zaman mahalle arasındaki kestirmeyi, apartman geçişini, merdivenli sokağı bilmez; bazen de kendi seçtiği "uygun" yol için rotayı gereksiz uzatır. Üstelik yalnızca onun önerdiği yolun mesafesini söyler. *"Ben şu sokaktan yürürsem ne kadar tutar?"* diye sorma şansın yoktur. Haritada iki nokta seçip aradaki mesafeye bakabilirsin, ama gerçekte yürüdüğün yol o iki nokta arasında düz bir çizgi değil, geçtiğin sokakların toplamıdır.

Mesafeler bu soruyu doğrudan cevaplar: **yol senin, hesap uygulamanın.** Geçeceğin sokakların köşelerine marker koyarsın, uygulama her bölümün ve toplamın gerçek uzunluğunu söyler. Aynı yere giden birden fazla yolu yan yana koyabilirsin, böylece "bu kestirme gerçekten kestirme mi, kaç metre kazandırıyor?" sorusu tahmin olmaktan çıkıp bir rakama dönüşür. Çıkan sonucu da haritanın önerdiği yürüme mesafesiyle karşılaştırabilirsin.

Kısacası: **neyi nereden yürürsen ne kadar tutar, onu öğrenmek için.**

## Özellikler

- **Sınırsız marker.** Haritaya tıkla, numaralı marker düşsün. Sürükleyerek düzelt, geri al, temizle.
- **Bölüm bölüm döküm.** Her marker çifti arası mesafe ve yürüyen toplam (Σ).
- **Rota karşılaştırma.** Birden fazla rota aç, en kısası işaretlenir, diğerlerinin farkı metre ve yüzde olarak yazılır.
- **Yola oturt.** İstersen noktaların arası gerçek yaya yoluna oturtulur (aşağıda açıklaması var).
- **Süre tahmini.** Mesafe ÷ yürüme hızı. Hız 4 ile 6 km/sa arasında değiştirilebilir.
- **Beş harita katmanı.** Detay (OSM), Renkli, Açık, Koyu ve Uydu. Siyah/gri tonlarda sokaklar zor seçiliyorsa Renkli ya da Detay'a geç. Renkli/Açık/Koyu varsayılan olarak anahtarsız Esri karolarından gelir; ücretsiz bir CARTO anahtarın varsa [aşağıda](#harita-katmanları-ve-carto-anahtarı) CARTO'ya geçirebilirsin.
- **Türkiye odaklı arama.** Mahalle, cadde ya da yer adı yaz, Enter'a bas (ya da çıkan "ara" satırına dokun), adaylardan birini seç.
- **Otomatik kayıt.** Rotaların tarayıcında saklanır, sekmeyi kapatıp açınca yerinde durur.
- **Bağlantıyla paylaş.** Rotalar URL'e gömülür. Linki açan kişinin kendi rotaları ezilmez, paylaşılanlar yanına eklenir.
- **GPX dışa aktarma.** Telefona, Strava'ya ya da yedek olarak.
- **Telefonda rahat.** Panel katlanır, haritaya dokununca kendiliğinden kapanır. Safari'de "Ana Ekrana Ekle" ile uygulama gibi açılır.

## Kullanım

1. Haritada yürüyeceğin bölgeye git (arama kutusu ya da ⊙ konum düğmesi).
2. Haritaya tıklayarak sırayla marker koy. Toplam mesafe anlık güncellenir.
3. **+ Yeni** ile ikinci bir rota aç, aynı yolu başka sokaklardan çiz.
4. Rotalar listesinde her satırın sağında en kısa rotaya göre fark görünür. Satıra tıklarsan harita o rotaya odaklanır.
5. **Bağlantı** ile birine gönder, **GPX** ile dosya olarak indir.

### "Yola oturt" ne yapar

Kapalıyken (varsayılan) marker'lar arası **düz çizgi** ölçülür. Her köşeye marker koyarak tam istediğin yolu birebir çizersin. Bu mod her zaman çalışır ve sana tam kontrol verir.

Açıkken marker'lar arası, OpenStreetMap yaya ağı üzerinden hesaplanan **gerçek yürünebilir yola** oturtulur (kaldırım, yaya yolu, patika, yayalaştırılmış sokak). Birkaç ara nokta koyup gerisini yola bırakmak istediğinde kullanışlıdır. Araba rotası değildir: tek yönlü yol ya da otoyol mantığını izlemez, yaya yollarını kullanır.

Sonucun kalitesi OSM'deki kaldırım verisine bağlıdır. Google ya da Apple Maps'in verdiği rakamla birebir tutmayabilir; bu araç onların yerine geçmek için değil, **kendi seçtiğin yolu ölçmek** için yapıldı.

## Veri kaynakları ve gizlilik

### Rotalarımı ve konumlarımı başkası görür mü?

**Hayır.** Uygulamanın kendi sunucusu, hesabı ve veritabanı yoktur. Koyduğun marker'lar ve rotalar yalnızca **senin tarayıcında, senin cihazında** (`localStorage`) saklanır. Siteyi başka biri açtığında kendi boş haritasını görür, seninkini değil; sen de onunkini görmezsin. Herkes kendi rotalarını kendi cihazında tutar.

Bir rota ancak **sen "Bağlantı" ile bir link üretip birine gönderirsen** başkasına ulaşır. O linkin içinde yalnızca o anki rotaların noktaları vardır.

Konumunu istediğinde (⊙ düğmesi) tarayıcı izin sorar. Koordinatların tarayıcında kalır: haritayı ortalamak ve mavi noktayı çizmek için kullanılır, bir yere gönderilmez ya da kaydedilmez. Ancak harita o bölgeye gittiği için, harita servisleri o bölgenin karolarını istediğini görür (aşağıdaki tabloya bak).

Kayıtları silmek için rota satırındaki **×**'e bas ya da tarayıcının site verilerini temizle. Aynı alan adı altında (`boxingkca.github.io`) yayınlanan başka sayfalar da aynı tarayıcı deposunu paylaşır; bu yüzden orada başkasının kodunu barındırma.

### Hangi üçüncü taraf servisler kullanılıyor?

Harita, arama ve yol hesabı için dış servislere istek atılır; bu servisler **IP adresini ve baktığın bölgeyi** görür. Rotalarının tamamını görmezler.

| Ne için | Servis | Ne zaman |
|---|---|---|
| Harita karoları | OpenStreetMap, Esri (ve istersen CARTO) | Haritayı kaydırırken |
| Yer arama | OSM Nominatim | Aramada Enter'a basınca |
| Yola oturtma | FOSSGIS Valhalla | "Yola oturt" açıkken; rotanın marker koordinatları gönderilir |

- Arama yazarken otomatik tamamlanmaz, yalnızca Enter ile çalışır. Nominatim kullanım politikası otomatik tamamlamaya izin vermez.
- Bu servisler ücretsiz kamu altyapısıdır. Aile ve arkadaş ölçeğinde sorun olmaz; yüksek trafikli bir kullanım için kendi servislerine geçmek gerekir.
- Paylaşım bağlantısındaki rota verisi URL'in `#` kısmında durur. Tarayıcı bu kısmı sunucuya göndermez.
- Dışarıdan gelen her değer (paylaşılan rotanın adı ve rengi, arama sonuçlarındaki yer adları) sayfaya düz metin olarak yerleştirilir ve doğrulanır; bir link ya da yer adı sitede kod çalıştıramaz.

## Harita katmanları ve CARTO anahtarı

Detay katmanı OpenStreetMap'in standart karolarıdır, anahtar istemez. Renkli, Açık ve Koyu katmanlar **varsayılan olarak Esri'nin anahtarsız karolarından** gelir. Uydu da Esri'dir.

CARTO'nun güzel Voyager / Positron / Dark Matter stilleri ise artık ücretsiz bir API anahtarı ister; anahtarsız karolara "API KEY REQUIRED" filigranı basılır. İstersen:

1. [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/) adresinden ücretsiz anahtar al (kişisel ve kâr amacı gütmeyen kullanım için ücretsiz; koşullar CARTO'nun sayfasında).
2. `assets/js/config.js` içindeki `cartoKey` alanına yapıştır.

Anahtar tarayıcıya gönderilir, yani herkese açık olması doğaldır. Anahtar girilince Renkli/Açık/Koyu otomatik olarak CARTO'ya geçer, ek bir şey gerekmez. Ücretsiz sağlayıcıların koşulları değişebilir (CARTO'nun yakın zamanda değiştirdiği gibi); katman listesi `app.js` içinde `BASEMAPS` nesnesinde tutulur ve değiştirmek tek yerden yapılır.

## Yerelde çalıştırma

Derleme adımı yok. Statik dosyalardır.

```bash
git clone https://github.com/boxingkca/mesafeler.git
cd mesafeler
python3 -m http.server 8000
# tarayıcıda http://localhost:8000
```

`index.html` dosyasını doğrudan çift tıklayıp açmak da çalışır, ancak bazı tarayıcılar `file://` üzerinde pano ve konum izinlerini kısıtlar. Yerel sunucu daha sağlıklıdır.

## Proje yapısı

```
mesafeler/
├── index.html              Sayfa iskeleti ve meta etiketleri
├── manifest.webmanifest    Ana ekrana eklenebilir (PWA) tanımı
├── favicon.svg
├── assets/
│   ├── css/app.css         Tüm arayüz stilleri
│   ├── js/app.js           Uygulama mantığı
│   ├── js/config.js        Çalışma zamanı ayarları (gizli bilgi konmaz)
│   └── icons/              Uygulama ikonları
├── vendor/leaflet/         Leaflet 1.9.4 (depoya gömülü, CDN gerekmez)
├── docs/
│   ├── ARCHITECTURE.md     Kod yapısı ve tasarım kararları
│   └── APPLE-MAPS.md       Apple Maps (MapKit JS) kurulum rehberi
├── tools/
│   └── generate-mapkit-token.mjs
├── tests/e2e.py            Uçtan uca tarayıcı testi
└── .github/                CI, issue şablonları
```

## Test

Uçtan uca test gerçek bir Chromium açar: marker koyar, rota karşılaştırır, GPX indirir, paylaşım bağlantısını ve veri kaybı senaryolarını dener.

```bash
pip install playwright && playwright install chromium
python3 -m http.server 8777 &
python3 tests/e2e.py
```

## Yol haritası

- [ ] Apple Maps (MapKit JS) katmanı: Apple'ın harita, yer arama ve işletme/toplu taşıma gösterimi. Hazırlık rehberi [docs/APPLE-MAPS.md](docs/APPLE-MAPS.md) içinde.
- [ ] Rota çizgisini sürükleyerek araya nokta ekleme
- [ ] Yükseklik profili (hangi rota daha yorucu)
- [ ] GPX içe aktarma
- [ ] Çevrimdışı kabuk (service worker)

Değişiklikler için [CHANGELOG.md](CHANGELOG.md), katkı için [CONTRIBUTING.md](CONTRIBUTING.md).

## Lisans ve teşekkür

Kod [MIT](LICENSE) lisanslıdır. © 2026 Kadir Can Arabacı.

Harita verisi © [OpenStreetMap katkıcıları](https://www.openstreetmap.org/copyright) (ODbL). Renkli/Açık/Koyu ve Uydu karoları © Esri (CARTO anahtarı girilirse stiller © [CARTO](https://carto.com/attributions)). Uydu görüntüsü Esri, Maxar, Earthstar Geographics. Harita motoru [Leaflet](https://leafletjs.com) (BSD-2-Clause). Yaya yönlendirmesi [FOSSGIS](https://fossgis.de) Valhalla sunucusu, arama [Nominatim](https://nominatim.org).
