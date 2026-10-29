/* Çalışma zamanı ayarları. Gizli bilgi KOYMA: bu dosya herkese açık yayınlanır.
 * Apple Maps (MapKit JS) için bkz. docs/APPLE-MAPS.md */
window.MESAFELER_CONFIG = {
  // MapKit JS için origin'e kilitli, imzalı JWT. Boşsa Apple katmanı gizli kalır.
  mapkitToken: "",
  // CARTO ücretsiz Basemaps API anahtarı (carto.com/basemaps/apikey). Boşsa Renkli/Açık/Koyu
  // katmanları anahtarsız Esri karolarından gelir. Anahtar tarayıcıya gider; herkese açık
  // olması normaldir ve CARTO bunu kabul eder.
  cartoKey: "",
  // Başlangıç merkezi (İstanbul) ve zoom
  defaultCenter: [41.0082, 28.9784],
  defaultZoom: 15
};
