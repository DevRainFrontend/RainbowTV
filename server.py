
import sys
import ipaddress
import os
import re
import json
import time
import gzip
import io
import html
import threading
import urllib.parse
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import requests
import urllib3
import subprocess
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

PORT = 3000
CHANNELS_FILE = os.path.join(BASE_DIR, "channels.json")
EPG_CACHE_FILE = os.path.join(BASE_DIR, "epg_cache.json")
TR_TZ = timezone(timedelta(hours=3))
LIVE_EPG_CACHE = {"date": "", "last_sync": "", "channel_epg": {}}
NEWS_CACHE = {"timestamp": 0, "items": []}
YT_RESOLVE_CACHE = {}
CATCHUP_CACHE = {}

PROXY_SESSION = requests.Session()
PROXY_SESSION.verify = False
adapter = requests.adapters.HTTPAdapter(pool_connections=60, pool_maxsize=60, max_retries=1)
PROXY_SESSION.mount('http://', adapter)
PROXY_SESSION.mount('https://', adapter)

def resolve_youtube_hls(query_or_url):

    now = time.time()
    cached = YT_RESOLVE_CACHE.get(query_or_url)
    if cached and (cached['expires'] > now):
        return cached['m3u8']

    try:
        cmd = ["yt-dlp", "-g", "--no-warnings", query_or_url]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
        lines = [l.strip() for l in res.stdout.split('\n') if l.strip() and 'm3u8' in l]
        if lines:
            m3u8_url = lines[0]
            YT_RESOLVE_CACHE[query_or_url] = {
                'm3u8': m3u8_url,
                'expires': now + 7200
            }
            return m3u8_url
    except Exception as e:
        print(f"[WARN] YouTube resolve error ({query_or_url}): {e}")
    return None

