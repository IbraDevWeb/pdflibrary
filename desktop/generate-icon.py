"""Générer l'icône Windows de Folio sans dépendances graphiques externes.
Le graphisme suit la charte SVG : vert forêt, pages ivoire et monogramme or.
Exécuté par GitHub Actions Windows (Pillow uniquement).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

HERE = Path(__file__).resolve().parent
SIZE = 1024
S = 4
forest = (14, 48, 37)
gold = (220, 184, 120)
ivory = (251, 236, 205)
im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(im)
box = (38, 38, 986, 986)
draw.rounded_rectangle(box, radius=238, fill=forest, outline=(210, 175, 117), width=12)
draw.rounded_rectangle((65, 65, 960, 960), radius=224, outline=(72, 104, 79), width=5)
# Une double page ouverte ancre le F dans l'univers du livre.
draw.rounded_rectangle((280, 351, 514, 729), radius=20, fill=(224, 201, 162), outline=(246, 223, 186), width=5)
draw.polygon([(295, 373), (332, 358), (391, 359), (504, 393), (504, 704),
              (392, 675), (344, 677), (295, 692)], fill=(249, 235, 205))
draw.polygon([(520, 390), (590, 362), (673, 367), (745, 405),
              (745, 700), (641, 678), (583, 676), (520, 711)], fill=(205, 173, 125))
draw.polygon([(534, 406), (603, 379), (667, 385), (729, 415),
              (729, 681), (642, 665), (579, 660), (534, 684)], fill=(237, 214, 177))
draw.line([(513, 388), (513, 721)], fill=(54, 87, 64), width=9)
draw.line([(305, 716), (410, 702), (513, 728), (600, 701), (729, 715)], fill=ivory, width=14, joint="curve")
fonts = [
    Path("C:/Windows/Fonts/georgiab.ttf"),
    Path("C:/Windows/Fonts/georgia.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"),
]
font_path = next((p for p in fonts if p.exists()), None)
font = ImageFont.truetype(str(font_path), 538) if font_path else ImageFont.load_default()
draw.text((512, 482), "F", font=font, anchor="mm", fill=ivory,
          stroke_width=2, stroke_fill=gold)
HERE.mkdir(parents=True, exist_ok=True)
im.save(HERE / "icon.png")
im.save(HERE / "icon.ico", format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64),
               (128, 128), (256, 256)])
print("Icône Folio générée :", HERE / "icon.ico")
