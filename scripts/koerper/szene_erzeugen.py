#!/usr/bin/env python3
"""Erzeugt content/grundlagen/anatomie/ganzkoerper.szene.json aus BodyParts3D 4.0.

Aufruf:  python3 scripts/koerper/szene_erzeugen.py <Ordner>
<Ordner> enthält isa_inclusion_relation_list.txt und den entpackten Ordner mit den FJ*.obj-Dateien
(beides von https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html, isa_BP3D_4.0_obj_99.zip).

Namen: scripts/koerper/namen.txt (englisch|latein|deutsch) plus Regeln für Rippen, Wirbel, Finger, Zähne.
Was dort fehlt, bleibt englisch und wird in der App als „noch nicht übersetzt" markiert – nicht raten.
Danach:  node scripts/modell-koerper.mjs <Ordner mit OBJ>
"""
import json,collections,re,sys,os,glob
HIER=os.path.dirname(os.path.abspath(__file__)); DATEN=sys.argv[1]
def lies_kopf(f):
    name=fma=b=None; nv=0
    with open(f,errors='ignore') as fh:
        for l in fh:
            if l.startswith('# English name'): name=l.split(':',1)[1].strip()
            elif l.startswith('# Concept ID'): fma=l.split(':',1)[1].strip()
            elif l.startswith('# Bounds'): b=[float(x) for x in re.findall(r'-?\d+\.\d+',l)]
            elif l.startswith('v '): nv+=1
    return (os.path.basename(f),fma,name,b,nv)
rows=sorted({os.path.basename(f):lies_kopf(f) for f in glob.glob(DATEN+"/**/*.obj",recursive=True)}.values())

par=collections.defaultdict(set); name={}
for l in open(DATEN+'/isa_inclusion_relation_list.txt').read().splitlines()[1:]:
    p=l.split('\t')
    if len(p)>=4: par[p[2]].add(p[0]); name[p[0]]=p[1]; name[p[2]]=p[3]
def anc(c):
    seen=set(); st=[c]
    while st:
        x=st.pop()
        for q in par.get(x,()):
            if q not in seen: seen.add(q); st.append(q)
    return {name.get(a,'').lower() for a in seen}
def basis(n):
    s=re.sub(r'\b(right|left)\b','',n,flags=re.I); s=re.sub(r'\s+',' ',s).strip()
    return s[0].upper()+s[1:] if s else s
def seite(n):
    m=re.search(r'\b(right|left)\b',n,flags=re.I)
    return {'right':'rechts','left':'links'}[m.group(1).lower()] if m else ''
def art(r):
    A=anc(r[1]); n=r[2].lower()
    has=lambda k: any(k in a for a in A)
    if n=='skin': return 'haut'
    if has('tooth'): return 'zahn'
    if has('bone organ') or n in('body of sternum','xiphoid process','manubrium'): return 'knochen'
    if has('cartilage'): return 'knorpel'
    if has('muscle organ') or 'trapezius' in n or n.startswith('set of') and ('interossei' in n or 'lumbricals' in n or 'intertransversarii' in n or 'interspinales' in n or 'levatores' in n): return 'muskel'
    if has('artery') or 'aorta' in n or 'arter' in n or 'celiac trunk' in n or n=='pulmonary trunk' or 'arch' in n and 'palmar' in n and 'ven' not in n: return 'arterie'
    if has('vein') or re.search(r'\bvein|venous',n): return 'vene'
    if has('nerve') or 'nerve' in n or 'ganglion' in n: return 'nerv'
    if has('ligament') or 'ligament' in n or 'membrane' in n or 'retinaculum' in n or 'raphe' in n or n=='linea alba': return 'band'
    if has('tendon') or 'tract' in n and 'ilio' in n: return 'sehne'
    if re.search(r'gyrus|lobe of|lobule|cerebell|thalam|callosum|pons|medulla|midbrain|ventricle$|colliculus|nucleus|putamen|pallidus|hippocamp|amygdala|capsule|fornix|commissure|insula|white matter|spinal|stria|habenula|pineal|pituitary|mammillary|tuber cinereum|aqueduct|geniculate|peduncle|septum of telen|lamina terminalis|interventricular foramen|interpeduncular|choroid plexus|tentorium|occipital lobe',n) and 'liver' not in n and 'thymus' not in n: return 'zns'
    return 'organ'