CHANNELS_DEFINITIONS = [

    {
        "num": 1, "name": "TRT 1", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/TRT_1_logo_2021.svg/512px-TRT_1_logo_2021.svg.png",
        "url": "https://tv-trt1.medya.trt.com.tr/master.m3u8",
        "backup": "https://tv-trt1.medya.trt.com.tr/master_720.m3u8",
        "desc": "Türkiye Radyo Televizyon Kurumu 1. Kanalı - Dizi, Sinema, Spor ve Kültür"
    },
    {
        "num": 2, "name": "ATV", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Atv_logo_2011.svg/512px-Atv_logo_2011.svg.png",
        "url": "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/atv/atv_1080p.m3u8",
        "backup": "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/a2tv/a2tv.m3u8",
        "desc": "Turkuvaz Medya Grubu - Dizi, Yarışma ve Güncel Programlar"
    },
    {
        "num": 3, "name": "Kanal D", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Kanal_D_logo_2021.svg/512px-Kanal_D_logo_2021.svg.png",
        "url": "https://demiroren.daioncdn.net/kanald/kanald.m3u8?app=kanald_web&ce=3",
        "backup": "https://kdlive.duhnet.tv/S2/HLS_LIVE/kanalddainp/playlist.m3u8",
        "desc": "Demirören Medya - Türkiye'nin Sevilen Dizileri ve Eğlence Kuşakları"
    },
    {
        "num": 4, "name": "Star TV", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Star_TV_logo_2011.svg/512px-Star_TV_logo_2011.svg.png",
        "url": "https://dogus.daioncdn.net/startv/startv_720p.m3u8?app=a20ac41e-bdc3-4aa1-934d-26b484480ac9&ce=3&sid=8l4w3lst4co5",
        "backup": "https://dogus-live.daioncdn.net/startv/startv_720p.m3u8",
        "desc": "Doğuş Yayın Grubu - Popüler Diziler, Eğlence ve Özel Şovlar"
    },
    {
        "num": 5, "name": "NOW (Fox)", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/NOW_Turkey_Logo.svg/512px-NOW_Turkey_Logo.svg.png",
        "url": "https://uycyyuuzyh.turknet.ercdn.net/nphindgytw/nowtv/nowtv_720p.m3u8",
        "backup": "https://c.fulltvizle.com/fox/tracks-v1a1/mono.m3u8",
        "desc": "Disney Grubu bünyesinde NOW - Haber, Drama ve Reality Formatları"
    },
    {
        "num": 6, "name": "Show TV", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Show_TV_logo.svg/512px-Show_TV_logo.svg.png",
        "url": "https://raw.githubusercontent.com/rideordie16/YouTube/main/ch/showturk.m3u8",
        "backup": "https://ciner-live.ercdn.net/showtv/showtv.m3u8",
        "desc": "Ciner Medya - Gülümseten Diziler, Yarışmalar ve Show Ana Haber"
    },
    {
        "num": 7, "name": "TV8", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/TV8_logo.svg/512px-TV8_logo.svg.png",
        "url": "https://tv8.daioncdn.net/tv8/tv8_1080p.m3u8?app=tv8_web&ce=3",
        "backup": "https://tv8.daioncdn.net/tv8/tv8.m3u8?app=7ddc255a-ef47-4e81-ab14-c0e5f2949788&ce=3",
        "desc": "Acun Medya - MasterChef, Survivor, O Ses Türkiye ve Eğlence"
    },
    {
        "num": 8, "name": "TV8.5", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/TV8.5_logo.png/512px-TV8.5_logo.png",
        "url": "https://tv8.daioncdn.net/tv8bucuk/tv8bucuk.m3u8",
        "backup": "https://tv8-live.daioncdn.net/tv8bucuk/tv8bucuk_720p.m3u8",
        "desc": "Acun Medya - Avrupa Futbolu, Boks Geceleri ve Spor Eğlence"
    },
    {
        "num": 9, "name": "Beyaz TV", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Beyaz_TV_logo.png/512px-Beyaz_TV_logo.png",
        "url": "https://beyaztv-live.daioncdn.net/beyaztv/beyaztv.m3u8",
        "backup": "https://mn-nl.mncdn.com/blutv_beyaztv2/live.m3u8",
        "desc": "Beyaz TV - Beyaz Futbol, Tartışma, Sinema ve Magazin"
    },
    {
        "num": 10, "name": "Teve2", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Teve2_logo.png/512px-Teve2_logo.png",
        "url": "https://live.duhnet.tv/S2/HLS_LIVE/teve2np/playlist.m3u8",
        "backup": "https://demiroren-live.daioncdn.net/teve2/teve2_720p.m3u8",
        "desc": "Demirören Medya - Kelime Oyunu, Nostalji Diziler ve Eğlence"
    },
    {
        "num": 11, "name": "Kanal 7", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Kanal_7_logo_2011.png/512px-Kanal_7_logo_2011.png",
        "url": "https://livetv.radyotvonline.net/kanal7live/kanal7avr/playlist.m3u8",
        "backup": "https://kanal7.blutv.com/blutv_kanal7_live/live.m3u8",
        "desc": "Hayat Görsel Yayıncılık - Günlük Diziler, Gezi ve Sohbet Kuşakları"
    },
    {
        "num": 12, "name": "Flash Haber TV", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Flash_Haber_TV_logo.png/512px-Flash_Haber_TV_logo.png",
        "url": "https://b01c02nl.mediatriple.net/videoonlylive/mtyycglqauzjhlive/broadcast_67c053c48829f.smil/playlist.m3u8",
        "backup": "https://live.artidijitalmedya.com/artidijital_flashhaber/flashhaber/playlist.m3u8",
        "desc": "Gündem, Tartışma ve Canlı Haber Yayınları"
    },
    {
        "num": 13, "name": "Ülke TV", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Ulke_TV_logo.png/512px-Ulke_TV_logo.png",
        "url": "https://ulketv.blutv.com/blutv_ulketv2/live_720p2000000kbps/index.m3u8",
        "backup": "https://ulketv-live.ercdn.net/ulketv/ulketv.m3u8",
        "desc": "Ülke TV - Haber, Analiz, Belgesel ve Tarih Kuşakları"
    },
    {
        "num": 14, "name": "TV100", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Tv100_logo.png/512px-Tv100_logo.png",
        "url": "https://tv100.daioncdn.net/tv100/tv100_1080p.m3u8?app=web",
        "backup": "https://tv100-live.ercdn.net/tv100/tv100.m3u8",
        "desc": "Haber, Tartışma ve Objektif Yorum Kuşakları"
    },
    {
        "num": 15, "name": "360 TV", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/360_logo.svg/512px-360_logo.svg.png",
        "url": "https://turkmedya-live.ercdn.net/tv360/tv360.m3u8",
        "backup": "https://turkmedya-live.ercdn.net/tv360/tv360_720p.m3u8",
        "desc": "TürkMedya - Yaşam, Aile, Eğlence ve Yarışma"
    },
    {
        "num": 16, "name": "24 TV", "category": "Ulusal", "group": "Ulusal",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/24_logo.png/512px-24_logo.png",
        "url": "https://turkmedya-live.ercdn.net/tv24/tv24.m3u8",
        "backup": "https://mn-nl.mncdn.com/kanal24/kanal24.smil/chunklist_b896000.m3u8",
        "desc": "TürkMedya - Doğrusunu Öğrenin, Haber ve Politika"
    },

    {
        "num": 20, "name": "TRT Haber", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/TRT_Haber_logo_2021.svg/512px-TRT_Haber_logo_2021.svg.png",
        "url": "https://tv-trthaber.medya.trt.com.tr/master.m3u8",
        "backup": "https://tv-trthaber.medya.trt.com.tr/master_720.m3u8",
        "desc": "TRT Haber - Türkiye ve Dünya Gündemi, Son Dakika Gelişmeleri"
    },
    {
        "num": 21, "name": "NTV", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/NTV_logo.svg/512px-NTV_logo.svg.png",
        "url": "https://dogus.daioncdn.net/ntv/ntv_720p.m3u8",
        "backup": "https://dogus.daioncdn.net/ntv/ntv.m3u8?app=ntv_web",
        "desc": "Doğuş Yayın Grubu - Türkiye'nin İlk Tematik Haber Kanalı"
    },
    {
        "num": 22, "name": "Habertürk", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Habert%C3%BCrk_TV_logo.svg/512px-Habert%C3%BCrk_TV_logo.svg.png",
        "url": "https://tv.ensonhaber.com/haberturk/haberturk.m3u8",
        "backup": "https://ciner-live.daioncdn.net/haberturktv/haberturktv_1080p.m3u8",
        "desc": "Ciner Medya - Doğru ve Hızlı Haber, Derinlemesine Analizler"
    },
    {
        "num": 23, "name": "CNN Türk", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/CNN_T%C3%BCrk_logo.svg/512px-CNN_T%C3%BCrk_logo.svg.png",
        "url": "https://live.duhnet.tv/S2/HLS_LIVE/cnnturknp/playlist.m3u8",
        "backup": "https://demiroren-live.daioncdn.net/cnnturk/cnnturk_720p.m3u8",
        "desc": "Demirören & Warner Bros Discovery - İlk Bilen Siz Olun"
    },
    {
        "num": 24, "name": "Sözcü TV", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/S%C3%B6zc%C3%BC_TV_logo.png/512px-S%C3%B6zc%C3%BC_TV_logo.png",
        "url": "https://szctvdvr.blutv.com/blutv_szctv_dvr/live_720p4350000kbps/index.m3u8",
        "backup": "https://sozcutv-live.ercdn.net/sozcutv/sozcutv.m3u8",
        "desc": "Sözcü Gazetesi Bünyesinde Özgür ve Cesur Haber"
    },
    {
        "num": 25, "name": "Halk TV", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Halk_TV_logo_2022.svg/512px-Halk_TV_logo_2022.svg.png",
        "url": "https://halktv-live.daioncdn.net/halktv/halktv.m3u8",
        "backup": "https://halktv.daioncdn.net/halktv/halktv_1080p.m3u8?app=c86957d3-74a7-44da-9ad2-dc358c769609",
        "desc": "Halk TV - Tarafsız, İlkeli Habercilik ve Tartışma Programları"
    },
    {
        "num": 26, "name": "A Haber", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/A_Haber_logo.svg/512px-A_Haber_logo.svg.png",
        "url": "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/ahaber/ahaber.m3u8",
        "backup": "https://c.fulltvizle.com/ahaber/index.m3u8",
        "desc": "Turkuvaz Medya Grubu - Haberin Adresi ve Sıcak Gelişmeler"
    },
    {
        "num": 27, "name": "TGRT Haber", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/TGRT_Haber_logo.png/512px-TGRT_Haber_logo.png",
        "url": "https://canli.tgrthaber.com/tgrt.m3u8",
        "backup": "https://b01c02nl.mediatriple.net/videoonlylive/mtsxxkzwwuqtglive/broadcast_5fe462afc6a0e.smil/playlist.m3u8",
        "desc": "İhlas Medya - Anında Haberdar Olun, Türkiye ve Dünya"
    },
    {
        "num": 28, "name": "Haber Global", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Haber_Global_logo.svg/512px-Haber_Global_logo.svg.png",
        "url": "https://tv.ensonhaber.com/haberglobal/haberglobal.m3u8",
        "backup": "https://globalmedya-live.ercdn.net/haberglobal/haberglobal.m3u8",
        "desc": "Global Medya Grubu - Küresel ve Yerel Gündem Analizleri"
    },
    {
        "num": 29, "name": "Bengü Türk", "category": "Haber", "group": "Haber",
        "logo": "https://i.imgur.com/mgDCKiy.png",
        "url": "https://edge1.socialsmart.tv/benguturk/bant1/playlist.m3u8",
        "backup": "https://benguturk.daioncdn.net/benguturk/benguturk.m3u8",
        "desc": "Milli Değerler, Türk Dünyası ve Gündem Haberleri"
    },
    {
        "num": 30, "name": "KRT TV", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/KRT_TV_logo.png/512px-KRT_TV_logo.png",
        "url": "https://live.artidijitalmedya.com/artidijital_krttv/krttv/playlist.m3u8",
        "backup": "https://krttv-live.ercdn.net/krttv/krttv.m3u8",
        "desc": "Kültür Radyo Televizyonu - Bağımsız Haber ve Yorum"
    },
    {
        "num": 31, "name": "Ekotürk", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Ekot%C3%BCrk_logo.png/512px-Ekot%C3%BCrk_logo.png",
        "url": "https://cdn.ekoturk.net/hls/master.m3u8",
        "backup": "https://ekoturk-live.ercdn.net/ekoturk/ekoturk.m3u8",
        "desc": "Türkiye'nin Ekonomi Ekranı - Piyasa, Finans ve Yatırım"
    },
    {
        "num": 32, "name": "Bloomberg HT", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Bloomberg_HT_logo.svg/512px-Bloomberg_HT_logo.svg.png",
        "url": "https://ciner-live.daioncdn.net/bloomberght/bloomberght_1080p.m3u8",
        "backup": "https://bloomberght-live.daioncdn.net/bloomberght/bloomberght.m3u8",
        "desc": "Ciner & Bloomberg LP - Küresel Finans ve Türkiye Piyasaları"
    },
    {
        "num": 33, "name": "Tele1", "category": "Haber", "group": "Haber",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Tele1_logo.png/512px-Tele1_logo.png",
        "url": "https://tele1-live.ercdn.net/tele1/tele1.m3u8",
        "backup": "https://edge1.socialsmart.tv/tele1/bant1/playlist.m3u8",
        "desc": "Gerçeğin Adresi - Haber ve Araştırmacı Gazetecilik"
    },

    {
        "num": 40, "name": "TRT Spor", "category": "Spor", "group": "Spor",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/TRT_Spor_logo_2021.svg/512px-TRT_Spor_logo_2021.svg.png",
        "url": "https://tv-trtspor1.medya.trt.com.tr/master.m3u8",
        "backup": "https://tv-trtspor1.medya.trt.com.tr/master_720.m3u8",
        "desc": "TRT Spor - Trendyol Süper Lig Özetleri, Milli Maçlar ve Canlı Yayınlar"
    },
    {
        "num": 41, "name": "TRT Spor Yıldız", "category": "Spor", "group": "Spor",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/TRT_Spor_Y%C4%B1ld%C4%B1z_logo.svg/512px-TRT_Spor_Y%C4%B1ld%C4%B1z_logo.svg.png",
        "url": "https://tv-trtspor2.medya.trt.com.tr/master.m3u8",
        "backup": "https://tv-trtspor2.medya.trt.com.tr/master_720.m3u8",
        "desc": "Olimpik Branşlar, Voleybol Sultanlar Ligi, Basketbol ve Güreş"
    },
    {
        "num": 42, "name": "A Spor", "category": "Spor", "group": "Spor",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/A_Spor_logo.svg/512px-A_Spor_logo.svg.png",
        "url": "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/aspor/aspor.m3u8",
        "backup": "https://c.fulltvizle.com/aspor/index.m3u8",
        "desc": "Ziraat Türkiye Kupası, Maç Önü/Sonu Yorumları ve Canlı Skor"
    },
    {
        "num": 43, "name": "FB TV", "category": "Spor", "group": "Spor",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/FB_TV_logo.svg/512px-FB_TV_logo.svg.png",
        "url": "http://1hskrdto.rocketcdn.com/fenerbahcetv.smil/playlist.m3u8",
        "backup": "https://fenerbahce-live.ercdn.net/fbtv/fbtv.m3u8",
        "desc": "Fenerbahçe Spor Kulübü Resmi Televizyonu"
    },
    {
        "num": 44, "name": "HT Spor TV", "category": "Spor", "group": "Spor",
        "logo": "https://ciner.daioncdn.net/ht-spor/logo.png",
        "url": "https://ciner.daioncdn.net/ht-spor/ht-spor.m3u8?app=web",
        "backup": "https://ciner-live.daioncdn.net/ht-spor/ht-spor.m3u8",
        "desc": "Ciner Medya Spor Ekranı - Futbol, Basketbol ve Spor Analizi"
    },
    {
        "num": 45, "name": "TJK TV", "category": "Spor", "group": "Spor",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/TJK_logo.png/512px-TJK_logo.png",
        "url": "https://tjktv-live.tjk.org/tjktv.m3u8",
        "backup": "https://tjktv-live.tjk.org/tjktv2/tjktv2.m3u8",
        "desc": "Türkiye Jokey Kulübü Resmi Canlı At Yarışı Kanalı"
    },

    {
        "num": 50, "name": "TRT Belgesel", "category": "Belgesel & Kültür", "group": "Belgesel & Kültür",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/TRT_Belgesel_logo_2020.svg/512px-TRT_Belgesel_logo_2020.svg.png",
        "url": "https://tv-trtbelgesel.medya.trt.com.tr/master.m3u8",
        "backup": "https://tv-trtbelgesel.medya.trt.com.tr/master_720.m3u8",
        "desc": "Doğa, Macera, Tarih, Bilim ve İnsan Hikayeleri"
    },
    {
        "num": 51, "name": "Diyanet TV", "category": "Belgesel & Kültür", "group": "Belgesel & Kültür",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Diyanet_TV_logo.svg/512px-Diyanet_TV_logo.svg.png",
        "url": "https://eustr73.mediatriple.net/videoonlylive/mtikoimxnztxlive/broadcast_5e3bf95a47e07.smil/playlist.m3u8",
        "backup": "https://tv-diyanettv.medya.trt.com.tr/master.m3u8",
        "desc": "Diyanet İşleri Başkanlığı Kültür, İnanç ve Ahlak Yayınları"
    },
    {
        "num": 52, "name": "Vav TV", "category": "Belgesel & Kültür", "group": "Belgesel & Kültür",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Vav_TV_logo.png/512px-Vav_TV_logo.png",
        "url": "https://playlist.fasttvcdn.com/pl/rfrk9821hdy9dayo8wfyha/kltr-sanat-tv/playlist.m3u8",
        "backup": "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/vavtv/vavtv.m3u8",
        "desc": "Kültür, Sanat, Tasavvuf ve İlim Pencereleri"
    },
    {
        "num": 53, "name": "TRT 2", "category": "Belgesel & Kültür", "group": "Belgesel & Kültür",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/TRT_2_logo_2019.svg/512px-TRT_2_logo_2019.svg.png",
        "url": "https://tv-trt2.medya.trt.com.tr/master.m3u8",
        "backup": "https://tv-trt2.medya.trt.com.tr/master_720.m3u8",
        "desc": "TRT Kültür Sanat - Dünya Sineması, Tiyatro, Edebiyat ve Felsefe"
    },

    {
        "num": 60, "name": "TRT Çocuk", "category": "Çocuk", "group": "Çocuk",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/TRT_%C3%87ocuk_logo_2021.svg/512px-TRT_%C3%87ocuk_logo_2021.svg.png",
        "url": "https://tv-trtcocuk.medya.trt.com.tr/master.m3u8",
        "backup": "https://tv-trtcocuk.medya.trt.com.tr/master_720.m3u8",
        "desc": "Rafadan Tayfa, Akıllı Tavşan Momo, Kaptanın Maceraları ve Çizgi Filmler"
    },
    {
        "num": 61, "name": "Minika Çocuk", "category": "Çocuk", "group": "Çocuk",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Minika_%C3%87ocuk_logo.png/512px-Minika_%C3%87ocuk_logo.png",
        "url": "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/minikago_cocuk/minikago_cocuk.m3u8",
        "backup": "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/minikagococuk/minikagococuk.m3u8",
        "desc": "0-6 Yaş Okul Öncesi Eğitici ve Eğlenceli Çizgi Animasyonlar"
    },
    {
        "num": 62, "name": "Minika GO", "category": "Çocuk", "group": "Çocuk",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Minika_GO_logo.png/512px-Minika_GO_logo.png",
        "url": "https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/minikago/minikago.m3u8",
        "backup": "https://minikago.daioncdn.net/minikago/minikago.m3u8",
        "desc": "7-14 Yaş Macera, Çizgi Dizi, Kahramanlar ve Eğlence"
    },
    {
        "num": 63, "name": "TRT Diyanet Çocuk", "category": "Çocuk", "group": "Çocuk",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/TRT_%C3%87ocuk_logo_2021.svg/512px-TRT_%C3%87ocuk_logo_2021.svg.png",
        "url": "https://tv-trtdiyanetcocuk.medya.trt.com.tr/master.m3u8",
        "backup": "https://tv-trtdiyanetcocuk.medya.trt.com.tr/master_720.m3u8",
        "desc": "Ahlak, Sevgi ve Dostluk Temalı Eğitici Çocuk Yapımları"
    },

    {
        "num": 70, "name": "Kral Pop", "category": "Müzik", "group": "Müzik",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Kral_Pop_TV_logo.svg/512px-Kral_Pop_TV_logo.svg.png",
        "url": "https://dogus-live.daioncdn.net/kralpoptv/playlist.m3u8",
        "backup": "http://dygvideo.dygdigital.com/live/hls/kralpop",
        "desc": "Doğuş Yayın Grubu - Türkçe Pop Müziğin Lider Ekranı"
    },
    {
        "num": 71, "name": "Power TV", "category": "Müzik", "group": "Müzik",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Power_TV_logo.svg/512px-Power_TV_logo.svg.png",
        "url": "https://livetv.powerapp.com.tr/powerTV/powerhd.smil/playlist.m3u8",
        "backup": "https://livetv.powerapp.com.tr/powerTV/powerhd.smil/chunklist_b2650000_sltur.m3u8",
        "desc": "Power Medya - Yabancı Hit Müzik ve Dünyaca Ünlü Video Klipler"
    },
    {
        "num": 72, "name": "PowerTürk TV", "category": "Müzik", "group": "Müzik",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/PowerT%C3%BCrk_TV_logo.svg/512px-PowerT%C3%BCrk_TV_logo.svg.png",
        "url": "https://live.artidijitalmedya.com/artidijital_powerturktv/powerturktv/playlist.m3u8",
        "backup": "https://livetv.powerapp.com.tr/dance/dance.smil/playlist.m3u8",
        "desc": "Önce Müzik - En Yeni Türkçe Klipler ve Özel Konserler"
    },
    {
        "num": 73, "name": "Number 1 TV", "category": "Müzik", "group": "Müzik",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Number_One_TV_logo.png/512px-Number_One_TV_logo.png",
        "url": "https://b01c02nl.mediatriple.net/videoonlylive/mtkgeuihrlfwlive/broadcast_5c9e17cd59e8b.smil/playlist.m3u8",
        "backup": "https://nr1.daioncdn.net/nr1/nr1.m3u8",
        "desc": "Number 1 Medya Grubu - Küresel Hit Şarkılar ve Müzik Trendleri"
    },
    {
        "num": 74, "name": "Number 1 Türk", "category": "Müzik", "group": "Müzik",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Number_One_T%C3%BCrk_TV_logo.png/512px-Number_One_T%C3%BCrk_TV_logo.png",
        "url": "https://b01c02nl.mediatriple.net/videoonlylive/mtkgeuiizlwdlive/broadcast_5c9e2b4cb10e7.smil/playlist.m3u8",
        "backup": "https://nr1turk.daioncdn.net/nr1turk/nr1turk.m3u8",
        "desc": "En İyi Türkçe Pop, Rock ve Rap Şarkılar"
    },
    {
        "num": 75, "name": "Dream Türk", "category": "Müzik", "group": "Müzik",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Dream_T%C3%BCrk_logo.png/512px-Dream_T%C3%BCrk_logo.png",
        "url": "https://live.duhnet.tv/S2/HLS_LIVE/dreamturknp/playlist.m3u8",
        "backup": "https://demiroren-live.daioncdn.net/dreamturk/dreamturk_720p.m3u8",
        "desc": "Demirören Medya - İyice Dinle, Türkçe Müziğin Kalbi"
    },
    {
        "num": 76, "name": "TRT Müzik", "category": "Müzik", "group": "Müzik",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/TRT_M%C3%BCzik_logo_2021.svg/512px-TRT_M%C3%BCzik_logo_2021.svg.png",
        "url": "https://tv-trtmuzik.medya.trt.com.tr/master.m3u8",
        "backup": "https://tv-trtmuzik.medya.trt.com.tr/master_720.m3u8",
        "desc": "Türk Sanat Müziği, Türk Halk Müziği ve Kültürümüzün Ezgileri"
    },

    {
        "num": 80, "name": "Kanal 26", "category": "Yerel & Diğer", "group": "Yerel & Diğer",
        "logo": "https://i.imgur.com/PexhKwp.png",
        "url": "https://live.artidijitalmedya.com/artidijital_kanal26/kanal26/playlist.m3u8",
        "backup": "",
        "desc": "Eskişehir ve İç Anadolu Bölgesinin İlk Yerel Televizyonu"
    },
    {
        "num": 81, "name": "AS TV", "category": "Yerel & Diğer", "group": "Yerel & Diğer",
        "logo": "https://asset.artidijitalmedya.com/images/astv.png",
        "url": "https://live.artidijitalmedya.com/artidijital_astv/astv/playlist.m3u8",
        "backup": "",
        "desc": "Sönmez Medya Grubu - Bursa ve Marmara Gündemi"
    },
    {
        "num": 82, "name": "BRTV", "category": "Yerel & Diğer", "group": "Yerel & Diğer",
        "logo": "https://i.imgur.com/mgDCKiy.png",
        "url": "https://live.artidijitalmedya.com/artidijital_brtv/brtv/playlist.m3u8",
        "backup": "",
        "desc": "Batı Karadeniz'in Sesi - Karabük, Bartın, Zonguldak"
    },
    {
        "num": 83, "name": "Edessa TV", "category": "Yerel & Diğer", "group": "Yerel & Diğer",
        "logo": "https://i.imgur.com/mgDCKiy.png",
        "url": "https://canli.edessatv.com/hls/stream.m3u8",
        "backup": "",
        "desc": "Şanlıurfa ve Güneydoğu Anadolu Gündemi"
    },
    {
        "num": 84, "name": "Kanal 3", "category": "Yerel & Diğer", "group": "Yerel & Diğer",
        "logo": "https://i.imgur.com/mgDCKiy.png",
        "url": "https://live.artidijitalmedya.com/artidijital_kanal3/kanal3/playlist.m3u8",
        "backup": "",
        "desc": "Afyonkarahisar ve Ege Bölgesinin Güçlü Sesi"
    },
    {
        "num": 85, "name": "TV 264", "category": "Yerel & Diğer", "group": "Yerel & Diğer",
        "logo": "https://i.imgur.com/mgDCKiy.png",
        "url": "https://b01c02nl.mediatriple.net/videoonlylive/mtdxkkitgbrckilive/broadcast_5ee244263fd6d.smil/playlist.m3u8",
        "backup": "",
        "desc": "Sakarya ve Marmara Bölgesi Yerel Yayın Ekranı"
    },
    {
        "num": 86, "name": "TBMM TV", "category": "Yerel & Diğer", "group": "Yerel & Diğer",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/TBMM_TV_logo.svg/512px-TBMM_TV_logo.svg.png",
        "url": "https://meclistv-live.ercdn.net/meclistv/meclistv.m3u8",
        "backup": "",
        "desc": "Türkiye Büyük Millet Meclisi Genel Kurul Canlı Yayınları"
    },
    {
        "num": 87, "name": "TRT Avaz", "category": "Yerel & Diğer", "group": "Yerel & Diğer",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/TRT_Avaz_logo_2021.svg/512px-TRT_Avaz_logo_2021.svg.png",
        "url": "https://tv-trtavaz.medya.trt.com.tr/master.m3u8",
        "backup": "",
        "desc": "Türk Dünyası, Kafkaslar, Balkanlar ve Orta Asya Köprüsü"
    },
    {
        "num": 88, "name": "TRT Türk", "category": "Yerel & Diğer", "group": "Yerel & Diğer",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/TRT_T%C3%BCrk_logo_2020.svg/512px-TRT_T%C3%BCrk_logo_2020.svg.png",
        "url": "https://tv-trtturk.medya.trt.com.tr/master.m3u8",
        "backup": "",
        "desc": "Yurt Dışında Yaşayan Vatandaşlarımıza Özel Kültür ve Haber"
    }
]

