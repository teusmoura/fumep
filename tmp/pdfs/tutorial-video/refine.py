p=r'C:/dev/fumep/tmp/pdfs/tutorial-video/create_tutorial.py'
s=open(p,encoding='utf-8-sig').read()
insert='''# Refined crops and precise highlights after visual verification.
changes={
1:((100,270,1245,610),(186,532,415,571)),
2:((435,375,915,695),(452,414,899,670)),
4:((285,185,1315,490),(304,294,333,446)),
7:((125,260,1210,380),(137,325,1200,375)),
9:((125,110,1210,230),(137,176,1200,224)),
12:((125,348,1210,640),(595,585,730,624)),
13:((410,180,925,535),(439,327,896,410)),
14:((410,180,925,450),(800,375,879,416)),
}
for i,(crop,hi) in changes.items():
 a=list(steps[i]);a[3]=crop;a[4]=hi;steps[i]=tuple(a)
a=list(steps[4]);a[0]=27;steps[4]=tuple(a)
'''
s=s.replace("style=ParagraphStyle('body'",insert+"\nstyle=ParagraphStyle('body'")
open(p,'w',encoding='utf-8').write(s)
