"""Pyodide Python 브라우저 계산. 한국은행 공식 유발계수 열 × 최종수요 증가액."""
import json

def calculate(payload_json):
    p=json.loads(payload_json)
    amount=float(p['amount'])
    if amount<=0: raise ValueError('증가액은 0보다 커야 합니다.')
    return json.dumps({'kind':'result','j':int(p['j']),'amount':amount,
        'totalProd':sum(float(v)*amount for v in p['prod']),
        'totalImp':sum(float(v)*amount for v in p['imp']),
        'totalVa':sum(float(v)*amount for v in p['va'])})