CATEGORY_TEMPLATES = {
    "Ulusal": [
        ("06:00", "07:30", "Güne Merhaba", "Haberler, hava durumu, gazete manşetleri ve günün ilk gelişmeleri."),
        ("07:30", "10:00", "Sabah Sabah Canlı", "Günün pozitif enerjisi, sağlık tüyoları ve yaşamdan renkli hikayeler."),
        ("10:00", "13:00", "Halkın Ekranı Kuşağı", "İlgi çekici konular, araştırmalar ve uzman konuklar."),
        ("13:00", "14:00", "Gün Ortası Bülteni", "Günün sıcak başlıkları, ekonomi ve saha bağlantıları."),
        ("14:00", "16:15", "Sevilen Dizi Tekrarı", "İzleyicilerin soluksuz takip ettiği unutulmaz bölümler."),
        ("16:15", "18:45", "Yarışma / Talk Show", "Büyük ödüllü bilgi ve eğlence yarışması."),
        ("18:45", "20:00", "Ana Haber Bülteni", "Türkiye ve dünya gündeminin en çarpıcı ve güvenilir haberleri."),
        ("20:00", "23:30", "Prime Time: Yeni Dizi / Sinema", "Milyonları ekran başına kilitleyen heyecan dolu özel yayın."),
        ("23:30", "01:30", "Gece Kuşağı & Sinema", "Aksiyon, gerilim ve dram dolu yabancı sinema kuşağı."),
        ("01:30", "03:30", "Gece Sohbetleri", "Kültür, sanat, felsefe ve keyifli sohbetler."),
        ("03:30", "06:00", "Huzur Vakti / Müzik", "Geceyi tamamlayan dinlendirici tınılar ve doğa manzaraları.")
    ],
    "Haber": [
        ("06:00", "09:00", "Günün İlk Işıkları", "Son dakika gelişmeleri, piyasa açılışları ve köşe yazarları."),
        ("09:00", "11:00", "Manşet & Analiz", "Günün öne çıkan başlıkları stüdyo konuklarıyla irdeleniyor."),
        ("11:00", "13:00", "Ekonomi ve Piyasalar", "Borsa, döviz, emtia ve iş dünyasının nabzı."),
        ("13:00", "15:00", "Öğle Bülteni ve Canlı Bağlantılar", "Ankara, İstanbul ve sıcak bölgelerden canlı yayınlar."),
        ("15:00", "17:00", "Dünya Raporu", "Küresel diplomasi, Ortadoğu, Avrupa ve Washington kulisleri."),
        ("17:00", "19:00", "Akşam Haberleri", "Günün tüm olaylarının kapsamlı özeti ve son gelişmeler."),
        ("19:00", "20:30", "Ana Haber Kuşağı", "Olay yerinden en sıcak görüntüler ve özel röportajlar."),
        ("20:30", "23:30", "Açık Oturum / Tartışma Masası", "Uzman akademisyenler ve gazetecilerle günün tartışması."),
        ("23:30", "01:30", "Gece Raporu", "Gece yarısına kadar yaşanan tüm gelişmeler ve yarının ajandası."),
        ("01:30", "06:00", "Gece Ajansı (Sıcak Takip)", "7/24 kesintisiz son dakika akışı ve bültenler.")
    ],
    "Spor": [
        ("06:00", "08:30", "Sabah Sporu & Isınma Turu", "Gece maçlarının özetleri, NBA ve dünya spor haberleri."),
        ("08:30", "11:00", "Gazeteler ve Transfer Hattı", "Spor manşetleri, kulis bilgileri ve transfer dedikoduları."),
        ("11:00", "13:30", "Spor Merkezi & Analiz", "Teknik direktörlerin açıklamaları, taktik tahtası."),
        ("13:30", "16:00", "Avrupa Futbolu & Dergiler", "Premier Lig, Serie A, La Liga ve Şampiyonlar Ligi özel."),
        ("16:00", "18:30", "Süper Lig Kulüpler Özel", "Antrenmanlardan canlı bağlantılar ve basın toplantıları."),
        ("18:30", "20:00", "Maç Önü / Skor Saati", "Muhtemel 11'ler, son dakika sakatlıkları ve hakem kararları."),
        ("20:00", "22:30", "Canlı Yayın / Maç Heyecanı", "Haftanın kritik karşılaşması ve canlı anlatım."),
        ("22:30", "01:00", "Stüdyoda Maç Sonu Yorumları", "Goller, tartışmalı pozisyonlar ve usta yorumcular."),
        ("01:00", "03:30", "Derbi Nostalji & Klasikler", "Unutulmaz tarihi maçlar ve efsane gollü finaller."),
        ("03:30", "06:00", "Spor Dünyası Özetleri", "Motorsporları, tenis, basketbol ve voleybol maratonu.")
    ],
    "Belgesel & Kültür": [
        ("06:00", "08:00", "Doğanın Uyanışı", "Vahşi doğada gün doğumu ve ekosistem mucizeleri."),
        ("08:00", "10:30", "Anadolu'nun Saklı Cennetleri", "Tarihi köyler, el sanatları ve eşsiz coğrafyalar."),
        ("10:30", "13:00", "Büyük Medeniyetler ve Tarih", "Antik çağlardan bugüne imparatorlukların yükselişi ve çöküşü."),
        ("13:00", "15:30", "Vahşi Yaşamın Kralları", "Büyük kediler, kutup avcıları ve okyanus devleri."),
        ("15:30", "18:00", "İnsan ve İnanç Dünyası", "Dünya kültürleri, kadim ritüeller ve insan hikayeleri."),
        ("18:00", "20:00", "Bilim, Teknoloji ve Gelecek", "Uzay keşifleri, yeni teknolojiler ve evrenin gizemleri."),
        ("20:00", "22:30", "Mega Yapılar & Mühendislik", "Dünyanın en zorlu köprü, gökdelen ve tünel projeleri."),
        ("22:30", "01:00", "Yeraltı Dünyası ve Keşif", "Mağaralar, volkanlar ve gizemli derin sular."),
        ("01:00", "06:00", "Derin Doğa Meditasyonu", "4K kalitesinde ses ve görüntülerle huzur verici doğa.")
    ],
    "Çocuk": [
        ("06:00", "08:00", "Neşeli Sabah Maskotları", "Okul öncesi çocuklar için eğlenceli şarkılar ve danslar."),
        ("08:00", "10:00", "Akıllı Kahramanlar Ekibi", "Macera ve problem çözme odaklı eğitici çizgi diziler."),
        ("10:00", "12:00", "Renkli Masallar Dünyası", "Sevimli dostların doğa ve yardımlaşma serüvenleri."),
        ("12:00", "14:00", "Öğle Çizgi Kuşağı", "Popüler çizgi filmlerin en yeni heyecan dolu bölümleri."),
        ("14:00", "16:00", "Bilim Çocuk & Mucitler", "Evde yapılabilecek güvenli deneyler ve icatlar."),
        ("16:00", "18:30", "Büyük Macera Maratonu", "Süper kahramanlar, uzay yolcuları ve fantastik dünyalar."),
        ("18:30", "20:00", "Rafadan Tayfa / Akşam Neşesi", "Mahallenin sevilen ekibinden kahkaha dolu serüven."),
        ("20:00", "21:30", "Ailece Çizgi Sinema", "Tüm ailenin birlikte keyifle izleyeceği animasyon film."),
        ("21:30", "23:00", "İyi Geceler Masalı", "Uyku öncesi tatlı rüyalar için huzurlu ve eğitici masallar."),
        ("23:00", "06:00", "Dinlendirici Ninni Kuşağı", "Gece boyunca sakin animasyonlar ve çocuk ninnileri.")
    ],
    "Müzik": [
        ("06:00", "09:00", "Sabah Enerjisi & Hits", "Güne yüksek motivasyonla başlamak için güncel hit şarkılar."),
        ("09:00", "12:00", "Top 20 Countdown", "Haftanın en çok dinlenen ve paylaşılan liste başı şarkıları."),
        ("12:00", "15:00", "Akustik & Canlı Performanslar", "En sevilen sanatçıların stüdyo akustik yorumları."),
        ("15:00", "18:00", "Pop & R&B Rüzgarı", "Milyonlarca izlenen yeni video klipler ve trendler."),
        ("18:00", "20:30", "90'lar & 2000'ler Nostalji", "Müzik tarihinde iz bırakmış unutulmaz efsane parçalar."),
        ("20:30", "23:00", "Prime Time Party & Club", "DJ miksleri, dans listeleri ve hareketli parti ritimleri."),
        ("23:00", "02:00", "Gece Akustik & Slow", "Gecenin sessizliğine eşlik eden duygu dolu şarkılar."),
        ("02:00", "06:00", "Kesintisiz Müzik Maratonu", "Reklamsız, aralıksız gece video klip akışı.")
    ],
    "Radyo": [
        ("06:00", "09:00", "Sabah Neşesi & Drive-Time", "Güne yüksek enerjiyle başlangıç, trafik durumu ve neşeli şarkılar."),
        ("09:00", "12:00", "Hit Müzik Kuşağı & İstek Saati", "En çok dinlenen liste başı şarkılar ve dinleyici istekleri."),
        ("12:00", "14:00", "Öğle Molası & Akustik Melodiler", "Günün ortasında dinlendirici ve sevilen şarkılar."),
        ("14:00", "17:00", "Stüdyo Konuğu & Radyo Sohbeti", "Sanatçılarla özel röportajlar, güncel olaylar ve yeni albümler."),
        ("17:00", "20:00", "Eve Dönüş Şovu & Canlı DJ", "İş çıkışı trafiğine eşlik eden dinamik ve eğlenceli radyo yayını."),
        ("20:00", "23:00", "Unutulmayan Şarkılar & Nostalji", "Dünden bugüne en güzel hatıralar ve klasikleşmiş hitler."),
        ("23:00", "02:00", "Gece Yolculuğu & Slow Klasikler", "Gecenin sessizliğinde en duygusal şarkılar ve dinleyici mesajları."),
        ("02:00", "06:00", "Kesintisiz Gece Kuşağı", "7/24 aralıksız, reklamsız kesintisiz radyo müzik akışı.")
    ],
    "Yerel & Diğer": [
        ("06:00", "09:00", "Bölgemizden Haberler", "Yerel gündem, ilçe haberleri ve hava durumu."),
        ("09:00", "12:00", "Yöresel Tatlar ve Yaşam", "Anadolu mutfağı, köy yaşantısı ve üretici sohbetleri."),
        ("12:00", "14:00", "Günün Ortasında Şehir", "Belediye çalışmaları, esnafın sesi ve halk röportajları."),
        ("14:00", "17:00", "Kültür, Türkü ve Ezgiler", "Yöresel sanatçılar, ozanlar ve canlı bağlama dinletisi."),
        ("17:00", "19:00", "Bölgesel Ana Haber", "Şehrin en önemli gelişmeleri ve can alıcı konuları."),
        ("19:00", "22:00", "Şehir Meclisi & Canlı Tartışma", "Yerel yöneticiler ve bölge halkının buluştuğu canlı masa."),
        ("22:00", "01:00", "Gecenin Hüznü & Şiir", "Şiirler, nostaljik şarkılar ve gece dinletisi."),
        ("01:00", "06:00", "Gece Yayın Akışı & Doğa", "Bölgenin tarihi mekanları ve drone çekimleri.")
    ]
}

