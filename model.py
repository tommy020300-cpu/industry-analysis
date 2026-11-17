"""한국은행 산업연관표 유발계수 열에 최종수요 증분을 곱하는 Python 검증 코드."""
import json


def calculate(payload_json):
    payload = json.loads(payload_json)
    jobs = payload.get('items', [])
    if not jobs:
        raise ValueError('시나리오가 비어 있습니다.')
    totals = {'totalProd': 0.0, 'totalImp': 0.0, 'totalVa': 0.0}
    for item in jobs:
        amount = float(item['amount'])
        if amount <= 0:
            raise ValueError('수요 증가액은 양수여야 합니다.')
        for output_key, source_key in [('totalProd', 'prod'), ('totalImp', 'imp'), ('totalVa', 'va')]:
            totals[output_key] += sum(float(v) * amount for v in item[source_key])
    return json.dumps({
        'kind': 'result',
        'requestId': payload['requestId'],
        **totals
    }, ensure_ascii=False)