ORD='first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth'.split()
ROM='I II III IV V VI VII VIII IX X XI XII'.split()
D={}
for f in (HIER+'/namen.txt',):
    for l in open(f,encoding='utf-8').read().splitlines():
        if not l.strip() or l.startswith('#'): continue
        e,lat,de=l.split('|')
        D[e.lower()]=(lat,de)
FINGER={'thumb':('pollicis','des Daumens'),'index finger':('digiti II manus','des Zeigefingers'),'middle finger':('digiti III manus','des Mittelfingers'),'ring finger':('digiti IV manus','des Ringfingers'),'little finger':('digiti V manus','des Kleinfingers'),
 'big toe':('hallucis','der Großzehe'),'second toe':('digiti II pedis','der 2. Zehe'),'third toe':('digiti III pedis','der 3. Zehe'),'fourth toe':('digiti IV pedis','der 4. Zehe'),'little toe':('digiti V pedis','der 5. Zehe')}
GLIED={'proximal':('proximalis','Grundglied'),'middle':('media','Mittelglied'),'distal':('distalis','Endglied')}
WIRBEL={'cervical':('cervicalis','Halswirbel','C'),'thoracic':('thoracica','Brustwirbel','Th'),'lumbar':('lumbalis','Lendenwirbel','L')}
ZAHN={'central incisor':('Dens incisivus medialis','mittlerer Schneidezahn'),'lateral incisor':('Dens incisivus lateralis','seitlicher Schneidezahn'),'canine':('Dens caninus','Eckzahn'),
 'first premolar':('Dens premolaris primus','erster Vormahlzahn'),'second premolar':('Dens premolaris secundus','zweiter Vormahlzahn'),'first molar':('Dens molaris primus','erster Mahlzahn'),'second molar':('Dens molaris secundus','zweiter Mahlzahn')}
def benenne(base, art):
    b=base.lower()
    if b in D:
        lat,de=D[b]
        if not lat: lat='Musculus '+b
        return lat,de
    m=re.fullmatch(r'(\w+) rib',b)
    if m: i=ORD.index(m[1]); return f'Costa {ROM[i]}',f'{i+1}. Rippe'
    m=re.fullmatch(r'(\w+) (cervical|thoracic|lumbar) vertebra',b)
    if m: i=ORD.index(m[1]); w=WIRBEL[m[2]]; return f'Vertebra {w[0]} {ROM[i]}',f'{i+1}. {w[1]} ({w[2]}{i+1})'
    m=re.fullmatch(r'(\w+) costal cartilage',b)
    if m: i=ORD.index(m[1]); return f'Cartilago costalis {ROM[i]}',f'{i+1}. Rippenknorpel'
    m=re.fullmatch(r'intervertebral disk of (\w+) (cervical|thoracic|lumbar) vertebra',b)
    if m: i=ORD.index(m[1]); w=WIRBEL[m[2]]; return f'Discus intervertebralis ({w[2]}{i+1})',f'Bandscheibe am {i+1}. {w[1]}'
    if b=='intervertebral disk of axis': return 'Discus intervertebralis (C2)','Bandscheibe am 2. Halswirbel'
    m=re.fullmatch(r'(proximal|middle|distal) phalanx of (.+)',b)
    if m and m[2] in FINGER: g=GLIED[m[1]]; f=FINGER[m[2]]; return f'Phalanx {g[0]} {f[0]}',f'{g[1]} {f[1]}'
    m=re.fullmatch(r'(\w+) (metacarpal|metatarsal) bone',b)
    if m: i=ORD.index(m[1]); return (f'Os metacarpi {ROM[i]}',f'{i+1}. Mittelhandknochen') if m[2]=='metacarpal' else (f'Os metatarsi {ROM[i]}',f'{i+1}. Mittelfußknochen')
    m=re.fullmatch(r'(upper|lower) (?:(.+?) )?secondary (.+?) tooth',b)
    if m:
        key=((m[2] or '')+' '+m[3]).strip()
        if key in ZAHN: z=ZAHN[key]; return f"{z[0]} {'superior' if m[1]=='upper' else 'inferior'}",f"{'Oberer' if m[1]=='upper' else 'Unterer'} {z[1]}"
    return None