CHANNEL_FLAGSHIPS = {
    "TRT 1": "Teşkilat",
    "ATV": "Kuruluş Osman",
    "Kanal D": "İnci Taneleri",
    "Star TV": "Yalı Çapkını",
    "NOW": "Kızıl Goncalar",
    "SHOW TV": "Kızılcık Şerbeti",
    "TV8": "MasterChef Türkiye",
    "Beyaz TV": "Beyaz Futbol",
    "Kanal 7": "Emanet",
    "360": "Ben Bilirim",
    "A2TV": "Avrupa Yakası",
    "CNBC-e": "The Tonight Show Starring Jimmy Fallon",
    "A Haber": "Canan Barlas ile Gündem",
    "CNN Türk": "Tarafsız Bölge",
    "Habertürk TV": "Açık ve Net",
    "Haberturk TV": "Açık ve Net",
    "NTV": "Günün Raporu",
    "Sözcü TV": "Türkiye'nin Sözü",
    "Halk TV": "Sözüm Var",
    "Tele 1": "18 Dakika",
    "TGRT Haber": "Medya Kritik",
    "TRT Haber": "Birinci Boyut",
    "TRT Spor": "Spor Stüdyosu",
    "TRT Spor Yıldız": "Olimpiyat Arenası",
    "A Spor": "Son Sayfa (Canlı)",
    "FB TV": "Günün Ardından",
    "BJK TV": "Gündem Özel",
    "GS TV": "Ana Haber Bülteni & Gün Sonu",
    "TRT 4K Ultra HD": "Dünya Mirasları & Doğa Belgeseli 4K",
    "NASA TV UHD": "ISS Canlı Dünya Yayını 4K",
    "Earth 4K": "Gezegenimizden Büyüleyici Manzaralar 4K",
    "Red Bull TV 4K": "Extreme Sports & Macera Kuşağı"
}

