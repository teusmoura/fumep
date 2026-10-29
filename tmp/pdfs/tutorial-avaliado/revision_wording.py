from pathlib import Path
p=Path(r'C:/dev/fumep/tmp/pdfs/tutorial-avaliado/create_tutorial.py')
s=p.read_text(encoding='utf-8')
s=s.replace("8:('Quando houver divergência','Após consultar sua avaliação, caso identifique alguma divergência, você poderá apresentar um recurso durante o período previsto no cronograma. <b>Este procedimento se aplica apenas quando houver necessidade de revisão.</b> Nessa situação, acesse <b>Abrir Recurso</b> no menu lateral.'),","8:('Pedido de revisão da avaliação','Após consultar sua avaliação, caso não concorde com algum ponto, você poderá apresentar um pedido de revisão durante o período previsto no cronograma. Descreva os motivos do pedido e inclua, quando houver, documentos ou arquivos que sustentem seus argumentos. A opção <b>Abrir Recurso</b> ficará visível e disponível no período correspondente.'),")
s=s.replace('a divergência identificada e o ponto que solicita revisar','o ponto com o qual não concorda, os motivos do pedido e o que solicita revisar')
s=s.replace('selecione os documentos que fundamentam o pedido. Formatos aceitos:','inclua, quando houver, documentos ou arquivos que sustentem seus argumentos. Formatos aceitos:')
s=s.replace('Procedimento quando houver divergência | Guia do avaliado','Pedido de revisão da avaliação | Guia do avaliado')
s=s.replace('Guia do avaliado | Procedimento eventual quando houver divergência','Guia do avaliado | Pedido de revisão da avaliação')
p.write_text(s,encoding='utf-8')
