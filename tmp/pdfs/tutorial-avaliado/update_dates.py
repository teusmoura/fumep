from pathlib import Path
p=Path(r'C:/dev/fumep/tmp/pdfs/tutorial-avaliado/create_tutorial.py')
s=p.read_text(encoding='utf-8')
s=s.replace("style=ParagraphStyle('body'",'''for i,note in {
3:'<b>Disponibilidade:</b> as avaliações ficam visíveis a partir da data de divulgação prevista no cronograma. ',
8:'<b>Prazo:</b> a abertura de recurso só ficará visível e disponível no período previsto para essa etapa. ',
15:'<b>Data da resposta:</b> a resposta da comissão ficará visível a partir da data prevista para sua divulgação. ',
}.items():
 a=list(steps[i]);a[2]=note+a[2];steps[i]=tuple(a)

style=ParagraphStyle('body' ''')
s=s.replace(" c.drawString(40,799,'Avaliação de servidores')"," c.drawString(40,799,'Avaliação de servidores')")
s=s.replace(' for pos in range(2):', ''' c.setFillColor(HexColor('#FFF2CE'));c.roundRect(35,731,525,36,5,fill=1,stroke=0)
 c.setFillColor(HexColor('#78500A'));c.setFont('ArialBold',9)
 c.drawString(46,753,'ATENÇÃO AO CRONOGRAMA')
 c.setFont('Arial',8)
 c.drawString(46,740,'Cada etapa só ficará visível e disponível na data prevista. Consulte os prazos oficiais.')
 for pos in range(2):''')
s=s.replace('top=756-pos*350;bottom=top-328','top=720-pos*329;bottom=top-312').replace('525,328,9','525,312,9').replace('maxh=328-65-h-24','maxh=312-65-h-24')
p.write_text(s,encoding='utf-8')
