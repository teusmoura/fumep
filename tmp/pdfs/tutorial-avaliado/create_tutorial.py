from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
import pypdfium2 as pdfium
base=Path(r'C:/dev/fumep/tmp/pdfs/tutorial-avaliado')
out=Path(r'C:/dev/fumep/output/pdf');out.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial',r'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBold',r'C:/Windows/Fonts/arialbd.ttf'))
# time, title, instructions, crop, highlight (original video coordinates)
steps=[
(0,'Acesse o Portal de Avaliações','No site <b>setelagoas.mg.gov.br</b>, localize “O que você procura” e clique em <b>Portal de Avaliações</b>.',(90,275,1260,660),(742,539,870,651)),
(9,'Escolha o acesso do avaliado','Na seção <b>Para Servidores Avaliados</b>, localize “Avaliação de Gratificações” e clique em <b>Acessar como Avaliado</b>.',(105,266,1245,612),(189,544,413,583)),
(15,'Faça login no sistema','Informe seu <b>CGM ou CPF, somente números</b>, e sua <b>senha</b>. Depois, clique em <b>Entrar</b>.',(440,348,910,648),(451,389,899,644)),
(20,'Localize a avaliação desejada','No menu <b>Avaliações</b>, consulte a lista de avaliações disponíveis. Confira a coluna <b>Competência</b> para escolher o período desejado.',(20,244,1330,602),(399,383,544,497)),
(20,'Abra os detalhes da avaliação','Na linha da competência desejada, clique no <b>ícone de olho</b>, na primeira coluna da tabela.',(285,299,1325,530),(302,430,335,460)),
(40,'Consulte suas notas','Leia as pontuações de <b>Assiduidade</b>, <b>Qualidade de atendimento ao cidadão</b>, <b>Pontualidade</b> e <b>Interesse e dedicação ao trabalho</b>. Role a janela para consultar todos os fatores.',(132,91,1223,698),None),
(26,'Confira o total e feche a consulta','Ao final da avaliação, verifique as observações e a pontuação total. Clique em <b>Fechar</b> para retornar à lista.',(132,401,1223,719),(1116,681,1195,718)),
(20,'Abra a ficha para baixar ou imprimir','Na lista de avaliações, clique no <b>ícone de impressora</b> da competência desejada. A ficha será aberta em PDF; use os controles do visualizador para baixar ou imprimir.',(285,299,1325,530),(351,430,385,460)),
(44,'Acesse a abertura de recurso','Se desejar contestar uma avaliação, clique em <b>Abrir Recurso</b>, no menu lateral.',(20,246,1330,600),(57,336,155,368)),
(86,'Escolha a avaliação para o recurso','Confira a competência na lista de avaliações disponíveis e clique no link <b>Abrir recurso</b> da linha correspondente.',(285,292,1315,557),(304,430,421,477)),
(60,'Leia o aviso antes de preencher','O sistema informa que <b>o texto do recurso e todos os anexos devem ser enviados neste momento</b>. Não será possível adicionar texto ou anexos depois do envio.',(120,340,1218,443),(123,345,1214,401)),
(60,'Escreva o seu recurso','No campo de texto, explique suas objeções de forma <b>clara e objetiva</b>. Revise o conteúdo antes de prosseguir.',(120,412,1218,715),(123,443,1214,710)),
(75,'Anexe os documentos necessários','Clique em <b>Escolher arquivos</b> e selecione os documentos que fundamentam o recurso. A tela aceita <b>PDF, JPG, PNG, GIF e ZIP</b>, com limite de <b>5 MB por arquivo</b>. Envie todos os anexos agora.',(120,464,1218,559),(123,498,286,535)),
(80,'Revise e envie o recurso','Confira o texto e os documentos selecionados. Quando tudo estiver completo, clique em <b>Enviar recurso</b>.',(120,470,1218,678),(591,630,733,673)),
(94,'Acesse um recurso já aberto','Se o sistema informar <b>“Já foi aberto um recurso referente a esta avaliação”</b>, clique em <b>Resposta de Recurso</b> para consultar o andamento.',(410,166,925,487),(583,322,742,361)),
(110,'Acompanhe o andamento','Você também pode acessar <b>Acompanhar Recursos</b> pelo menu lateral. Na tabela “Resposta de Recurso”, confira a competência e a situação exibida.',(20,205,1330,543),(57,327,203,360)),
(110,'Abra a resposta disponível','Clique no link da coluna <b>Situação</b> para abrir os detalhes do recurso. No exemplo demonstrado, a situação aparece como <b>Avaliado</b>.',(285,246,1315,462),(314,389,407,436)),
(100,'Consulte o histórico do recurso','Na janela de detalhes, consulte o <b>Histórico do Recurso</b> para conferir o texto enviado e os anexos registrados.',(120,420,1218,684),None),
(120,'Leia a decisão da comissão','Role o histórico e leia a resposta da comissão, incluindo a decisão e sua justificativa. O vídeo demonstra uma resposta com situação <b>Deferido</b>; confira o resultado do seu próprio recurso.',(130,379,1210,719),(145,592,1193,714)),
(120,'Consulte os anexos da resposta','Na área <b>Anexos das respostas da comissão</b>, clique no link do documento disponibilizado para consultá-lo. Os anexos enviados por você aparecem na área acima.',(120,180,1218,367),(123,280,1214,366)),
(134,'Retorne à consulta de avaliações','Feche a janela do recurso e clique em <b>Avaliações</b> no menu lateral. Abra novamente os detalhes ou a ficha da competência que deseja consultar.',(20,245,1330,602),(58,300,137,332)),
(140,'Confira a ficha após a análise','Abra a ficha em PDF pelo ícone de impressora e confira as notas e o total apresentados. Se necessário, baixe ou imprima a versão disponível no sistema.',(425,143,1228,719),None),
]