def generate_epg_for_channel(channel_name, category):

    template = CATEGORY_TEMPLATES.get(category, CATEGORY_TEMPLATES["Ulusal"])
    now = datetime.now()
    current_minutes = now.hour * 60 + now.minute

    custom_title_prefix = ""
    if "TRT 1" in channel_name:
        custom_title_prefix = "TRT 1: "
    elif "ATV" in channel_name:
        custom_title_prefix = "ATV: "
    elif "Kanal D" in channel_name:
        custom_title_prefix = "Kanal D: "
    elif "NOW" in channel_name:
        custom_title_prefix = "NOW: "
    elif "Show" in channel_name:
        custom_title_prefix = "Show: "
    elif "TV8" in channel_name:
        custom_title_prefix = "TV8: "

    programs = []
    for item in template:
        start_str, end_str, title, desc = item
        sh, sm = map(int, start_str.split(":"))
        eh, em = map(int, end_str.split(":"))

        s_min = sh * 60 + sm
        e_min = eh * 60 + em
        if e_min <= s_min:
            e_min += 24 * 60

        adjusted_now_min = current_minutes
        if current_minutes < s_min and e_min > 24 * 60:
            adjusted_now_min += 24 * 60

        is_current = (s_min <= adjusted_now_min < e_min)
        progress = 0
        if is_current:
            duration = e_min - s_min
            elapsed = adjusted_now_min - s_min
            progress = min(100, max(0, int((elapsed / duration) * 100)))

        start_dt = now.replace(hour=sh, minute=sm, second=0, microsecond=0)
        end_dt = now.replace(hour=eh % 24, minute=em, second=0, microsecond=0)
        if eh >= 24 or (eh < sh):
            end_dt += timedelta(days=1)

        prog_title = title
        if "Ana Haber" in title:
            prog_title = f"{channel_name} Ana Haber Bülteni"
        elif "Prime Time" in title:
            prog_title = CHANNEL_FLAGSHIPS.get(channel_name, f"{channel_name} Prime Time Kuşağı")

        programs.append({
            "start": start_str,
            "end": end_str,
            "title": prog_title,
            "desc": desc,
            "is_current": is_current,
            "progress": progress,
            "timestamp_start": int(start_dt.timestamp()),
            "timestamp_end": int(end_dt.timestamp())
        })

    return programs

