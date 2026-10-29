from pathlib import Path
p=Path(r'C:/dev/fumep/tmp/pdfs/tutorial-avaliado/create_tutorial.py')
s=p.read_text(encoding='utf-8')
a=s.index('for i,note in {');b=s.index("style=ParagraphStyle",a)
s=s[:a]+'''updates={
8:('Quando houver divergência','Após consultar sua avaliação, caso identifique alguma divergência, você poderá apresentar um recurso durante o período previsto no cronograma. <b>Este procedimento se aplica apenas quando houver necessidade de revisão.</b> Nessa situação, acesse <b>Abrir Recurso</b> no menu lateral.'),
9:('Identifique a avaliação correspondente','Caso seja necessário apresentar um recurso, confira a competência e utilize o link <b>Abrir recurso</b> na linha da avaliação correspondente.'),
11:('Descreva o ponto a revisar','No campo de texto, descreva de forma <b>clara e objetiva</b> a divergência identificada e o ponto que solicita revisar. Confira as informações antes do envio.'),
12:('Inclua os documentos do pedido','Em <b>Escolher arquivos</b>, selecione os documentos que fundamentam o pedido. Formatos aceitos: <b>PDF, JPG, PNG, GIF e ZIP</b>, até <b>5 MB por arquivo</b>. Inclua todos os documentos necessários antes de concluir.'),
13:('Confira o pedido antes do envio','Revise o texto e os documentos que fundamentam o pedido. Para concluir, utilize <b>Enviar recurso</b>. <b>Após o envio, não será possível complementar o texto ou os anexos.</b>'),
18:('Consulte a decisão da comissão','Leia a decisão e a justificativa registradas pela comissão no histórico. O resultado dependerá da análise do pedido; consulte a resposta correspondente ao seu recurso.'),
}
for i,(title,body) in updates.items():
 a=list(steps[i]);a[1]=title;a[2]=body;steps[i]=tuple(a)
for i,note in {
3:'<b>Disponibilidade:</b> as avaliações ficam visíveis a partir da data de divulgação prevista no cronograma. ',
15:'<b>Data da resposta:</b> a resposta da comissão ficará visível a partir da data prevista para sua divulgação. ',
}.items():
 a=list(steps[i]);a[2]=note+a[2];steps[i]=tuple(a)

'''+s[b:]
s=s.replace("c.drawString(40,779,'Gratificação de desempenho | Guia do avaliado')","c.drawString(40,779,'Consulta de notas e ficha | Guia do avaliado' if page < 4 else 'Procedimento quando houver divergência | Guia do avaliado')")
s=s.replace("str(idx+1))","str(idx+1) if page < 4 else 'R'+str(idx-7))")
s=s.replace("'Guia do avaliado | Consulta de avaliações, abertura e acompanhamento de recursos'","'Guia do avaliado | Consulta de avaliações' if page < 4 else 'Guia do avaliado | Procedimento eventual quando houver divergência'")
p.write_text(s,encoding='utf-8')
