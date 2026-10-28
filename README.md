# RainbowTV

Turkiye ulusal, haber, spor, belgesel, cocuk, muzik ve yerel televizyon kanallari icin gelistirilmis web tabanli canli TV platformu.

## Ozellikler

- 171 aktif HD televizyon ve radyo kanali
- Otomatik gunluk EPG (yayin akisi) destegi
- 24 saatlik geri sarma (catch-up / DVR)
- Ciftli ve 4'lu coklu ekran (multiview) modu
- WebGL tabanli goruntu netlestirme (upscaling)
- Uyku modu zamanlayicisi
- Klavye ve TV kumandasi kisayollari
- Smart TV ve Chromecast yayinlama destegi
- PWA (Progressive Web App) destegi

## Kurulum ve Calistirma

### Gereksinimler
- Python 3.9 veya uzeri
- Modern bir web tarayicisi (Chrome, Edge, Firefox, Safari)

2. Bagimliliklari yukleyin:
pip install -r requirements.txt

3. Sunucuyu baslatin:
python server.py

4. Tarayicinizda acin:
http://localhost:3000

Ayni agdaki telefon, tablet veya Smart TV uzerinden erismek icin:
http://BILGISAYAR_IP_ADRESINIZ:3000

## Kisayol Tuslari

| Tus | Islev |
| :---: | :--- |
| Yukari / Asagi | Sonraki / Onceki Kanal |
| Sol / Sag | Sesi Kıs / Artır (%5) |
| Bosluk / K | Oynat / Duraklat |
| M | Sesi Kapat / Ac (Mute) |
| F | Tam Ekran |
| P | Resim icinde Resim (PiP) |
| J / L | 10 Saniye Geri / Ileri |
| R | Canli Yayina Don |
| Z | Uyku Modu Menusu |
| 0-9 | Kanal Numarasina Git |
| ? | Kisayol Yardimi |
| Esc | Modallari Kapat |

## Dizin Yapisi

```text
tv/
├── logos/              -> Kanal logolari (.png / .webp)
├── .gitignore          -> Git haric tutma kurallari
├── app.js              -> Oynatici, EPG ve arayuz mantigi
├── channels.json       -> 171 kanal tanimi ve akis linkleri
├── favicon.png         -> Favicon
├── index.html          -> Ana HTML yapisi
├── LICENSE             -> MIT Lisansi
├── manifest.json       -> PWA manifest tanimi
├── rainbowtv_brand.png -> Logo gorseli
├── rainbowtv_icon.png  -> PWA uygulama ikonu
├── README.md           -> Proje dokumantasyonu
├── requirements.txt    -> Python paket listesi
├── server.py           -> Proxy ve EPG sunucusu
├── style.css           -> Stil dosyalari
└── sw.js               -> Service Worker
```

## Lisans

Bu proje MIT Lisansi ile lisanslanmistir. Detaylar icin LICENSE dosyasini inceleyebilirsiniz.
