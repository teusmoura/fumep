exec(open(r'C:/dev/fumep/tmp/pdfs/tutorial-video/extract_video.py').read().split('times=list')[0])
for t in [3,5,7,12,14,16,18,23,25,27,83,85,94,97,103,105,115,117,133]:
 c.set(cv2.CAP_PROP_POS_MSEC,t*1000);ok,f=c.read()
 if ok: cv2.imwrite(p+f'frame_{t:04}.png',f)
for a,ts in enumerate([[0,3,5,7,12,14,16,18],[20,23,25,27,83,85,94,97],[100,103,105,110,115,117,130,133]]):
 sheet=Image.new('RGB',(1600,1000),'white');d=ImageDraw.Draw(sheet)
 for j,t in enumerate(ts):
  im=Image.open(p+f'frame_{t:04}.png');im.thumbnail((800,220));x=j%2*800;y=j//2*250;sheet.paste(im,(x,y));d.text((x,y+222),str(t),fill='black')
 sheet.save(p+f'detail{a}.jpg')
