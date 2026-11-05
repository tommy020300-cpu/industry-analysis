"""한국은행 2023 산업연관표 원본 xlsx를 브라우저용 JSON으로 추출.
외부 라이브러리 없이 Python 표준 라이브러리(zipfile, ElementTree)만 사용.
실행: python scripts/build_data.py
"""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import re, json, math

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'data' / 'source'
DEST = ROOT / 'data' / 'processed'
DEST.mkdir(exist_ok=True, parents=True)
N = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
FILES = {'large':'io-large.xlsx','medium':'io-medium.xlsx','small':'io-small.xlsx','basic':'io-basic.xlsx'}

def index(ref):
    p = re.match(r'[A-Z]+', ref).group()
    x = 0
    for ch in p: x = x * 26 + ord(ch) - 64
    return x-1

def rows_for(z, pathname, strings):
    with z.open(pathname) as f:
        for _, elem in ET.iterparse(f, events=('end',)):
            if elem.tag != N+'row': continue
            values = {}
            for c in elem.findall(N+'c'):
                v = c.find(N+'v'); t = c.get('t')
                if v is not None and v.text is not None:
                    val = v.text
                    if t == 's': val = strings[int(val)]
                    elif t not in ('str', 'e'):
                        try:
                            val = float(val)
                            if math.isfinite(val) and val.is_integer(): val = int(val)
                        except ValueError: pass
                elif (inline:=c.find(N+'is')) is not None:
                    val = ''.join((x.text or '') for x in inline.iter(N+'t'))
                else: continue
                values[index(c.get('r'))] = val
            if values: yield int(elem.get('r')),values
            elem.clear()

def names_and_paths(z):
    tree = ET.fromstring(z.read('xl/workbook.xml'))
    sh = tree.findall('.//'+N+'sheet')
    names=[x.get('name') for x in sh]
    return names, [f'xl/worksheets/sheet{i}.xml' for i in range(1,len(sh)+1)]

def strings_for(z):
    ss=[]
    if 'xl/sharedStrings.xml' not in z.namelist(): return ss
    with z.open('xl/sharedStrings.xml') as f:
        for _,el in ET.iterparse(f,events=('end',)):
            if el.tag == N+'si':
                ss.append(''.join(x.text or '' for x in el.iter(N+'t')))
                el.clear()
    return ss

def clean(v):
    if isinstance(v, float):
        return round(v, 10)
    return v

def extract(path, level):
    with ZipFile(path) as z:
        names, paths = names_and_paths(z)
        strings = strings_for(z)
        sheetobjs=[]
        for ordinal,(name,path) in enumerate(zip(names,paths)):
            rdict = dict(rows_for(z, path, strings))
            if not {5,6}.issubset(rdict):
                raise ValueError(f'Headers missing {level} {name}')
            headcode,headname = rdict[5],rdict[6]
            colids=sorted(x for x in headname if x>=2)
            cols=[{'code':str(headcode.get(c,'')), 'name':str(headname.get(c,''))} for c in colids]
            vals=[]; rowcodes=[]; rownames=[]
            for r in sorted(rdict):
                if r<7: continue
                line=rdict[r]
                if 0 not in line and 1 not in line: continue
                rowcodes.append(str(line.get(0,'')))
                rownames.append(str(line.get(1,'')))
                vals.append([clean(line.get(c,None)) for c in colids])
            sheetobjs.append({'name':name,'unit':'백만원' if ordinal in (0,1,2,9,10,11) else '계수',
                              'columns':cols,'rowCodes':rowcodes,'rowNames':rownames,'values':vals})
            print(f'{level}: {name}: {len(rowcodes)} × {len(cols)}')
        items=[]
        src=sheetobjs[6]
        for rc,rn in zip(src['rowCodes'],src['rowNames']):
            if rc in ('9819','9812','9811','9802','9801','9590','9090',''): continue
            items.append({'code':rc,'name':rn})
        # 모든 계수표의 산업 열 및 행이 동일한 차원인지 확인
        for si in (5,6,7,8):
            s=sheetobjs[si]
            got=[(x['code'],x['name']) for x in s['columns'][:len(items)]]
            expected=[(x['code'],x['name']) for x in items]
            assert got==expected, f'industry columns mismatch: {level}/{s["name"]}'
            assert list(zip(s['rowCodes'][:len(items)],s['rowNames'][:len(items)]))==expected, f'industry rows mismatch: {level}/{s["name"]}'
        obj={'year':2023,'priceBasis':'생산자가격','level':level,'sectors':items,'sheets':sheetobjs,
             'source':'한국은행 2023년 산업연관표(연장표) (2025년 9월 발표)'}
        out=DEST / f'{level}.json'
        out.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'),allow_nan=False),encoding='utf-8')
        print('WROTE',out, out.stat().st_size)
        return obj

def main():
    summary={}
    for level,fn in FILES.items():
        o=extract(SRC/fn, level)
        n=len(o['sectors'])
        large_ind=[]
        for j,it in enumerate(o['sectors']):
            prod=sum(float(o['sheets'][6]['values'][i][j] or 0) for i in range(n))
            imp=sum(float(o['sheets'][7]['values'][i][j] or 0) for i in range(n))
            va=sum(float(o['sheets'][8]['values'][i][j] or 0) for i in range(n))
            large_ind.append({'code':it['code'],'name':it['name'],'production':round(prod,6),'imports':round(imp,6),'valueAdded':round(va,6)})
        summary[level]={'count':n,'topProduction':sorted(large_ind,key=lambda x:x['production'],reverse=True)[:5], 'minProduction':min(x['production'] for x in large_ind)}
    (DEST/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    print('SUMMARY',json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__': main()
