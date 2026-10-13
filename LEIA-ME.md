# Teleprompter para celular

App de teleprompter com a câmera ao vivo no fundo e o texto rolando por cima, perto da lente. Grava vídeo com áudio (o texto não aparece no vídeo) e salva na galeria.

## O que tem dentro

```
www/        o app em si (HTML). Funciona sozinho no navegador e também vai dentro do APK
android/    projeto Android que embala o app e libera câmera, microfone e galeria
.github/    automação que gera o APK de graça no GitHub
```

## Gerar o APK (pelo GitHub, sem instalar nada no computador)

1. Crie um repositório novo no GitHub (pode ser privado), por exemplo `teleprompter`.
2. Envie todo o conteúdo desta pasta para ele. Pelo site: *Add file > Upload files*, arraste as pastas `www`, `android`, `.github` e este arquivo, e confirme em *Commit changes*.
   Atenção: a pasta `.github` começa com ponto e alguns sistemas a escondem. Se ela não subir, crie no site o arquivo `.github/workflows/gerar-apk.yml` e cole o conteúdo dele.
3. Abra a aba **Actions** do repositório. O processo "Gerar APK" roda sozinho (leva uns 3 a 5 minutos). Se não aparecer, clique em "Gerar APK" e depois em *Run workflow*.
4. Quando ficar verde, clique na execução e baixe **Teleprompter-APK** lá embaixo. Vem um .zip com o `Teleprompter.apk` dentro.
5. Passe o APK para o celular, abra e permita "instalar apps desconhecidos" quando o Android pedir.
6. Na primeira abertura, permita câmera e microfone.

Os vídeos ficam em **Galeria > Filmes > Teleprompter**.

## Usar sem APK (pelo seu VPS)

Suba a pasta `www` para qualquer endereço com **https** (câmera no navegador só funciona com https), abra no Chrome do celular e use o menu *Adicionar à tela inicial*. Fica com ícone e tela cheia como um app.

## Como usar

- Botão de linhas (esquerda): colar o texto, abrir .txt, tamanho da letra, velocidade, altura da área, escurecimento, alinhamento, câmera frontal ou traseira, espelhar texto.
- Botão vermelho: contagem de 3 segundos, começa a gravar e o texto rola sozinho. Toque de novo para parar.
- Tocar no texto pausa ou continua. Arrastar ajusta a posição.
- Botões de volume do celular: aumentam e diminuem a velocidade (no APK).
- Controle Bluetooth de slides: espaço ou Page Down pausa, setas mudam a velocidade, R grava.
- De qualquer app (WhatsApp, Google Docs, Notas): *Compartilhar > Teleprompter* manda o texto direto para o prompter.

## Observações

- O APK gerado é do tipo "debug": instala e funciona normalmente, só não serve para publicar na Play Store. Se um dia quiser publicar, dá para adicionar a assinatura de release.
- Celulares com Chrome/WebView mais novos gravam em MP4. Os mais antigos gravam em WebM, que toca normal no celular mas alguns editores pedem conversão.
- Para mudar o app, edite `www/index.html` e envie de novo ao GitHub: um APK novo é gerado sozinho.
