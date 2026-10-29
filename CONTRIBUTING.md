# Katkı

Katkı ve geri bildirim memnuniyetle karşılanır.

## Hata bildirimi
[Issue aç](https://github.com/boxingkca/mesafeler/issues/new/choose) ve şunları yaz: hangi tarayıcı ve cihaz, ne yaptın, ne bekledin, ne oldu. Mümkünse paylaşım bağlantısını ekle; sorunu bire bir tekrar etmemizi sağlar.

## Geliştirme
Derleme adımı yoktur. Bkz. [README: Yerelde çalıştırma](README.md#yerelde-çalıştırma).

1. Depoyu çatalla (fork), bir dal aç.
2. Değişikliği yap. Gerekirse `tests/e2e.py` içine test ekle.
3. Testi çalıştır, PR aç.

## Kurallar
- **Gizli bilgi commit etme.** Özellikle `.p8` dosyalarını ve özel anahtarları. `config.js` herkese açıktır.
- Bağımlılık eklemeden önce konuş. Hedef, kurulumsuz ve küçük kalmak.
- Arayüz metinleri Türkçe, düz fiillerle, sentence case.
- Üçüncü taraf servislerin kullanım politikalarına uy (özellikle Nominatim: otomatik tamamlama yok).
