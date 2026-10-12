import sys,base64,asyncio,os
from playwright.async_api import async_playwright
a,b=int(sys.argv[1]),int(sys.argv[2])
exe='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
async def main():
    async with async_playwright() as p:
        br=await p.chromium.launch(executable_path=exe,args=['--no-sandbox','--allow-file-access-from-files'])
        pg=await br.new_page(viewport={'width':1080,'height':1920})
        pg.on('pageerror',lambda e:print('ERR',e))
        await pg.goto('file://'+os.path.abspath('video.html'))
        await pg.evaluate('window.ready')
        for i in range(a,b):
            d=await pg.evaluate(f'(()=>{{render({i}/30);return document.getElementById("c").toDataURL("image/jpeg",.93)}})()')
            open(f'frames/f{i:05d}.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        await br.close()
asyncio.run(main())
