import json,re,sys
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
g=json.load(open(sys.argv[1]))
groups={}
for f in g['features']:
    c=str(f['properties']['code'])
    if not c.startswith('31'): continue
    n=f['properties']['name']
    m=re.match(r'(.+?시)(.+구)$',n)
    city=m.group(1) if m else n
    groups.setdefault(city,[]).append(shape(f['geometry']).buffer(0))
# project: simple equirectangular scaled by cos(lat)
import math
allg=unary_union([unary_union(v) for v in groups.values()])
minx,miny,maxx,maxy=allg.bounds
k=math.cos(math.radians((miny+maxy)/2))
W=800; s=W/((maxx-minx)*k); H=(maxy-miny)*s
def P(x,y): return ((x-minx)*k*s, (maxy-y)*s)
out=[]
for city,gs in sorted(groups.items()):
    u=unary_union(gs).simplify(0.002)
    polys=[u] if u.geom_type=='Polygon' else list(u.geoms)
    d=''
    for p in polys:
        if p.area<1e-5: continue
        for ring in [p.exterior]+list(p.interiors):
            pts=[P(x,y) for x,y in ring.coords]
            d+='M'+'L'.join(f'{a:.1f},{b:.1f}' for a,b in pts)+'Z'
    c=u.representative_point(); cx,cy=P(c.x,c.y)
    out.append({'name':city,'_wkt':u.wkt,'d':d,'cx':round(cx,1),'cy':round(cy,1)})
json.dump({"w":W,"h":round(H),"proj":{"minx":minx,"maxy":maxy,"k":k,"s":s},"regions":out},open(sys.argv[2],'w'),ensure_ascii=False)
print(len(out),round(H),sum(len(o['d']) for o in out))
