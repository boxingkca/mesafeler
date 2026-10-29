#!/usr/bin/env python3
"""Mesafeler uçtan uca testi (Playwright + Chromium).

Çalıştırma:
    pip install playwright && playwright install chromium
    python3 -m http.server 8777 &
    python3 tests/e2e.py            # ya da BASE_URL=https://... python3 tests/e2e.py

Harita karoları, Nominatim ve Valhalla istekleri sahte yanıtlarla taklit edilir;
test ağdan bağımsızdır ve her çalıştırmada aynı sonucu verir.
"""
import base64
import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:8777/")
PNG_1PX = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)

failures = []
passed = 0


def check(name, cond, detail=""):
    global passed
    if cond:
        passed += 1
        print(f"  ok    {name}")
    else:
        failures.append(name)
        print(f"  FAIL  {name}  {detail}")


def enc_poly(coords, precision=6):
    """Valhalla'nın döndürdüğü biçimde polyline kodlar (sahte yanıt için)."""
    factor = 10 ** precision
    out, plat, plng = "", 0, 0

    def e(n):
        n = ~(n << 1) if n < 0 else n << 1
        s = ""
        while n >= 0x20:
            s += chr((0x20 | (n & 0x1F)) + 63)
            n >>= 5
        return s + chr(n + 63)

    for lat, lng in coords:
        a, b = round(lat * factor), round(lng * factor)
        out += e(a - plat) + e(b - plng)
        plat, plng = a, b
    return out


def new_context(browser, **kw):
    ctx = browser.new_context(**kw)
    # Harita karoları: ağa çıkma, saydam 1x1 PNG dön
    ctx.route(
        "**/*",
        lambda r: r.fulfill(status=200, content_type="image/png", body=PNG_1PX)
        if any(h in r.request.url for h in ("tile.openstreetmap.org", "cartocdn.com", "arcgisonline.com"))
        else r.continue_(),
    )
    return ctx


def open_app(ctx, suffix=""):
    pg = ctx.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    pg.goto(BASE + suffix)
    pg.wait_for_selector(".leaflet-container")
    return pg


def click_map(pg, pts):
    box = pg.locator("#map").bounding_box()
    for dx, dy in pts:
        pg.mouse.click(box["x"] + dx, box["y"] + dy)


def capture_share_hash(pg):
    pg.evaluate("window.__u=null; navigator.clipboard.writeText=async(u)=>{window.__u=u}")
    pg.click("#shareBtn")
    return "#" + pg.evaluate("window.__u").split("#", 1)[1]


def total_km(pg):
    v = float(pg.inner_text("#distVal"))
    return v * (1000 if pg.inner_text("#distUnit") == "km" else 1)


