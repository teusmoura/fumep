exec(open(r'C:/dev/fumep/tmp/pdfs/tutorial-avaliado/extract_video.py',encoding='utf-8-sig').read().split('times=list')[0])
for t in [5,9,12,15,18,23,26,33,44,54,57,75,83,86,94,104,114,124,134,144,148]:
 c.set(cv2.CAP_PROP_POS_MSEC,t*1000);ok,f=c.read()
 if ok: cv2.imwrite(p+f'frame_{t:04}.png',f)
