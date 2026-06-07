"""
Downloads public-domain card images from Wikimedia Commons,
resizes to 800px wide, and saves as images/01.jpg … images/25.jpg
"""

import json, os, time, urllib.request, urllib.parse, io
from PIL import Image

IMAGES_DIR = os.path.join(os.path.dirname(__file__), "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# Verified Wikimedia Commons filenames
FILENAMES = {
    1:  "Jean_Auguste_Dominique_Ingres,_Apotheosis_of_Homer,_1827.jpg",
    2:  "Sir Lawrence Alma-Tadema, RA, OM - Sappho and Alcaeus - Walters 37159.jpg",
    3:  "William Blake - Book of Job, Plate 11, Job's Evil Dreams - B1978.43.1513 - Yale Center for British Art.jpg",
    4:  "Velázquez_-_Esopo_(Museo_del_Prado,_1639-41).jpg",
    5:  "John_Collier_-_Priestess_of_Delphi.jpg",
    6:  '"Ancient of days" - frontispiece of Europe a Prophecy - Metal relief etching 1794 LCCN2005689083.jpg',
    7:  "Cinderella-Rackham-008p.jpg",
    8:  "Eugène Delacroix - Hamlet and Horatio in the Graveyard - WGA6199.jpg",
    9:  "Emperor Huizong - Peach Blossom and Dove - Walters 351681.jpg",
    10: "Ma Yuan mountain path in spring.jpg",
    11: "Houghton Typ 805.94.8320 - Pride and Prejudice, 1894, Hugh Thomson - superior dancing.jpg",
    12: "Frontispiece_to_Frankenstein_1831.jpg",
    13: "Strand_paget.jpg",
    14: "Frederick_Douglass_portrait.jpg",
    15: "Jean-François_Millet_-_Gleaners_-_Google_Art_Project_2.jpg",
    16: "Ambrosius Holbein - The Island of Utopia - WGA11475.jpg",
    17: "Claude_Monet_-_Water_Lilies_-_1906,_Ryerson.jpg",
    18: "Alice_par_John_Tenniel_25.png",
    19: "Eugène Delacroix, Hamlet and Horatio before the Gravediggers (Act V, Scene I), 1843, NGA 58068.jpg",
    20: "Don_Quijote_and_Sancho_Panza.jpg",
    21: "Marc Aurèle, Ma 5101.jpg",   # Marcus Aurelius bust (Louvre) — placeholder for card 21
    22: "Marc Aurèle, Ma 5101.jpg",
    23: "Mosaic_depicting_theatrical_masks_of_Tragedy_and_Comedy_(Thermae_Decianae).jpg",
    24: "Gustave_Doré_-_Dante_Alighieri_-_Inferno_-_Plate_8_(Canto_III_-_Abandon_all_hope_ye_who_enter_here).jpg",
    25: "Monteverdi_Bernardo_Strozzi.jpg",
}

# Card 21 override: Gulliver-themed — use a different known file
FILENAMES[21] = "Gulliver-voyage-brobdingnag-grandville.jpg"   # try; fallback below
FALLBACKS = {
    21: "Jonathan Swift by Charles Jervas 1718.jpg",
}

HEADERS = {"User-Agent": "WonderworksDeck/1.0 (educational use)"}
TARGET_WIDTH = 800


def get_url(filename):
    encoded = urllib.parse.quote(filename.replace(" ", "_"))
    api = (
        "https://commons.wikimedia.org/w/api.php"
        f"?action=query&titles=File:{encoded}"
        "&prop=imageinfo&iiprop=url&format=json"
    )
    req = urllib.request.Request(api, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read())
    pages = data["query"]["pages"]
    page = next(iter(pages.values()))
    if "missing" in page:
        return None
    ii = page.get("imageinfo")
    return ii[0]["url"] if ii else None


def download_and_resize(url, dest):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    w, h = img.size
    if w > TARGET_WIDTH:
        img = img.resize((TARGET_WIDTH, int(h * TARGET_WIDTH / w)), Image.LANCZOS)
    img.save(dest, "JPEG", quality=88, optimize=True)
    return img.size, os.path.getsize(dest) // 1024


def fetch_with_retry(card_id, filename, dest, retries=3):
    for attempt in range(retries):
        try:
            url = get_url(filename)
            if url is None:
                return None, "missing"
            size, kb = download_and_resize(url, dest)
            return size, kb
        except Exception as e:
            msg = str(e)
            if "429" in msg and attempt < retries - 1:
                wait = 12 * (attempt + 1)
                print(f"         ⏳ rate-limited, waiting {wait}s…")
                time.sleep(wait)
            else:
                return None, str(e)
    return None, "max retries"


def main():
    ok, skipped, failed = [], [], []

    for card_id in range(1, 26):
        dest = os.path.join(IMAGES_DIR, f"{card_id:02d}.jpg")
        if os.path.exists(dest):
            print(f"  [{card_id:02d}] ✓ already exists")
            skipped.append(card_id)
            continue

        filename = FILENAMES[card_id]
        print(f"  [{card_id:02d}] {filename[:62]}…")

        size, result = fetch_with_retry(card_id, filename, dest)

        if size is None and card_id in FALLBACKS:
            fb = FALLBACKS[card_id]
            print(f"         ↩ trying fallback: {fb[:55]}")
            size, result = fetch_with_retry(card_id, fb, dest)

        if size:
            print(f"         ✓ {size[0]}×{size[1]}px  {result} KB")
            ok.append(card_id)
        else:
            print(f"         ✗ {result}")
            failed.append(card_id)

        time.sleep(1.5)

    print("\n─── Summary ─────────────────────────────────")
    print(f"  Downloaded : {len(ok)}  {ok}")
    print(f"  Skipped    : {len(skipped)}")
    print(f"  Failed     : {len(failed)}  {failed}")


if __name__ == "__main__":
    main()