with sync_playwright() as p:
    browser = p.chromium.launch()

    # ---------------------------------------------------------------- temel
    print("Temel ölçüm")
    ctx = new_context(browser, viewport={"width": 1280, "height": 800}, accept_downloads=True)
    pg = open_app(ctx)
    click_map(pg, [(600, 300), (760, 340), (840, 460), (980, 420)])
    check("4 marker eklendi", pg.locator(".numico").count() == 4)
    check("3 bölüm satırı listelendi", pg.locator(".seg").count() == 3)
    r1 = total_km(pg)
    check("toplam mesafe pozitif", r1 > 0, f"({r1})")
    check("süre tahmini yazıldı", "dk" in pg.inner_text("#durVal"))

    pg.click("#undoBtn")
    check("geri al bir marker siler", pg.locator(".numico").count() == 3)
    click_map(pg, [(980, 420)])

    # ---------------------------------------------------------- karşılaştırma
    print("Rota karşılaştırma")
    pg.click("#addRoute")
    click_map(pg, [(600, 300), (700, 520), (980, 420)])
    check("iki rota listede", pg.locator(".rrow").count() == 2)
    meta = " | ".join(pg.locator(".rmeta").all_inner_texts()).replace("\n", " ")
    check("en kısa rota işaretlendi", "en kısa" in meta, meta)
    check("diğer rota için fark yazıldı", "+" in meta and "%" in meta, meta)

    pg.locator(".rrow").first.click(position={"x": 120, "y": 10})
    check("satıra tıklayınca rota aktif olur", "1" in pg.inner_text("#actName"))

    # ----------------------------------------------------------------- GPX
    print("GPX")
    with pg.expect_download() as d:
        pg.click("#gpxBtn")
    gpx = open(d.value.path(), encoding="utf-8").read()
    check("GPX geçerli XML başlığı", gpx.startswith("<?xml") and "<gpx" in gpx)
    check("GPX nokta sayısı marker sayısına eşit", gpx.count("<trkpt") == 4 and gpx.count("<wpt") == 4)

    # ------------------------------------------------------------ yola oturt
    print("Yola oturt")
    snap_calls = []

    def valhalla_ok(route):
        body = json.loads(route.request.post_data)
        snap_calls.append(len(body["locations"]))
        shape = enc_poly([(l["lat"], l["lon"]) for l in body["locations"]])
        legs = [{"shape": shape, "summary": {"length": 0.5}} for _ in range(len(body["locations"]) - 1)]
        route.fulfill(
            status=200, content_type="application/json",
            headers={"access-control-allow-origin": "*"},
            body=json.dumps({"trip": {"legs": legs, "summary": {"length": 0.5 * len(legs)}}}),
        )

    ctx.route("**/valhalla1.openstreetmap.de/**", valhalla_ok)
    pg.click("#snap")
    pg.wait_for_function("document.querySelector('#ptCount').textContent.includes('yola oturtuldu')", timeout=5000)
    check("sunucuya tüm noktalar gönderildi", snap_calls and snap_calls[-1] == 4, str(snap_calls))
    check("toplam sunucunun verdiği uzunluğa eşit (1.50 km)", pg.inner_text("#distVal") == "1.50", pg.inner_text("#distVal"))

    # sunucu hatasında düz çizgiye düşmeli
    ctx.unroute("**/valhalla1.openstreetmap.de/**")
    ctx.route("**/valhalla1.openstreetmap.de/**", lambda r: r.abort())
    click_map(pg, [(1000, 380)])
    try:
        pg.wait_for_function("!document.querySelector('#snap').classList.contains('on')", timeout=5000)
        snap_off = True
    except Exception:
        snap_off = False
    check("sunucu hatasında yola oturt kapanır", snap_off)
    check("hata sonrası mesafe yine hesaplanır", total_km(pg) > 0)

    # ------------------------------------------------------------------ arama
    print("Arama")
    nominatim = []

    def nominatim_mock(route):
        nominatim.append(route.request.url)
        route.fulfill(
            status=200, content_type="application/json",
            headers={"access-control-allow-origin": "*"},
            body=json.dumps([{
                "name": "Moda", "display_name": "Moda, Kadıköy, İstanbul, Türkiye",
                "lat": "40.9784", "lon": "29.0252",
                "boundingbox": ["40.972", "40.985", "29.018", "29.032"],
            }]),
        )

    ctx.route("**/nominatim.openstreetmap.org/**", nominatim_mock)
    pg.fill("#q", "Moda")
    pg.wait_for_timeout(1500)
    check("yazarken otomatik arama YAPILMAZ (Nominatim politikası)", len(nominatim) == 0, str(len(nominatim)))
    pg.press("#q", "Enter")
    pg.wait_for_selector(".res:not(.msg)", timeout=5000)
    check("Enter ile arama yapıldı", len(nominatim) == 1)
    check("Türkiye ile sınırlandırıldı", "countrycodes=tr" in nominatim[0])
    pg.click(".res:not(.msg)")
    pg.wait_for_timeout(500)
    lat = pg.evaluate("map.getCenter().lat")
    check("sonuç seçilince harita oraya gider", abs(lat - 40.978) < 0.05, str(lat))

    # ---------------------------------------------------------- kalıcılık
    print("Kalıcılık")
    ctx2 = new_context(browser, viewport={"width": 1280, "height": 800})
    pg2 = open_app(ctx2)
    click_map(pg2, [(600, 300), (760, 340), (840, 460)])
    pg2.goto(BASE)  # 300 ms yazma gecikmesini beklemeden hemen yenile
    pg2.wait_for_selector(".leaflet-container")
    check("hızlı yenilemede son düzenleme kaybolmaz", pg2.locator(".numico").count() == 3)
    pg2.click(".pill[data-k=uydu]")
    pg2.goto(BASE)
    pg2.wait_for_selector(".leaflet-container")
    check("harita katmanı seçimi kaydedilir", pg2.evaluate("document.querySelector('.pill[data-k=uydu]').classList.contains('on')"))

    # -------------------------------------------------------------- paylaşım
    print("Paylaşım")
    ctx3 = new_context(browser, viewport={"width": 1280, "height": 800})
    src = open_app(ctx3)
    click_map(src, [(500, 250), (700, 250), (700, 450), (500, 450)])
    h = capture_share_hash(src)
    check("paylaşım bağlantısı üretildi", h.startswith("#s=") and len(h) > 20)

    pg2.goto(BASE + h)
    pg2.wait_for_selector(".leaflet-container")
    names = pg2.locator(".rrow input").evaluate_all("els=>els.map(e=>e.value)")
    check("kendi rota KORUNDU, paylaşılan YANINA eklendi", len(names) == 2 and any("paylaşılan" in n for n in names), str(names))
    check("adres çubuğundaki hash temizlendi", pg2.evaluate("location.hash") == "")

    pg2.goto(BASE + h)
    pg2.wait_for_selector(".leaflet-container")
    check("aynı link tekrar açılınca rota çoğalmaz", pg2.locator(".rrow").count() == 2)

    pg2.evaluate("location.hash=%s" % json.dumps(h.replace("#", "")))  # açıkken yapıştırma
    pg2.wait_for_timeout(300)
    check("uygulama açıkken link yapıştırmak çalışır (çoğalmadan)", pg2.locator(".rrow").count() == 2)

    fresh = open_app(new_context(browser, viewport={"width": 1280, "height": 800}), h)
    check("yeni ziyaretçi paylaşılan rotayı görür", fresh.locator(".rrow").count() == 1 and total_km(fresh) > 0)

    # ---------------------------------------------------------------- mobil
    print("Mobil")
    mctx = new_context(browser, viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
    mob = open_app(mctx, h)
    mob.wait_for_timeout(500)
    zoom = mob.evaluate("map.getZoom()")
    check("dar ekranda sığdırma dünya ölçeğine kaçmaz", zoom >= 11, f"zoom={zoom}")
    ph = mob.evaluate("document.querySelector('#panel').offsetHeight")
    check("panel ekranın %60'ından fazlasını kaplamaz", ph <= 844 * 0.6, f"{ph}px")
    mob.touchscreen.tap(195, 700)
    mob.wait_for_timeout(300)
    check("haritaya dokununca panel katlanır", mob.evaluate("document.querySelector('#panel').classList.contains('collapsed')"))

    # ------------------------------------------------------ harita katmanları
    print("Harita katmanları")

    def tile_urls_for(cfg_key):
        c = new_context(browser, viewport={"width": 1280, "height": 800})
        if cfg_key:
            c.route("**/assets/js/config.js*", lambda r: r.fulfill(
                status=200, content_type="application/javascript",
                body='window.MESAFELER_CONFIG={cartoKey:"%s"};' % cfg_key))
        pgx = c.new_page()
        urls = []
        pgx.on("request", lambda rq: urls.append(rq.url))
        pgx.goto(BASE)
        pgx.wait_for_selector(".leaflet-container")
        for k in ("renkli", "acik", "koyu", "uydu", "detay"):
            pgx.click(".pill[data-k=%s]" % k)
            pgx.wait_for_timeout(250)
        return urls

    nokey = tile_urls_for(None)
    check("anahtar yokken CARTO'ya hiç istek gitmez (filigran çıkmaz)",
          not any("cartocdn.com" in u for u in nokey))
    check("anahtar yokken Renkli/Açık/Koyu Esri'den gelir",
          sum("arcgisonline.com" in u and "World_Street_Map" in u for u in nokey) > 0
          and sum("World_Light_Gray_Base" in u for u in nokey) > 0
          and sum("World_Dark_Gray_Base" in u for u in nokey) > 0)

    withkey = tile_urls_for("TESTKEY123")
    carto = [u for u in withkey if "cartocdn.com" in u]
    check("anahtar girilince CARTO katmanları kullanılır", len(carto) > 0)
    check("her CARTO isteği anahtarı taşır", carto and all("key=TESTKEY123" in u for u in carto),
          str([u for u in carto if "key=TESTKEY123" not in u][:2]))

    # ------------------------------------------------- önbellek sürümleme
    print("Önbellek")
    vctx = new_context(browser, viewport={"width": 1280, "height": 800})
    vpg = open_app(vctx)
    tag = vpg.inner_text(".head .tag").strip().lstrip("v")
    srcs = vpg.evaluate(
        "[...document.querySelectorAll('script[src],link[rel=stylesheet]')].map(e=>e.src||e.href)"
        ".filter(u=>u.includes('/assets/'))")
    check("assets/ dosyalarının hepsi ?v=<sürüm> taşır (eski önbellek kodu çalışmasın)",
          srcs and all(u.endswith("?v=" + tag) for u in srcs), f"tag={tag} {srcs}")

    # ------------------------------------------------- arama deneyimi + dar pencere
    print("Arama deneyimi ve dar pencere")
    sctx = new_context(browser, viewport={"width": 493, "height": 1041})  # 480 px eşiğinin hemen üstü
    hits = []

    def nom(route):
        hits.append(route.request.url)
        route.fulfill(status=200, content_type="application/json",
                      headers={"access-control-allow-origin": "*"},
                      body=json.dumps([{"name": "Moda", "display_name": "Moda, Kadıköy, İstanbul",
                                        "lat": "40.9811", "lon": "29.0254",
                                        "boundingbox": ["40.9711", "40.9911", "29.0154", "29.0354"]}]))
    sctx.route("**/nominatim.openstreetmap.org/**", nom)
    sp = open_app(sctx)
    sp.fill("#q", "Moda Kadıköy")
    sp.wait_for_selector(".res.hint", timeout=3000)
    check("yazarken ipucu satırı çıkar", "ara" in sp.inner_text(".res.hint"))
    sp.wait_for_timeout(1200)
    check("ipucu satırı sunucuya istek atmaz", len(hits) == 0)
    sp.click(".res.hint")
    sp.wait_for_selector(".res:not(.msg)", timeout=5000)
    check("ipucu satırına dokununca arama yapılır", len(hits) == 1)
    sp.click(".res:not(.msg)")
    sp.wait_for_timeout(600)
    z = sp.evaluate("map.getZoom()"); lat = sp.evaluate("map.getCenter().lat")
    check("493 px pencerede sonuç mahalle ölçeğinde gösterilir (ilçeye kaçmaz)", z >= 13, f"zoom={z}")
    check("harita doğru yere gider", abs(lat - 40.981) < 0.03, f"lat={lat}")
    check("dar pencerede panel katlanır", sp.evaluate("document.querySelector('#panel').classList.contains('collapsed')"))

    sctx2 = new_context(browser, viewport={"width": 493, "height": 1041})
    sctx2.route("**/nominatim.openstreetmap.org/**", lambda r: r.fulfill(status=429, body="Too Many Requests"))
    sp2 = open_app(sctx2)
    sp2.fill("#q", "Moda"); sp2.press("#q", "Enter")
    sp2.wait_for_selector(".res.msg", timeout=5000)
    try:
        sp2.wait_for_function("document.querySelector('.res.msg').textContent.includes('yanıt vermiyor')", timeout=5000)
        shown = True
    except Exception:
        shown = False
    check("arama servisi hata verirse açıklayıcı mesaj görünür", shown)

    fitctx = new_context(browser, viewport={"width": 493, "height": 1041})
    fp = open_app(fitctx, h)
    fp.wait_for_timeout(500)
    check("493 px pencerede paylaşılan rota dünya ölçeğine kaçmaz", fp.evaluate("map.getZoom()") >= 11,
          str(fp.evaluate("map.getZoom()")))

    # ------------------------------------------------------------ güvenlik
    print("Güvenlik")
    import base64
    EVIL_NAME = '<img src=x onerror="window.__pwned=1">'
    EVIL_COLOR = 'red;"><img src=x onerror="window.__pwned=2">'
    payload = {"v": 1, "r": [{"n": __import__("urllib.parse").parse.quote(EVIL_NAME, safe=""), "c": EVIL_COLOR, "s": 0,
                              "p": enc_poly([(41.0, 29.0), (41.001, 29.001)], 5)}]}
    evil_hash = "#s=" + base64.b64encode(json.dumps(payload).encode()).decode()
    xctx = new_context(browser, viewport={"width": 1280, "height": 800})
    xp = open_app(xctx, evil_hash)
    xp.wait_for_timeout(1000)
    check("zararlı paylaşım linki kod çalıştıramaz", xp.evaluate("window.__pwned") is None, str(xp.evaluate("window.__pwned")))
    nm = xp.locator(".rrow input").evaluate_all("els=>els.map(e=>e.value)")
    check("zararlı ad düz metin olarak gösterilir", any("<img" in n for n in nm), str(nm))
    col = xp.evaluate("document.querySelector('.rrow .dot').style.background")
    check("geçersiz renk paletteki güvenli bir renge düşer", "img" not in col and col != "", col)

    xctx2 = new_context(browser, viewport={"width": 1280, "height": 800})
    xctx2.route("**/nominatim.openstreetmap.org/**", lambda r: r.fulfill(
        status=200, content_type="application/json", headers={"access-control-allow-origin": "*"},
        body=json.dumps([{"name": EVIL_NAME, "display_name": EVIL_NAME + ", İstanbul", "lat": "41.0", "lon": "29.0"}])))
    xp2 = open_app(xctx2)
    xp2.fill("#q", "xx"); xp2.press("#q", "Enter")
    xp2.wait_for_selector(".res:not(.msg)", timeout=5000); xp2.wait_for_timeout(500)
    check("zararlı yer adı kod çalıştıramaz", xp2.evaluate("window.__pwned") is None)
    check("zararlı yer adı etiket olarak değil metin olarak görünür", "<img" in xp2.inner_text(".res:not(.msg) .r1"))

    # --------------------------------------------------------- hata yok mu
    print("Genel")
    allerr = pg.errors + pg2.errors + src.errors + fresh.errors + mob.errors
    check("hiç JavaScript hatası yok", not allerr, str(allerr[:3]))

    # Dosya taşımalarında bir yolu kaçırmak siteyi sessizce bozar; yerel isteklerin hiçbiri 404 vermemeli
    lctx = new_context(browser, viewport={"width": 1280, "height": 800})
    lpg = lctx.new_page()
    bad = []
    origin = BASE.split("/", 3)[0] + "//" + BASE.split("/", 3)[2]
    lpg.on("response", lambda r: bad.append(f"{r.status} {r.url}") if r.url.startswith(origin) and r.status >= 400 else None)
    lpg.goto(BASE)
    lpg.wait_for_selector(".leaflet-container")
    lpg.wait_for_timeout(800)
    check("sayfanın yüklediği hiçbir yerel dosya 404 vermez", not bad, str(bad))

    cdp = lctx.new_cdp_session(lpg)
    cdp.send("Page.enable")
    man = cdp.send("Page.getAppManifest")
    check("manifest hatasız çözülür", not man.get("errors") and man.get("data"), str(man.get("errors")))
    mdata = json.loads(man["data"]) if man.get("data") else {}
    check("manifest ikonları ve başlangıç adresi geçerli",
          mdata.get("icons") and all(i["src"].startswith("icons/") for i in mdata["icons"]) and mdata.get("start_url") == "../",
          str(mdata)[:200])
    for i in mdata.get("icons", []):
        r = lctx.request.get(BASE + "assets/" + i["src"])
        check("manifest ikonu erişilebilir: " + i["src"], r.status == 200, str(r.status))

    browser.close()

print(f"\n{passed} geçti, {len(failures)} başarısız")
if failures:
    print("Başarısız:", *failures, sep="\n  - ")
    sys.exit(1)
