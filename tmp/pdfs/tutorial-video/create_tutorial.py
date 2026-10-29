from pathlib import Path
from PIL import Image, ImageDraw
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
import pypdfium2 as pdfium
base=Path(r'C:/dev/fumep/tmp/pdfs/tutorial-video')
out=Path(r'C:/dev/fumep/output/pdf');out.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial',r'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBold',r'C:/Windows/Fonts/arialbd.ttf'))
# time, title, instructions, crop, highlight (original video coordinates)
steps=[
(0,'Acesse o Portal de Avaliações','No site <b>setelagoas.mg.gov.br</b>, localize a área “O que você procura” e clique em <b>Portal de Avaliações</b>.',(90,275,1260,660),(742,539,870,651)),
(5,'Entre como avaliador','Na seção <b>Para Avaliadores</b>, localize “Avaliação de Gratificação” e clique em <b>Acessar como Avaliador</b>.',(90,350,1250,645),(185,577,415,607)),
(12,'Informe sua matrícula e senha','Na <b>Área do Avaliador</b>, preencha os campos “Matrícula” e “Senha”. Em seguida, clique em <b>Entrar</b>.',(400,94,950,710),(453,439,855,657)),
(14,'Abra a lista de funcionários','No menu lateral <b>Avaliações</b>, clique em <b>Avaliar Funcionários</b> para acessar os funcionários disponíveis para avaliação.',(15,210,1330,680),(49,294,198,334)),
(30,'Selecione quem será avaliado','Marque a caixa à esquerda do funcionário desejado. É possível selecionar mais de um; confira os nomes antes de continuar. O vídeo demonstra dois funcionários selecionados.',(15,90,1330,665),None),
(18,'Clique em Avaliar Selecionados','Após marcar os funcionários, clique em <b>Avaliar Selecionados</b>, acima da tabela. O formulário de avaliação será aberto.',(240,210,1320,650),(276,250,432,281)),
(50,'Consulte a orientação de cada fator','Passe o mouse sobre o ícone <b>i</b> para ler o que considerar na avaliação. Consulte a orientação antes de atribuir a pontuação.',(125,304,1210,720),(143,340,170,366)),
(40,'Defina a nota de Assiduidade','No fator <b>Assiduidade</b>, arraste o marcador da barra até a pontuação desejada. Confira o número exibido abaixo dela.',(125,310,1210,505),(140,382,1200,435)),
(50,'Avalie o atendimento ao cidadão','Ajuste a barra de <b>Qualidade de atendimento ao cidadão</b>. O número abaixo da barra indica a pontuação escolhida.',(125,185,1210,305),(139,247,1200,298)),
(60,'Defina a nota de Pontualidade','Role o formulário e ajuste a barra de <b>Pontualidade</b>. A pontuação mostrada no vídeo é apenas um exemplo de preenchimento.',(125,88,1210,270),None),
(70,'Avalie o interesse e a dedicação','Em <b>Interesse e dedicação ao trabalho</b>, selecione a estrela correspondente à avaliação desejada. Confira a classificação exibida abaixo das estrelas.',(125,87,1210,320),(495,178,865,262)),
(80,'Preencha as observações','Se necessário, registre informações no campo <b>Observações</b>. Revise as notas e o total antes de enviar; use os dados adequados à avaliação realizada.',(125,285,1210,550),(140,324,1200,494)),
(83,'Envie a avaliação','Depois de revisar o preenchimento, clique em <b>Enviar Avaliação</b>, abaixo do total de pontos.',(125,325,1210,650),(590,548,725,584)),
(85,'Confirme com sua senha','Na janela <b>Confirme sua senha</b>, digite sua senha e clique em <b>Confirmar senha</b> para concluir o envio.',(480,215,890,560),(521,327,840,408)),
(94,'Confira a confirmação de envio','A mensagem <b>“Avaliação enviada com sucesso!”</b> confirma o envio. Clique em <b>Fechar</b> para voltar à listagem.',(470,210,900,515),(796,411,877,453)),
(100,'Acesse as avaliações realizadas','Para consultar a ficha ou abrir uma avaliação para revisão, clique em <b>Editar Avaliações</b> no menu lateral.',(15,210,1330,655),(48,315,200,357)),
(105,'Abra a ficha de avaliação','Na linha do funcionário desejado, clique no <b>ícone de impressora</b>. A ficha de avaliação será aberta em PDF.',(270,280,1315,635),(356,425,407,463)),
(110,'Consulte a ficha em PDF','Confira a identificação, as notas, o total e as observações na ficha. O visualizador do navegador oferece os controles para baixar ou imprimir o documento.',(285,85,1360,718),None),
(115,'Abra a avaliação para edição','Volte à aba do sistema. Em <b>Editar Avaliações</b>, clique no <b>ícone de lápis</b> da linha do funcionário que deseja revisar.',(270,280,1315,635),(301,425,344,463)),
(130,'Revise os dados da avaliação','O formulário exibe as notas e observações já registradas. Revise os campos e confira o total. O botão <b>Enviar Avaliação</b> fica ao final do formulário.<br/><br/><b>Limite da demonstração:</b> a gravação termina após a revisão, sem mostrar um novo envio da edição.',(125,87,1210,710),None),
]
# Refined crops and precise highlights after visual verification.
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

