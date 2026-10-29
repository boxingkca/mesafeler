# Apple Maps (MapKit JS) kurulumu

> **Durum: hazırlık aşaması.** Token aracı ve yapılandırma alanı hazır, Apple katmanının kendisi henüz uygulamaya eklenmedi. Aşağıdaki adımlarla token üretildiğinde katman bunun üzerine eklenecek.

## Neden Apple Maps

Şu an kullanılan OpenStreetMap tabanlı katmanlar anahtarsız çalışır ve İstanbul'da iyi detay verir. Apple Maps'in ek getirdikleri:

- Türkiye'de daha tanıdık yer ve işletme arama sonuçları
- İşletme, durak ve toplu taşıma gösterimi
- Apple'ın kendi yaya yönlendirmesi (mevcut Valhalla yerine)

Dürüst bir not: bunlar **kazanç**, ama bedelsiz değil. Token'ın yenilenmesi gerekir (en fazla 1 yılda bir) ve Apple Developer üyeliğinin aktif kalması şarttır. Üyelik biterse Apple katmanı çalışmaz, OSM katmanları çalışmaya devam eder.

## Neden anahtar gerekiyor

Google, Apple ve Yandex haritalarının karolarını kendi SDK'ları dışında, Leaflet gibi harici bir harita kütüphanesinde kullanmak lisans şartlarına aykırıdır. Apple için doğru yol MapKit JS'tir ve her istek, Apple Developer hesabına bağlı imzalı bir token ile yetkilendirilir.

## Adımlar

### 1. Maps ID oluştur
[developer.apple.com/account](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Identifiers** → **+** → **Maps IDs**.
Örnek tanımlayıcı: `maps.com.kadircanarabaci.mesafeler`

### 2. Anahtar (key) oluştur
**Keys** → **+** → **Maps** kutusunu işaretle → yukarıdaki Maps ID'yi seç → kaydet → **`AuthKey_XXXXXXXXXX.p8` dosyasını indir**.

> Bu dosya yalnızca **bir kez** indirilebilir. Güvenli bir yere kaydet. **Asla depoya ekleme, kimseye gönderme.** `.gitignore` `*.p8` dosyalarını zaten dışarıda tutar.

Ekranda iki değer daha görürsün:
- **Key ID**: 10 karakter, dosya adındaki `XXXXXXXXXX` ile aynı
- **Team ID**: hesabının **Membership** sayfasında, 10 karakter

### 3. Token üret
Kendi bilgisayarında (Node 18 ya da üstü):

```bash
node tools/generate-mapkit-token.mjs \
  --key  ~/Downloads/AuthKey_XXXXXXXXXX.p8 \
  --team TEAMID1234 \
  --kid  XXXXXXXXXX \
  --origin https://boxingkca.github.io \
  --days 180
```

Çıktı uzun bir `eyJ...` dizgesidir.

### 4. Token'ı yapılandırmaya ekle
`assets/js/config.js` içindeki `mapkitToken` alanına yapıştır, commit ve push et.

## Güvenlik: bu token herkese açık depoya konabilir mi?

**Token evet, `.p8` dosyası asla.**

- `.p8` özel anahtardır, token'ları imzalamak için kullanılır. Sızarsa başkası senin adına token üretebilir.
- Token ise tarayıcıya zaten gönderilmek zorundadır, yani doğası gereği görünürdür. Apple bu yüzden token içine `origin` alanı koyar: token yalnızca o alan adından gelen isteklerde geçerlidir. Başka bir sitede kullanılamaz.
- Token'da `exp` vardır, süresi dolunca çalışmaz. Aracın varsayılanı 180 gündür.

Sızıntı şüphesinde Apple Developer panelinden ilgili **anahtarı iptal et (revoke)**; ona bağlı tüm token'lar geçersiz olur.

## Kullanım kotası

Apple, geliştirici üyeliği başına günlük ücretsiz bir harita ve servis çağrısı kotası tanır. Güncel rakamlar için [Apple'ın MapKit JS belgelerine](https://developer.apple.com/documentation/mapkitjs) bak. Kişisel ve aile ölçeğinde kullanım için fazlasıyla yeterlidir.
