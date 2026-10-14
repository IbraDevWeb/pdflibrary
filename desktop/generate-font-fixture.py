"""Génère un PDF de régression avec police TrueType embarquée (sans livre privé).
Les polices système libres ne sont pas copiées dans le dépôt ou l'installateur.
"""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parent.parent
OUTPUT=ROOT/"desktop-previews"/"embedded-serif-test.pdf"
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
FONTS=[
 Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"),
 Path("/usr/share/fonts/truetype/liberation2/LiberationSerif-Regular.ttf"),
 Path("C:/Windows/Fonts/georgia.ttf"),
]
font=next((p for p in FONTS if p.is_file()),None)
if not font:
 raise RuntimeError("Police TrueType système de test introuvable")
pdfmetrics.registerFont(TTFont("FolioEmbeddedSerif",str(font)))
paper_w,paper_h=430.866,649.134
c=canvas.Canvas(str(OUTPUT),pagesize=(paper_w,paper_h))
c.setTitle("Folio, rendu typographique de référence")
c.setFont("FolioEmbeddedSerif",10)
c.drawString(64,paper_h-37,"LE PRIX DES SERMENTS")
c.setLineWidth(.5);c.line(64,paper_h-50,paper_w-64,paper_h-50)
c.setFont("FolioEmbeddedSerif",15)
lines=[
 "La beauté d'un livre tient aussi à sa typographie.",
 "Les caractères à empattements doivent rester intacts.",
 "Les lettres ne doivent être ni étirées, ni remplacées.",
 "Même à grande échelle, leur dessin doit être fidèle.",
 "Un lecteur PDF conserve les fontes du document.",
 "Œuvres, épreuves, À l'aube : ligatures et accents.",
]
for i,line in enumerate(lines):
 c.drawString(68,paper_h-104-i*30,line)
c.setFont("FolioEmbeddedSerif",9);c.drawCentredString(paper_w/2,40,"72")
c.save()
print("Généré",OUTPUT,"avec",font)
