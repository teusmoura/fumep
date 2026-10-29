import sys
sys.path.insert(0,r'C:/dev/fumep/tmp/tutorial-deps')
import cv2
from PIL import Image,ImageDraw
p=r'C:/dev/fumep/tmp/pdfs/tutorial-avaliado/'
c=cv2.VideoCapture(r'C:/Users/me28332/Desktop/Gravando 2026-10-19 130503.mp4')
fps=c.get(cv2.CAP_PROP_FPS); n=c.get(cv2.CAP_PROP_FRAME_COUNT); duration=n/fps
print(f'duration={duration}, fps={fps}, frames={n}')
times=list(range(0,int(duration),10))
for k,t in enumerate(times):
 c.set(cv2.CAP_PROP_POS_MSEC,t*1000); ok,f=c.read()
 if ok: cv2.imwrite(p+f'frame_{t:04}.png',f)
for start in range(0,len(times),20):
 subset=times[start:start+20]; sheet=Image.new('RGB',(1600,250*((len(subset)+3)//4)),'white'); d=ImageDraw.Draw(sheet)
 for j,t in enumerate(subset):
  im=Image.open(p+f'frame_{t:04}.png'); im.thumbnail((400,220)); x=j%4*400;y=j//4*250;sheet.paste(im,(x,y));d.text((x+5,y+222),str(t)+'s',fill='black')
 sheet.save(p+f'contact_{start//20}.jpg')

