import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
