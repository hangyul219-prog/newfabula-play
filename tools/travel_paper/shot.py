# shot.py "<query>" out.png [wait_s] [js-after-ready] : headless Edge screenshot of test.html
import sys, time
from playwright.sync_api import sync_playwright
q, out = sys.argv[1], sys.argv[2]
wait = float(sys.argv[3]) if len(sys.argv) > 3 else 6
js = sys.argv[4] if len(sys.argv) > 4 else ''
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERR ' + str(e)))
    pg.goto('http://127.0.0.1:8832/test.html?' + q)
    try: pg.wait_for_function('window.__ready===true', timeout=90000)
    except Exception as e: logs.append('not ready ' + str(e)[:100])
    if js: pg.evaluate(js)
    time.sleep(wait)
    pg.screenshot(path=out)
    print('\n'.join(logs[:20]))
    b.close()
