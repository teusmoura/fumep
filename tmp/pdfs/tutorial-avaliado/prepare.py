from pathlib import Path
src=Path(r'C:/dev/fumep/tmp/pdfs/tutorial-video/create_tutorial.py').read_text(encoding='utf-8')
start=src.index('steps=[');end=src.index("style=ParagraphStyle('body'")
steps='''steps=[
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
'''
src=src[:start]+steps+'\n'+src[end:]
src=src.replace('tutorial-video','tutorial-avaliado').replace('Tutorial_Portal_de_Avaliacoes.pdf','Tutorial_Portal_de_Avaliacoes_Avaliado.pdf').replace('Guia do avaliador','Guia do avaliado').replace('range(10)','range(11)').replace('str(t//60)', 'str(t//60)')
src=src.replace('from PIL import Image, ImageDraw','from PIL import Image, ImageDraw, ImageFont')
src=src.replace("  if highlight:",'''  # Hide demonstration filenames while preserving the surrounding interface.
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
  if highlight:''')
src=src.replace("f'Print da gravação | {t//60:02}:{t%60:02}'","'Portal de Avaliações | Passo a passo do avaliado'")
src=src.replace('Telas extraídas do vídeo fornecido em 19/10/2026. Dados e notas ilustram a demonstração.','Guia do avaliado | Consulta de avaliações, abertura e acompanhamento de recursos')
src=src.replace("(1200,1700)","(1200,1700)")
Path(r'C:/dev/fumep/tmp/pdfs/tutorial-avaliado/create_tutorial.py').write_text(src,encoding='utf-8')