CHANNEL_MAPPING = {

    "TRT 1": ["TRT.1.HD.tr", "TRT.1.tr", "TRT1.HD.tr"],
    "ATV": ["ATV.HD.tr", "ATV.tr"],
    "Kanal D": ["KANAL.D.HD.tr", "KANAL.D.tr"],
    "Star TV": ["STAR.TV.HD.tr", "STAR.TV.tr"],
    "NOW": ["FOX.HD.tr", "NOW.tr", "FOX.tr"],
    "SHOW TV": ["SHOW.TV.HD.tr", "SHOW.TV.tr"],
    "TV8": ["TV8.HD.tr", "TV8.tr"],
    "TV8.5": ["TV8,5.HD.tr", "TV8.5.HD.tr", "TV8.HD.tr"],
    "Beyaz TV": ["BEYAZ.TV.HD.tr", "BEYAZ.TV.tr"],
    "Teve2": ["TEVE2.HD.tr", "TEVE2.tr"],
    "TEVE 2": ["TEVE2.HD.tr", "TEVE2.tr"],
    "Kanal 7": ["KANAL.7.HD.tr", "KANAL.7.tr"],
    "Kanal 7 Avrupa": ["KANAL.7.HD.tr", "KANAL.7.tr"],
    "360": ["360.HD.tr", "360.tr"],
    "24 TV": ["24.TV.tr", "24.HD.tr", "24.TV.HD.tr"],
    "A2TV": ["A2.HD.tr", "A2.tr"],
    "Flash Haber TV": ["FLASH.HABER.tr", "FLASH.TV.tr"],
    "Ülke TV": ["ÜLKE.TV.HD.tr", "ÜLKE.TV.tr"],
    "TV100": ["TV100.tr", "TV.100.tr"],
    "CNBC-e": ["CNBC-E.tr", "CNBC-e.tr"],
    "Kanal D Drama": ["KANAL.D.HD.tr", "KANAL.D.tr"],
    "TV 4": ["TV.4.tr", "TV4.tr"],

    "TRT Haber": ["TRT.HABER.HD.tr", "TRT.HABER.tr"],
    "NTV": ["NTV.HD.tr", "NTV.tr"],
    "Habertürk TV": ["HABERTÜRK.tr", "HABERTÜRK.HD.tr"],
    "CNN Türk": ["CNN.TÜRK.HD.tr", "CNN.TÜRK.tr"],
    "Sözcü TV": ["SÖZCÜ.TV.tr", "SOZCU.TV.tr"],
    "Halk TV HD": ["HALK.TV.tr"],
    "Halk TV": ["HALK.TV.tr"],
    "A Haber": ["A.HABER.HD.tr", "A.HABER.tr"],
    "TGRT Haber HD": ["TGRT.HABER.tr"],
    "Haber Global": ["HABER.GLOBAL.HD.tr", "HABER.GLOBAL.tr"],
    "BENGÜTÜRK TV": ["BENGÜ.TÜRK.tr"],
    "KRT TV": ["KRT.TV.tr"],
    "Ekotürk": ["EKOTÜRK.tr"],
    "Bloomberg HT": ["BLOOMBERG.HT.HD.tr", "BLOOMBERG.HT.tr"],
    "Tele 1": ["TELE1.tr", "TELE.1.tr"],
    "Kanal B": ["KANAL.B.tr"],
    "A Para": ["A.PARA.tr"],
    "TVNET": ["TVNET.HD.tr", "TVNET.tr"],
    "Akit TV": ["AKİT.TV.HD.tr", "AKİT.TV.tr"],
    "TRT Türk": ["TRT.TÜRK.tr"],
    "TRT Avaz": ["TRT.AVAZ.HD.tr", "TRT.AVAZ.tr"],
    "TRT World": ["TRT.WORLD.HD.tr"],
    "A News": ["A.NEWS.HD.tr"],
    "TRT Arabi": ["TRT.ARABI.tr"],
    "TRT Kurdî": ["TRT.KURDİ.tr"],

    "TRT Spor HD": ["TRT.SPOR.HD.tr", "TRT.SPOR.tr", "TRT.3.-..SPOR.tr"],
    "TRT Spor Yıldız": ["TRT.SPOR.HD.tr", "TRT.SPOR.tr"],
    "A Spor HD": ["A.SPOR.HD.tr", "A.SPOR.tr"],
    "FB TV": ["FENERBAHÇE.TV.tr"],
    "HTSpor TV": ["HT.SPOR.HD.tr", "HT.SPOR.tr", "HT.Spor.tr"],
    "TJK TV": ["TJK.TV.tr"],
    "TJK TV 2": ["TJK.TV.tr"],
    "TJK TV YURT DISI": ["TJK.TV.tr"],
    "Eurosport 1": ["EUROSPORT.1.HD.tr"],
    "Eurosport 2": ["EUROSPORT.2.TR.HD.tr"],
    "beIN Sports Haber": ["beIN.SPORTS.HABER.HD.tr", "Bein.Sports.Haber.tr"],
    "S Sport": ["SSport.tr"],
    "S Sport 2": ["SSport.2.tr"],

    "TRT Belgesel": ["TRT.BELGESEL.HD.tr", "TRT.BELGESEL.tr"],
    "TRT 2": ["TRT.2.HD.tr", "TRT.2.tr"],
    "National Geographic": ["NATIONAL.GEOGRAPHIC.HD.tr", "NATIONAL.GEOGRAPHIC.tr"],
    "National Geographic Wild": ["NATIONAL.GEOGRAPHIC.WILD.tr"],
    "DMAX": ["DMAX.HD.tr", "DMAX.tr"],
    "TLC": ["TLC.HD.tr", "TLC.tr"],
    "Diyanet TV": ["DİYANET.TV.tr"],
    "Vav TV": ["VAV.TV.tr"],
    "Çiftçi TV": ["ÇİFTÇİ.TV.tr"],
    "Dost TV": ["DOST.TV.tr"],
    "Lalegul TV": ["LALEGÜL.tr"],
    "Semerkand TV": ["SEMERKAND.HD.tr", "SEMERKAND.TV.tr"],

    "TRT Çocuk": ["TRT.ÇOCUK.tr", "TRT.ÇOCUK.HD.tr"],
    "Minika Çocuk": ["MİNİKA.ÇOCUK.tr"],
    "Minika GO": ["MİNİKA.GO.tr"],
    "Minika Go": ["MİNİKA.GO.tr"],
    "TRT Diyanet Çocuk": ["TRT.DIYANET.COCUK.tr", "TRT.DİYANET.ÇOCUK.tr"],
    "BabyTV Türkiye": ["BABY.TV.tr", "BABYTV.tr"],
    "Spacetoon Turkey": ["SPACETOON.tr"],
    "TRT EBA Ilkokul": ["TRT.EBA.tr"],
    "TRT EBA Ortaokul": ["TRT.EBA.tr"],
    "TRT EBA Lise": ["TRT.EBA.tr"],

    "TRT Müzik": ["TRT.MÜZİK.tr"],
    "Power TV": ["POWER.TV.HD.tr"],
    "PowerTürk TV": ["POWER.TURK.HD.tr", "POWER.TÜRK.tr"],
    "Power Türk Akustik": ["AKUSTİK.tr", "POWER.TURK.HD.tr"],
    "Power Türk Slow": ["POWER.TURK.HD.tr", "POWER.TÜRK.tr"],
    "Power Türk Taptaze": ["POWER.TURK.HD.tr"],
    "PowerTürk FM": ["POWER.TURK.HD.tr"],
    "Number 1 TV": ["NUMBER1.TV.HD.tr"],
    "Dream Türk": ["DREAM.TV.tr"],

    "Kanal 26": ["KANAL.26.tr"],
    "Kanal 23": ["KANAL.23.tr"],
    "Kanal V": ["KANAL.V.tr"],
    "Konya Olay TV": ["OLAY.TV.tr"],
    "Meltem TV": ["MELTEM.TV.tr"],
    "Tivi 6": ["TİVİ.6.tr", "TİVİ6.tr"],
    "TRT 3": ["TRT.3.tr"],
    "TRT Genc": ["TRT.GENÇ.tr"]
}

def parse_xmltv_dt(s):

    try:
        s = s.strip()
        if " " in s:
            dt = datetime.strptime(s, "%Y%m%d%H%M%S %z")
        else:
            dt = datetime.strptime(s, "%Y%m%d%H%M%S").replace(tzinfo=TR_TZ)
        return dt.astimezone(TR_TZ)
    except Exception:
        return None

