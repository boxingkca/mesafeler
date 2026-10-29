# Mimari

Mesafeler bilinçli olarak küçük tutulmuş, derleme adımı olmayan bir statik web uygulamasıdır. Tüm uygulama `assets/js/app.js` içinde, tek dosyada yaşar ve dosya yukarıdan aşağıya şu bölümlere ayrılır.

## Veri modeli

```text
route = {
  id, name, color,
  pts:        [{lat, lng}, ...]   kullanıcının koyduğu marker'lar (tek gerçek kaynak)
  snap:       boolean             "yola oturt" açık mı
  snapGeom:   [[lat,lng], ...]    sunucudan gelen yaya yolu geometrisi (yalnızca bellekte)
  snappedLen: metre | null        sunucunun verdiği toplam uzunluk
  legs:       [metre, ...]        bölüm bölüm uzunluklar
  polyline, markers[]             Leaflet nesneleri
}
```

`pts` her şeyin kaynağıdır. Düz çizgi mesafesi, kayıt, paylaşım bağlantısı ve GPX bu diziden üretilir. `snapGeom`, `snappedLen` ve `legs` ise türetilmiş veridir; `pts` değişince yeniden hesaplanır.

## Akış

```text
tıklama / sürükleme / geri al
        │
        ▼
   r.pts değişir ─► rebuildMarkers ─► refresh(r)
                                         │
                          ┌──────────────┼───────────────┐
                          ▼              ▼               ▼
                      drawLine     snapRoute (açıksa)   persist (300 ms)
                                    Valhalla POST        localStorage
                          │
                          ▼
                renderPanel + renderRoutes
```

`snapRoute` eşzamansız çalıştığı için her çağrıda bir `Symbol` belirteci üretir. Yanıt döndüğünde belirteç değişmişse sonuç atılır. Bu, hızlı ardışık marker eklemelerinde eski yanıtın yeni durumu ezmesini engeller.

## Kalıcılık ve veri kaybı korumaları

- Kayıt `localStorage` altında `ym_state_v1` anahtarıyla tutulur. Yazma 300 ms geciktirilir (sürüklerken her piksel için yazmamak için) ama `pagehide` ve `visibilitychange` olaylarında **hemen** yazılır. Aksi halde düzenlemeden hemen sonra sekmeyi kapatmak son değişikliği kaybettirirdi.
- Paylaşım bağlantısı açıldığında rotalar kayıtlı olanların **yanına eklenir**, yerine geçmez. Noktaları aynı olan rota tekrar eklenmez. Bağlantıyı açan kişinin kendi rotalarının ezilmemesi bu kuralın amacıdır.
- Uygulama zaten açıkken adres çubuğuna paylaşım linki yapıştırılırsa sayfa yenilenmez; `hashchange` dinleyicisi bunu yakalar.

## Paylaşım biçimi

Bağlantı `#s=` ardından base64 kodlu JSON taşır. Her rota için noktalar Google polyline algoritmasıyla (1e5 hassasiyet) sıkıştırılır, böylece uzun rotalar bile makul uzunlukta bir URL'e sığar. URL parçası (`#` sonrası) tarayıcı tarafından sunucuya gönderilmez.

## Harita katmanları

`BASEMAPS` nesnesi her katmanı bir ya da birkaç Leaflet karo katmanı olarak tanımlar (Uydu, görüntü ve etiket olmak üzere iki katmandır). Yeni bir katman eklemek bu nesneye bir giriş eklemekten ibarettir. Esri karolarında `maxNativeZoom` gerçek karo derinliğine ayarlıdır (Açık/Koyu için 16); daha yakın zoom'da Leaflet karoyu büyütür, harita boş kalmaz. Seçilen katman kayıtla birlikte saklanır.

## Önbellek sürümleme

GitHub Pages dosyaları yaklaşık 10 dakika önbelleğe aldırır. `index.html` yenilenip `app.js` eski kalırsa kullanıcı yeni sayfayı eski kodla çalıştırır. Bu yüzden `index.html` içindeki `assets/` adresleri `?v=<sürüm>` taşır ve arayüzdeki sürüm etiketiyle aynı olmak zorundadır. **Her sürümde ikisini birlikte artır**; e2e testi uyuşmazlığı yakalar.

## Duyarlı davranış

`fitPad()` panelin kapladığı alanı hesaba katarak harita sığdırma payını belirler: masaüstünde sol sütun, 480 px altında üstteki panelin yüksekliği. Bu hesap olmadan dar ekranda sığdırma "yer yok" sonucuna varır ve harita dünya ölçeğine uzaklaşır. Mobilde haritaya ilk dokunuş paneli katlar.

## Üçüncü taraf servisler

| Servis | Kullanım | Not |
|---|---|---|
| OSM / Esri karoları (opsiyonel CARTO) | Harita | Atıf (attribution) zorunludur, görünür bırakılır. CARTO anahtar ister; `config.js` içinde `cartoKey` doluysa kullanılır, boşsa aynı katmanlar Esri'den gelir |
| Nominatim | Arama | Otomatik tamamlama yasak: yalnızca Enter ile arar |
| FOSSGIS Valhalla | Yola oturtma | `costing: pedestrian`. Hata olursa düz çizgiye düşer |

## Neden framework yok

Uygulamanın durumu küçük ve tek bir sayfada. Derleme zinciri eklemek, "indir ve aç" kolaylığını bozar ve bakım yükü getirir. Dosya büyürse ilk adım `app.js` dosyasını ES modüllerine bölmek olur (harita, rota durumu, servisler, arayüz).