updates={
8:('Pedido de revisão da avaliação','Após consultar sua avaliação, caso não concorde com algum ponto, você poderá apresentar um pedido de revisão durante o período previsto no cronograma. Descreva os motivos do pedido e inclua, quando houver, documentos ou arquivos que sustentem seus argumentos. A opção <b>Abrir Recurso</b> ficará visível e disponível no período correspondente.'),
9:('Identifique a avaliação correspondente','Caso seja necessário apresentar um recurso, confira a competência e utilize o link <b>Abrir recurso</b> na linha da avaliação correspondente.'),
11:('Descreva o ponto a revisar','No campo de texto, descreva de forma <b>clara e objetiva</b> o ponto com o qual não concorda, os motivos do pedido e o que solicita revisar. Confira as informações antes do envio.'),
12:('Inclua os documentos do pedido','Em <b>Escolher arquivos</b>, inclua, quando houver, documentos ou arquivos que sustentem seus argumentos. Formatos aceitos: <b>PDF, JPG, PNG, GIF e ZIP</b>, até <b>5 MB por arquivo</b>. Inclua todos os documentos necessários antes de concluir.'),
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

style=ParagraphStyle('body' ,fontName='Arial',fontSize=10.5,leading=15,textColor=HexColor('#263746'))
small=ParagraphStyle('small',fontName='Arial',fontSize=8,leading=11,textColor=HexColor('#647587'))
file=out/'Tutorial_Portal_de_Avaliacoes_Avaliado.pdf'
c=canvas.Canvas(str(file),pagesize=(595.28,841.89)); c.setTitle('Tutorial de utilização - Portal de Avaliações');c.setAuthor('Tutorial baseado na gravação fornecida')
for page in range(11):
 c.setFillColor(HexColor('#12618A'));c.rect(0,832,596,10,fill=1,stroke=0)
 c.setFillColor(HexColor('#173951'));c.setFont('ArialBold',17)
 c.drawString(40,799,'Avaliação de servidores')
 c.setFont('Arial',10);c.setFillColor(HexColor('#647587'));c.drawString(40,779,'Consulta de notas e ficha | Guia do avaliado' if page < 4 else 'Pedido de revisão da avaliação | Guia do avaliado')
 c.setFillColor(HexColor('#FFF2CE'));c.roundRect(35,731,525,36,5,fill=1,stroke=0)
 c.setFillColor(HexColor('#78500A'));c.setFont('ArialBold',9)
 c.drawString(46,753,'ATENÇÃO AO CRONOGRAMA')
 c.setFont('Arial',8)
 c.drawString(46,740,'Cada etapa só ficará visível e disponível na data prevista. Consulte os prazos oficiais.')
 for pos in range(2):
  idx=page*2+pos;t,title,body,crop,highlight=steps[idx]
  top=720-pos*329;bottom=top-312
  c.setFillColor(HexColor('#F0F4F8'));c.roundRect(35,bottom,525,312,9,fill=1,stroke=0)
  c.setFillColor(white);c.circle(59,top-25,14,fill=1,stroke=0)
  c.setFillColor(HexColor('#12618A'));c.setFont('ArialBold',11);c.drawCentredString(59,top-29,str(idx+1) if page < 4 else 'R'+str(idx-7))
  c.setFillColor(HexColor('#173951'));c.setFont('ArialBold',12);c.drawString(83,top-29,title)
  para=Paragraph(body,style);_,h=para.wrap(477,150);para.drawOn(c,47,top-51-h)
  im=Image.open(base/f'frame_{t:04}.png').convert('RGB')
  # Hide demonstration filenames while preserving the surrounding interface.
  draw=ImageDraw.Draw(im)
  font=ImageFont.truetype(r'C:/Windows/Fonts/arial.ttf',17)
  masks={
   80:[((288,502,1205,531),'Documento anexado','#FFFFFF'),((151,584,655,609),'Documento selecionado','#FFFFFF')],
   100:[((150,374,570,400),'Documento anexado','#F8F8FA')],
   120:[((150,216,570,244),'Documento anexado','#F8F8FA'),((150,313,680,340),'Documento da resposta','#27CDE0')],
  }
  for box,label,color in masks.get(t,[]):
   draw.rectangle(box,fill=color)
   draw.text((box[0]+3,box[1]+3),label,fill='#24658A',font=font)
  if highlight:
   d=ImageDraw.Draw(im);d.rounded_rectangle(highlight,radius=7,outline='#F19C20',width=5)
  im=im.crop(crop)
  target=base/f'step_{idx+1:02}.png';im.save(target)
  maxh=312-65-h-24;w=min(497,maxh*im.width/im.height);ih=w*im.height/im.width
  y=bottom+24+(maxh-ih)/2
  c.drawImage(str(target),35+(525-w)/2,y,width=w,height=ih)
  c.setFont('Arial',7);c.setFillColor(HexColor('#647587'));c.drawString(48,bottom+10,'Portal de Avaliações | Passo a passo do avaliado')
 c.setStrokeColor(HexColor('#D6E0E8'));c.line(40,47,555,47)
 c.setFont('Arial',7.5);c.setFillColor(HexColor('#647587'));c.drawString(40,32,'Guia do avaliado | Consulta de avaliações' if page < 4 else 'Guia do avaliado | Pedido de revisão da avaliação')
 c.drawRightString(555,32,str(page+1));c.showPage()
c.save()
doc=pdfium.PdfDocument(str(file))
for i,p in enumerate(doc):
 im=p.render(scale=1.3).to_pil();im.save(base/f'page_{i+1:02}.png')
thumb=Image.new('RGB',(1200,1700),'#ccd4db')
for i in range(11):
 im=Image.open(base/f'page_{i+1:02}.png');im.thumbnail((300,425));thumb.paste(im,((i%4)*300,(i//4)*565))
thumb.save(base/'review.jpg')
print(str(file));print('pages',len(doc))