style=ParagraphStyle('body',fontName='Arial',fontSize=10.5,leading=15,textColor=HexColor('#263746'))
small=ParagraphStyle('small',fontName='Arial',fontSize=8,leading=11,textColor=HexColor('#647587'))
file=out/'Tutorial_Portal_de_Avaliacoes.pdf'
c=canvas.Canvas(str(file),pagesize=(595.28,841.89)); c.setTitle('Tutorial de utilização - Portal de Avaliações');c.setAuthor('Tutorial baseado na gravação fornecida')
for page in range(10):
 c.setFillColor(HexColor('#12618A'));c.rect(0,832,596,10,fill=1,stroke=0)
 c.setFillColor(HexColor('#173951'));c.setFont('ArialBold',17)
 c.drawString(40,799,'Avaliação de servidores')
 c.setFont('Arial',10);c.setFillColor(HexColor('#647587'));c.drawString(40,779,'Gratificação de desempenho | Guia do avaliador')
 for pos in range(2):
  idx=page*2+pos;t,title,body,crop,highlight=steps[idx]
  top=756-pos*350;bottom=top-328
  c.setFillColor(HexColor('#F0F4F8'));c.roundRect(35,bottom,525,328,9,fill=1,stroke=0)
  c.setFillColor(white);c.circle(59,top-25,14,fill=1,stroke=0)
  c.setFillColor(HexColor('#12618A'));c.setFont('ArialBold',11);c.drawCentredString(59,top-29,str(idx+1))
  c.setFillColor(HexColor('#173951'));c.setFont('ArialBold',12);c.drawString(83,top-29,title)
  para=Paragraph(body,style);_,h=para.wrap(477,150);para.drawOn(c,47,top-51-h)
  im=Image.open(base/f'frame_{t:04}.png').convert('RGB')
  if highlight:
   d=ImageDraw.Draw(im);d.rounded_rectangle(highlight,radius=7,outline='#F19C20',width=5)
  im=im.crop(crop)
  target=base/f'step_{idx+1:02}.png';im.save(target)
  maxh=328-65-h-24;w=min(497,maxh*im.width/im.height);ih=w*im.height/im.width
  y=bottom+24+(maxh-ih)/2
  c.drawImage(str(target),35+(525-w)/2,y,width=w,height=ih)
  c.setFont('Arial',7);c.setFillColor(HexColor('#647587'));c.drawString(48,bottom+10,f'Print da gravação | {t//60:02}:{t%60:02}')
 c.setStrokeColor(HexColor('#D6E0E8'));c.line(40,47,555,47)
 c.setFont('Arial',7.5);c.setFillColor(HexColor('#647587'));c.drawString(40,32,'Telas extraídas do vídeo fornecido em 19/10/2026. Dados e notas ilustram a demonstração.')
 c.drawRightString(555,32,str(page+1));c.showPage()
c.save()
doc=pdfium.PdfDocument(str(file))
for i,p in enumerate(doc):
 im=p.render(scale=1.3).to_pil();im.save(base/f'page_{i+1:02}.png')
thumb=Image.new('RGB',(1200,1700),'#ccd4db')
for i in range(10):
 im=Image.open(base/f'page_{i+1:02}.png');im.thumbnail((300,425));thumb.paste(im,((i%4)*300,(i//4)*565))
thumb.save(base/'review.jpg')
print(str(file));print('pages',len(doc))