SCHICHT={'haut':'haut','muskel':'muskeln','sehne':'muskeln','knochen':'knochen','knorpel':'knochen','zahn':'knochen','band':'knochen','arterie':'arterien','vene':'venen','nerv':'nerven','zns':'nerven','organ':'organe'}
def region(b):
    cx=(b[0]+b[3])/2; cz=(b[2]+b[5])/2
    if cz>1390: return 'kopf'
    if abs(cx)>165 and 620<cz<1400: return 'arm'
    if cz<870: return 'bein'
    return 'rumpf'
BEIN=os.path.join(HIER,'../../content/grundlagen/anatomie/untere-extremitaet/bein.szene.json')
bekannt={s['lat']:s for s in json.load(open(BEIN,encoding='utf-8'))['strukturen']}
aus=[]; stat=collections.Counter()
for datei,fma,en,b,nv in rows:
    a=art(( datei,fma,en)); n=benenne(basis(en),a)
    if re.search(r'hair|eyebrow',en.lower()): a='haut'
    s={'id':datei[:-4],'en':en,'lat':n[0] if n else '','de':n[1] if n else '','schicht':SCHICHT[a],'art':a,'region':'ganz' if en=='Skin' else region(b)}
    if seite(en): s['seite']=seite(en)
    if fma: s['fma']=fma
    alt=bekannt.get(s['lat'])
    if alt:
        if alt.get('einheit'): s['einheit']=alt['einheit']
        if alt.get('info') and not alt.get('schematisch'): s['info']=alt['info']
    stat[(s['schicht'],bool(n))]+=1
    aus.append(s)
haut=next(r for r in rows if r[2]=='Skin')[3]
um=lambda x,y,z:[round(x/1000,4),round((z+78)/1000,4),round(-(y+100)/1000,4)]
p,q=um(*haut[:3]),um(*haut[3:])
szene={"titel":"3D-Atlas: Ganzer Körper","reihenfolge":0,
 "beschreibung":"Der ganze Mensch in Schichten: Skelett, Muskeln, Arterien, Venen, Organe, Gehirn. Struktur antippen für Namen und Infos.",
 "quelle":{"name":"BodyParts3D, Version 4.0","urheber":"© The Database Center for Life Science (DBCLS)","lizenz":"CC BY 4.0","lizenzUrl":"https://creativecommons.org/licenses/by/4.0/deed.de","url":"https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html",
  "hinweis":"Lizenz laut Datenbankseite (Stand 27.02.2025) CC BY 4.0. Die Modelle wurden für MedAtlas vereinfacht, umbenannt und komprimiert. Im Datensatz fehlen: periphere Nerven (enthalten sind nur Gehirn und einige Hirnnerven der Augenhöhle), große Teile der Leber, Bauchwand- und Gesichtsmuskeln sowie Knochenhäute. Die Lunge ist nur in Form ihrer Segmente (englisch „bronchial tree“) enthalten. Lateinische und deutsche Namen stammen aus einer eigenen Tabelle; nicht übersetzte Strukturen tragen den englischen Namen des Datensatzes (FMA)."},
 "rahmen":[[min(p[i],q[i]) for i in range(3)],[max(p[i],q[i]) for i in range(3)]],
 "start":{"haut":"durch","knochen":"an"},
 "schichten":[{"id":"haut","titel":"Haut (Silhouette)","farbe":"#e2ad8c","datei":"models/koerper-haut.glb"},{"id":"muskeln","titel":"Muskeln","farbe":"#b8473f","datei":"models/koerper-muskeln.glb"},
  {"id":"arterien","titel":"Arterien","farbe":"#d42a2a","datei":"models/koerper-arterien.glb"},{"id":"venen","titel":"Venen","farbe":"#2f62d6","datei":"models/koerper-venen.glb"},
  {"id":"nerven","titel":"Gehirn und Nerven","farbe":"#f4c62c","datei":"models/koerper-nerven.glb"},{"id":"organe","titel":"Organe","farbe":"#c77d6a","datei":"models/koerper-organe.glb"},
  {"id":"knochen","titel":"Skelett","farbe":"#e9e0c9","datei":"models/koerper-knochen.glb"}],
 "strukturen":aus}
ziel=os.path.join(HIER,'../../content/grundlagen/anatomie/ganzkoerper.szene.json')
json.dump(szene,open(ziel,'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
for sch in [x['id'] for x in szene['schichten']]: print(f"{sch:9} benannt {stat[(sch,True)]:4}  englisch {stat[(sch,False)]:4}")
print(len(aus),'Strukturen →',os.path.normpath(ziel))
