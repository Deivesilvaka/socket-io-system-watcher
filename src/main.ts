import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve o dashboard em tempo real na rota raiz "/"
  // __dirname aponta para src/ (dev) ou dist/ (prod) — um nível acima fica a raiz do projeto
  app.useStaticAssets(join(__dirname, '..', 'public'));

  const config = new DocumentBuilder()
    .setTitle('System Watcher API')
    .setDescription(
      'API de monitoramento de sistema em tempo real.\n\n' +
        'Coleta métricas de CPU e RAM a cada 3 segundos via WebSocket e ' +
        'disponibiliza download de relatórios em PDF com gráficos Plotly.',
    )
    .setVersion('1.0')
    .addTag('Relatórios', 'Geração e download de relatórios em PDF')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