def load_epg_cache_from_disk():

    global LIVE_EPG_CACHE
    if os.path.exists(EPG_CACHE_FILE):
        try:
            with open(EPG_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("channel_epg"):
                    LIVE_EPG_CACHE = data
                    print(f" EPG önbelleği diskten yüklendi ({data.get('date')}, {len(data['channel_epg'])} kanal)")
                    return True
        except Exception as e:
            print(f"[WARN] Failed to load EPG cache: {e}")
    return False

def save_epg_cache_to_disk():

    try:
        with open(EPG_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(LIVE_EPG_CACHE, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[WARN] Failed to save EPG cache: {e}")

def update_channels_json_with_epg():

    if not os.path.exists(CHANNELS_FILE):
        return
    try:
        with open(CHANNELS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        now_tr = datetime.now(TR_TZ)
        now_ts = now_tr.timestamp()
        channel_epg_map = LIVE_EPG_CACHE.get("channel_epg", {})

        for ch in data.get("channels", []):
            cname = ch.get("name", "")
            if cname in channel_epg_map:
                progs = channel_epg_map[cname]
                for p in progs:
                    p["is_current"] = (p["timestamp_start"] <= now_ts < p["timestamp_end"])
                    if p["is_current"] and p["timestamp_end"] > p["timestamp_start"]:
                        p["progress"] = min(100, max(0, int(((now_ts - p["timestamp_start"]) / (p["timestamp_end"] - p["timestamp_start"])) * 100)))
                    else:
                        p["progress"] = 0
                ch["epg"] = progs
                curr = next((p for p in progs if p["is_current"]), progs[0] if progs else None)
                if curr:
                    ch["current_program"] = curr["title"]
                    ch["current_desc"] = curr["desc"]
                    ch["current_progress"] = curr["progress"]
            else:
                ch["epg"] = generate_epg_for_channel(cname, ch.get("category", "Ulusal"))
                curr = next((p for p in ch["epg"] if p["is_current"]), ch["epg"][0] if ch["epg"] else None)
                if curr:
                    ch["current_program"] = curr["title"]
                    ch["current_desc"] = curr["desc"]
                    ch["current_progress"] = curr["progress"]

        data["last_epg_sync"] = now_tr.isoformat()
        with open(CHANNELS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[ERROR] channels.json update error: {e}")

def sync_daily_epg():

    global LIVE_EPG_CACHE
    t0 = time.time()
    now_tr = datetime.now(TR_TZ)
    today_str = now_tr.strftime("%Y-%m-%d")
    today_start = now_tr.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_end = today_start + timedelta(days=2)

    feeds = [
        ("TR3", "https://epgshare01.online/epgshare01/epg_ripper_TR3.xml.gz"),
        ("TR1", "https://epgshare01.online/epgshare01/epg_ripper_TR1.xml.gz")
    ]

    all_raw_programmes = []
    for fname, url in feeds:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=25) as r:
                gz_data = r.read()
            with gzip.GzipFile(fileobj=io.BytesIO(gz_data)) as f:
                xml = f.read().decode('utf-8', errors='ignore')
            pattern = re.compile(r'<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)">\s*<title[^>]*>([^<]+)</title>(?:\s*<desc[^>]*>([^<]*)</desc>)?')
            progs = pattern.findall(xml)
            all_raw_programmes.extend(progs)
            print(f"[INFO] EPG parsed {len(progs)} programs from {fname}")
        except Exception as e:
            print(f"[WARN] EPG feed download error ({fname}): {e}")

    if not all_raw_programmes:
        print("[WARN] No XMLTV programs retrieved, keeping existing cache")
        return False

    by_cid = {}
    for start_s, stop_s, cid, title, desc in all_raw_programmes:
        if cid not in by_cid:
            by_cid[cid] = []
        by_cid[cid].append((start_s, stop_s, title, desc))

    new_channel_epg = {}
    now_ts = now_tr.timestamp()

    for ch_name, xml_ids in CHANNEL_MAPPING.items():
        found = []
        for xid in xml_ids:
            if xid in by_cid:
                for start_s, stop_s, title, desc in by_cid[xid]:
                    dt_start = parse_xmltv_dt(start_s)
                    dt_stop = parse_xmltv_dt(stop_s)
                    if not dt_start or not dt_stop:
                        continue
                    if dt_stop >= today_start and dt_start <= tomorrow_end:
                        ts_start = int(dt_start.timestamp())
                        ts_stop = int(dt_stop.timestamp())
                        is_curr = (ts_start <= now_ts < ts_stop)
                        prog_pct = 0
                        if is_curr and ts_stop > ts_start:
                            prog_pct = min(100, max(0, int(((now_ts - ts_start) / (ts_stop - ts_start)) * 100)))

                        found.append({
                            "start": dt_start.strftime("%H:%M"),
                            "end": dt_stop.strftime("%H:%M"),
                            "title": html.unescape(title.strip()),
                            "desc": html.unescape(desc.strip()) if desc else "",
                            "is_current": is_curr,
                            "progress": prog_pct,
                            "timestamp_start": ts_start,
                            "timestamp_end": ts_stop
                        })
                if found:
                    break

        if found:
            found.sort(key=lambda x: x["timestamp_start"])
            deduped = []
            for p in found:
                if not deduped or deduped[-1]["timestamp_start"] != p["timestamp_start"]:
                    deduped.append(p)
            new_channel_epg[ch_name] = deduped

    elapsed = time.time() - t0
    LIVE_EPG_CACHE = {
        "date": today_str,
        "last_sync": now_tr.isoformat(),
        "channel_epg": new_channel_epg
    }
    save_epg_cache_to_disk()

    update_channels_json_with_epg()

    print(f"[EPG SYNC] ✅ Günlük EPG senkronizasyonu tamamlandı: {len(new_channel_epg)} kanal ({elapsed:.2f} sn)")
    return True

def daily_epg_worker():

    time.sleep(2)
    today_str = datetime.now(TR_TZ).strftime("%Y-%m-%d")
    if LIVE_EPG_CACHE.get("date") != today_str or not LIVE_EPG_CACHE.get("channel_epg"):
        print(f"\n[INFO] Starting EPG sync for {today_str}...")
        sync_daily_epg()

    while True:
        try:
            time.sleep(1800)
            now_tr = datetime.now(TR_TZ)
            today_str = now_tr.strftime("%Y-%m-%d")
            if LIVE_EPG_CACHE.get("date") != today_str:
                print(f"\n[INFO] New day EPG sync for {today_str}...")
                sync_daily_epg()
        except Exception as e:
            print(f"[ERROR] EPG scheduler error: {e}")

def start_daily_epg_scheduler():

    load_epg_cache_from_disk()
    t = threading.Thread(target=daily_epg_worker, daemon=True)
    t.start()

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': '*/*'
}

def test_single_stream(url, timeout=3.5):

    if not url:
        return False
    try:
        req = urllib.request.Request(url, headers=HEADERS, method='GET')
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status in (200, 206):

                chunk = response.read(256)
                if b'EXTM3U' in chunk or len(chunk) > 30:
                    return True
    except Exception:
        pass
    return False

def verify_and_build_channel(ch_def):

    url = ch_def.get("url", "")
    backup = ch_def.get("backup", "")

    ok1 = test_single_stream(url, timeout=3.0)
    final_url = url
    active = ok1

    if not ok1 and backup:

        ok2 = test_single_stream(backup, timeout=3.0)
        if ok2:
            final_url = backup
            backup = url
            active = True

    epg = generate_epg_for_channel(ch_def["name"], ch_def["category"])
    current_prog = next((p for p in epg if p["is_current"]), epg[0] if epg else None)

    return {
        "num": ch_def["num"],
        "name": ch_def["name"],
        "category": ch_def["category"],
        "group": ch_def.get("group", ch_def["category"]),
        "logo": ch_def.get("logo", ""),
        "url": final_url,
        "backup_url": backup if backup != final_url else "",
        "desc": ch_def.get("desc", ""),
        "active": active,
        "current_program": current_prog["title"] if current_prog else "Canlı Yayın",
        "current_desc": current_prog["desc"] if current_prog else "",
        "current_progress": current_prog["progress"] if current_prog else 50,
        "epg": epg
    }

def initialize_channels():

    defs = CHANNELS_DEFINITIONS
    if os.path.exists(CHANNELS_FILE):
        try:
            with open(CHANNELS_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                if saved.get("channels") and len(saved["channels"]) >= len(defs):
                    defs = saved["channels"]
        except Exception:
            pass

    print("=" * 65)
    print("[INFO] Starting channel stream verification...")
    print(f"[INFO] Testing {len(defs)} channels...")
    print("=" * 65)

    start_t = time.time()
    with ThreadPoolExecutor(max_workers=25) as executor:
        results = list(executor.map(verify_and_build_channel, defs))

    results.sort(key=lambda x: x["num"])
    active_count = sum(1 for c in results if c["active"])
    elapsed = time.time() - start_t

    print(f"✨ Test Tamamlandı! {len(results)} kanaldan {active_count} tanesi aktif ({elapsed:.2f} sn)")

    payload = {
        "last_updated": datetime.now().isoformat(),
        "total": len(results),
        "active_count": active_count,
        "channels": results
    }
    with open(CHANNELS_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"[INFO] Saved channels data to {CHANNELS_FILE}")
    return payload

def get_breaking_news():

    now = time.time()
    if NEWS_CACHE["items"] and (now - NEWS_CACHE["timestamp"] < 300):
        return NEWS_CACHE["items"]

    headlines = [
        "GÜNDEM: TBMM Genel Kurulu'nda bütçe ve yasa teklifleri görüşmeleri devam ediyor.",
        "SPOR: Süper Lig'de haftanın derbi heyecanı başladı; takımlarda son hazırlıklar tamamlandı.",
        "EKONOMİ: Borsa İstanbul BIST 100 endeksi günü değer kazanarak tamamladı; piyasalarda hareketlilik sürüyor.",
        "DÜNYA: Küresel ekonomi forumunda enerji piyasaları ve sürdürülebilirlik hedefleri ele alındı.",
        "KÜLTÜR: Türkiye'nin zengin tarihi mirası ve belgesel yapımları ekranlara geliyor.",
        "METEOROLOJİ: Yurt genelinde hafta sonu yağışlı hava dalgası etkili olacak.",
        "FİNANS: Merkez Bankası ve döviz piyasalarında günün öne çıkan verileri açıklandı."
    ]

    NEWS_CACHE["items"] = headlines
    NEWS_CACHE["timestamp"] = now
    return headlines

class TVPlatformHandler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    ALLOWED_CLIENT_IPS = {"127.0.0.1", "::1", "localhost", "192.168.1.5", "192.168.1.8", "192.168.1.14"}

    @staticmethod
    def is_allowed_ip(ip_str):

        if ip_str in {"127.0.0.1", "::1", "localhost", "192.168.1.5", "192.168.1.8", "192.168.1.14"}:
            return True

        try:
            ip = ipaddress.ip_address(ip_str)
            return ip.is_loopback or ip.is_private
        except ValueError:
            return False

    def check_access(self):
        client_ip = self.client_address[0]
        if not self.is_allowed_ip(client_ip):
            print(f"[SECURITY] Access denied for IP: {client_ip}")
            self.send_response(403)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(b"<h1>403 Forbidden</h1><p>Erisim Engellendi: Bu sunucu disariya kapali olup sadece yerel ag (Wi-Fi / LAN) cihazlarina aciktir.</p>")
            return False
        return True

    def end_headers(self):

        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        path = getattr(self, 'path', '').split('?')[0]
        if path.endswith(('.html', '.js', '.css', '.json')) or path == '/':
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        if not self.check_access():
            return
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if not self.check_access():
            return
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/client_error":
            query = urllib.parse.parse_qs(parsed.query)
            err = query.get('err', [''])[0]
            print(f">>> [BROWSER JS ERROR] {err}")
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b"ok")
            return

        if path == "/api/network_info":
            local_ip = "127.0.0.1"
            try:
                import socket
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(('8.8.8.8', 80))
                local_ip = s.getsockname()[0]
                s.close()
            except Exception:
                pass
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                "local_ip": local_ip,
                "port": PORT,
                "tv_url": f"http://{local_ip}:{PORT}/"
            }).encode('utf-8'))
            return

        if path == "/api/qrcode":
            query = urllib.parse.parse_qs(parsed.query)
            text_val = query.get('text', [f'http://127.0.0.1:{PORT}/'])[0]
            try:
                import qrcode
                import qrcode.image.svg
                factory = qrcode.image.svg.SvgPathImage
                img = qrcode.make(text_val, image_factory=factory, box_size=8)
                svg_data = img.to_string()
                self.send_response(200)
                self.send_header('Content-Type', 'image/svg+xml')
                self.send_header('Cache-Control', 'max-age=86400')
                self.end_headers()
                self.wfile.write(svg_data)
            except Exception as e:
                self.send_error(500, str(e))
            return

        if path in ("/api/epg/sync", "/api/epg/refresh"):
            success = sync_daily_epg()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            resp_data = {
                "status": "ok" if success else "error",
                "date": LIVE_EPG_CACHE.get("date"),
                "last_sync": LIVE_EPG_CACHE.get("last_sync"),
                "synced_channels": len(LIVE_EPG_CACHE.get("channel_epg", {})),
                "message": "Günlük yayın akışları başarıyla güncellendi."
            }
            self.wfile.write(json.dumps(resp_data, ensure_ascii=False).encode('utf-8'))
            return

        if path == "/api/channels":
            self.serve_channels_api()
            return

        if path == "/api/news":
            self.serve_news_api()
            return

        if path == "/api/refresh":
            data = initialize_channels()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "active": data["active_count"]}).encode('utf-8'))
            return

        if path == "/yt":
            query = urllib.parse.parse_qs(parsed.query)
            q = query.get('q', [''])[0]
            if not q:
                self.send_error(400, "Missing 'q' query parameter")
                return
            q = urllib.parse.unquote(q)
            resolved = resolve_youtube_hls(q)
            if resolved:
                proxied_url = f"/proxy?url={urllib.parse.quote(resolved, safe='')}"
                self.send_response(302)
                self.send_header('Location', proxied_url)
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.end_headers()
            else:
                self.send_error(502, f"Could not resolve live stream for: {q}")
            return

        if path == "/catchup":
            query = urllib.parse.parse_qs(parsed.query)
            channel = query.get('channel', [''])[0]
            title = query.get('title', [''])[0]
            if not channel:
                self.send_error(400, "Missing 'channel' parameter")
                return

            clean_q = f"{channel} {title}".strip()
            now = time.time()
            cached = CATCHUP_CACHE.get(clean_q)
            if cached and (cached['expires'] > now):
                resolved = cached['url']
            else:
                search_q = f"ytsearch1:{clean_q}"
                resolved = resolve_youtube_hls(search_q)
                if not resolved:
                    resolved = resolve_youtube_hls(f"ytsearch1:{channel} Canlı Yayın")
                if resolved:
                    CATCHUP_CACHE[clean_q] = {
                        'url': resolved,
                        'expires': now + 7200
                    }

            if resolved:
                proxied_url = f"/proxy?url={urllib.parse.quote(resolved, safe='')}"
                self.send_response(302)
                self.send_header('Location', proxied_url)
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.end_headers()
            else:
                self.send_error(502, f"Could not resolve catchup stream for: {clean_q}")
            return

        if path == "/proxy":
            self.handle_proxy(parsed)
            return

        super().do_GET()

    def serve_channels_api(self):

        if not os.path.exists(CHANNELS_FILE):
            data = initialize_channels()
        else:
            try:
                with open(CHANNELS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = initialize_channels()

        now_tr = datetime.now(TR_TZ)
        now_ts = now_tr.timestamp()
        channel_epg_map = LIVE_EPG_CACHE.get("channel_epg", {})

        for ch in data.get("channels", []):
            cname = ch.get("name", "")
            if cname in channel_epg_map:
                progs = channel_epg_map[cname]
                for p in progs:
                    p["is_current"] = (p["timestamp_start"] <= now_ts < p["timestamp_end"])
                    if p["is_current"] and p["timestamp_end"] > p["timestamp_start"]:
                        p["progress"] = min(100, max(0, int(((now_ts - p["timestamp_start"]) / (p["timestamp_end"] - p["timestamp_start"])) * 100)))
                    else:
                        p["progress"] = 0
                ch["epg"] = progs
                curr = next((p for p in progs if p["is_current"]), progs[0] if progs else None)
                if curr:
                    ch["current_program"] = curr["title"]
                    ch["current_desc"] = curr["desc"]
                    ch["current_progress"] = curr["progress"]
            else:
                ch["epg"] = generate_epg_for_channel(cname, ch.get("category", "Ulusal"))
                curr = next((p for p in ch["epg"] if p["is_current"]), ch["epg"][0] if ch["epg"] else None)
                if curr:
                    ch["current_program"] = curr["title"]
                    ch["current_desc"] = curr["desc"]
                    ch["current_progress"] = curr["progress"]

        content = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.end_headers()
        self.wfile.write(content)

    def serve_news_api(self):

        news = get_breaking_news()
        content = json.dumps({"news": news}, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def handle_proxy(self, parsed):

        query = urllib.parse.parse_qs(parsed.query)
        target_url = query.get('url', [''])[0]

        if not target_url:
            self.send_error(400, "Missing 'url' parameter")
            return

        target_url = urllib.parse.unquote(target_url)

        if target_url.startswith('yt:') or target_url.startswith('ytsearch1:') or ('youtube.com' in target_url and '.m3u8' not in target_url):
            clean_q = target_url.replace('yt:', '')
            resolved = resolve_youtube_hls(clean_q)
            if resolved:
                target_url = resolved

        req_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': '*/*'
        }

        client_range = self.headers.get('Range')
        if client_range:
            req_headers['Range'] = client_range

        if 'ciner' in target_url or 'showtv' in target_url or 'haberturk' in target_url:
            req_headers['Referer'] = 'https://www.showtv.com.tr/'
        elif 'startv' in target_url or 'dogus' in target_url:
            req_headers['Referer'] = 'https://www.startv.com.tr/'
        elif 'beyaz' in target_url:
            req_headers['Referer'] = 'https://www.beyaztv.com.tr/'
        elif 'nowtv' in target_url:
            req_headers['Referer'] = 'https://www.nowtv.com.tr/'
        elif 'atv' in target_url or 'a2tv' in target_url or 'turknet.ercdn.net' in target_url:
            req_headers['Referer'] = 'https://www.atv.com.tr/'
        elif 'powerapp.com.tr' in target_url:
            req_headers['Referer'] = 'https://www.powerapp.com.tr/'
        elif 'duhnet.tv' in target_url or 'cnnturk' in target_url:
            req_headers['Referer'] = 'https://www.cnnturk.com/'

        try:
            resp = PROXY_SESSION.get(target_url, headers=req_headers, stream=True, timeout=(4.0, 15.0), verify=False)
            resp_code = resp.status_code
            content_type = resp.headers.get('Content-Type', 'application/octet-stream')

            if ('.m3u8' in target_url.lower()) or ('mpegurl' in content_type.lower()):
                raw_text = resp.text
                new_lines = []
                for line in raw_text.splitlines():
                    stripped = line.strip()
                    if stripped and not stripped.startswith('\x23'):
                        resolved_url = urllib.parse.urljoin(target_url, stripped)
                        proxied_url = f"/proxy?url={urllib.parse.quote(resolved_url, safe='')}"
                        new_lines.append(proxied_url)
                    elif 'URI="' in line:
                        def _replace_uri(m):
                            sub_u = m.group(1)
                            full_sub = urllib.parse.urljoin(target_url, sub_u)
                            return f'URI="/proxy?url={urllib.parse.quote(full_sub, safe="")}"'
                        new_lines.append(re.sub(r'URI="([^"]+)"', _replace_uri, line))
                    else:
                        new_lines.append(line)
                processed_body = ("\n".join(new_lines) + "\n").encode('utf-8')

                self.send_response(resp_code)
                self.send_header('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
                self.send_header('Content-Length', str(len(processed_body)))
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.end_headers()
                try:
                    self.wfile.write(processed_body)
                except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                    pass
                return

            is_audio = ('audio' in content_type.lower()) or target_url.endswith('.mp3') or target_url.endswith('.aac') or target_url.endswith(';')

            self.send_response(resp_code)

            if is_audio:
                if 'aac' in content_type.lower():
                    self.send_header('Content-Type', 'audio/aac')
                elif 'mpeg' in content_type.lower() or 'mp3' in content_type.lower():
                    self.send_header('Content-Type', 'audio/mpeg')
                else:
                    self.send_header('Content-Type', content_type)
            else:
                self.send_header('Content-Type', content_type)

            if 'Content-Length' in resp.headers:
                self.send_header('Content-Length', resp.headers['Content-Length'])
            if 'Accept-Ranges' in resp.headers:
                self.send_header('Accept-Ranges', resp.headers['Accept-Ranges'])
            if 'Content-Range' in resp.headers:
                self.send_header('Content-Range', resp.headers['Content-Range'])

            if is_audio or ('Content-Length' not in resp.headers):
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            else:
                self.send_header('Cache-Control', 'public, max-age=3600')

            self.end_headers()

            chunk_size = (16 * 1024) if is_audio else (128 * 1024)
            try:
                for chunk in resp.iter_content(chunk_size=chunk_size):
                    if chunk:
                        self.wfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass
            finally:
                resp.close()

        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass
        except Exception as e:
            try:
                self.send_error(502, f"Proxy connection failed: {str(e)}")
            except Exception:
                pass

def run_server(port=PORT):
    if not os.path.exists(CHANNELS_FILE):
        initialize_channels()
    else:
        print(f"✅ Mevcut channels.json bulundu ({CHANNELS_FILE})")

    start_daily_epg_scheduler()

    server_address = ('', port)

    local_ip = "127.0.0.1"
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    httpd = ThreadingHTTPServer(server_address, TVPlatformHandler)
    print("\n" + "=" * 65)
    print("RainbowTV Server running")
    print(f"Local:   http://localhost:{port}")
    print(f"Network: http://{local_ip}:{port}")
    print(f"Proxy:   http://localhost:{port}/proxy?url=...")
    print("=" * 65 + "\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Server stopped.")
        httpd.server_close()

if __name__ == '__main__':
    port = PORT
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    run_server(port)
