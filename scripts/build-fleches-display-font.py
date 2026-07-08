from fontTools.ttLib import TTFont
from fontTools.pens.t2CharStringPen import T2CharStringPen

f = TTFont("DYLAN DOG.otf")
cmap = f.getBestCmap()
gs = f.getGlyphSet()
hmtx = f["hmtx"]
cff = f["CFF "].cff
top = cff[cff.fontNames[0]]
charStrings = top.CharStrings
private = top.Private

CAP = 713  # measured cap height

def base_name(ch):
    return cmap[ord(ch)]

# --- accent outlines, defined centred on x=0, sitting above cap height ---
YB = CAP + 34   # accent bottom
def acute():   return [[(-72,YB),(38,YB),(120,YB+168),(10,YB+168)]]
def grave():   return [[(72,YB),(-38,YB),(-120,YB+168),(-10,YB+168)]]
def circ():    return [[(-124,YB),(124,YB),(0,YB+176)]]           # solid chevron
def diaer():   return [[(-118,YB+30),(-24,YB+30),(-24,YB+150),(-118,YB+150)],
                       [(24,YB+30),(118,YB+30),(118,YB+150),(24,YB+150)]]
def ring():    return [[(-60,YB+10),(60,YB+10),(60,YB+150),(-60,YB+150)],
                       [(-30,YB+40),(30,YB+40),(30,YB+120),(-30,YB+120)]]  # ( å) crude
def cedilla(): return [[(-18,0),(42,0),(42,-64),(78,-64),(78,-150),(-30,-150),
                        (-30,-104),(30,-104),(30,-92),(-18,-92)]]

ACC = {"acute":acute,"grave":grave,"circ":circ,"diaer":diaer,"ring":ring,"ced":cedilla}

# char : (base letter, accent, below?)
COMBOS = {
 "à":("A","grave",0),"â":("A","circ",0),"ä":("A","diaer",0),"á":("A","acute",0),
 "é":("E","acute",0),"è":("E","grave",0),"ê":("E","circ",0),"ë":("E","diaer",0),
 "î":("I","circ",0),"ï":("I","diaer",0),"í":("I","acute",0),"ì":("I","grave",0),
 "ô":("O","circ",0),"ö":("O","diaer",0),"ó":("O","acute",0),"ò":("O","grave",0),
 "û":("U","circ",0),"ü":("U","diaer",0),"ù":("U","grave",0),"ú":("U","acute",0),
 "ÿ":("Y","diaer",0),
 "ç":("C","ced",1),
}

def add_glyph(name, base_gname, accent, below):
    w = hmtx[base_gname][0]
    pen = T2CharStringPen(w, gs)
    gs[base_gname].draw(pen)                       # replay base outline
    cx = w/2.0
    for contour in ACC[accent]():
        pts = [(x+cx, y) for (x,y) in contour]
        pen.moveTo(pts[0])
        for p in pts[1:]:
            pen.lineTo(p)
        pen.closePath()
    cs = pen.getCharString(private)
    csi = charStrings.charStringsIndex
    csi.append(cs)
    charStrings.charStrings[name] = len(csi) - 1
    top.charset.append(name)
    hmtx[name] = (w, 0)

order = f.getGlyphOrder()
added = []
for ch,(bl,acc,below) in COMBOS.items():
    gname = "acc_%04X" % ord(ch)
    add_glyph(gname, base_name(bl), acc, below)
    order.append(gname)
    # map BOTH upper and lower codepoints to this glyph (font is unicase)
    for cp in {ord(ch), ord(ch.upper())}:
        for st in f["cmap"].tables:
            if st.isUnicode(): st.cmap[cp] = gname
    added.append(ch)

# ligatures œ / æ : place second cap after first
def add_ligature(name, g1, g2, gap=-40):
    w1=hmtx[g1][0]; w2=hmtx[g2][0]
    total=w1+w2+gap
    pen=T2CharStringPen(total, gs)
    gs[g1].draw(pen)
    from fontTools.pens.transformPen import TransformPen
    tp=TransformPen(pen,(1,0,0,1,w1+gap,0))
    gs[g2].draw(tp)
    cs=pen.getCharString(private)
    csi=charStrings.charStringsIndex
    csi.append(cs)
    charStrings.charStrings[name]=len(csi)-1
    top.charset.append(name)
    hmtx[name]=(total,0)

for ch,(a,b) in {"œ":("O","E"),"æ":("A","E")}.items():
    gname="lig_%04X"%ord(ch)
    add_ligature(gname, base_name(a), base_name(b))
    order.append(gname)
    for cp in {ord(ch), ord(ch.upper())}:
        for st in f["cmap"].tables:
            if st.isUnicode(): st.cmap[cp]=gname
    added.append(ch)

f.setGlyphOrder(order)
f["maxp"].numGlyphs = len(order)
# rename family
for rec in f["name"].names:
    if rec.nameID in (1,4,6,16):
        val = "FlechesDisplay" if rec.nameID in (6,) else "Fleches Display"
        rec.string = val

f.flavor="woff2"
f.save("/tmp/dd/fleches-display.woff2")
print("added accents:", "".join(added))

# verify
g=TTFont("/tmp/dd/fleches-display.woff2")
c=set(g.getBestCmap().keys())
test="éèêëàâäçîïôöùûüœæÉÈÀÇ"
print("present:", [x for x in test if ord(x) in c])
print("missing:", [x for x in test if ord(x) not in c])
