# System Watcher

Serviço de monitoramento de sistema em tempo real construído com **NestJS**, **Socket.IO** e **PostgreSQL**.

Coleta métricas de CPU e RAM a cada **3 segundos**, transmite ao dashboard via WebSocket, dispara alertas por e-mail quando a CPU ultrapassa 90% e permite baixar **relatórios em PDF** com gráficos interativos gerados pelo Plotly.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Configuração do ambiente](#configuração-do-ambiente)
- [Banco de dados](#banco-de-dados)
- [Rodando o projeto](#rodando-o-projeto)
- [Dashboard em tempo real](#dashboard-em-tempo-real)
- [API REST](#api-rest)
- [Documentação Swagger](#documentação-swagger)
- [Testando o endpoint de relatório](#testando-o-endpoint-de-relatório)
- [Testes automatizados](#testes-automatizados)
- [Variáveis de ambiente](#variáveis-de-ambiente)

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        NestJS App                           │
│                                                             │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │  SystemGateway  │    │     SystemStatController      │   │
│  │  (WebSocket)    │    │  GET /stats/report            │   │
│  │  @Interval 3s   │    │  → ReportService (PDF)        │   │
│  └────────┬────────┘    └──────────────┬───────────────┘   │
│           │                            │                    │
│  ┌────────▼────────────────────────────▼───────────────┐   │
│  │              SystemStatService                       │   │
│  │         save() · findByPeriod()                      │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────▼────────────────────────────┐   │
│  │                   PostgreSQL                         │   │
│  │              tabela: system_stats                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                          │
   Socket.IO clients          HTTP clients
   (dashboard HTML)           (Swagger / curl)
```

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 18.x |
| npm | 9.x |
| Docker + Docker Compose | qualquer versão recente |

---

## Configuração do ambiente

1. Clone o repositório e instale as dependências:

```bash
git clone <url-do-repositorio>
cd socket-io-system-watcher
npm install
```

2. Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp .env.example .env
```

> Consulte a seção [Variáveis de ambiente](#variáveis-de-ambiente) para detalhes de cada campo.

---

## Banco de dados

Suba o PostgreSQL via Docker Compose:

```bash
npm run db:up
```

Execute as migrations para criar a tabela `system_stats`:

```bash
npm run migration:run
```

Para derrubar o banco:

```bash
npm run db:down
```

---

## Rodando o projeto

```bash
# modo desenvolvimento (hot reload)
npm run start:dev

# modo produção
npm run start:prod
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT`).

---

## Dashboard em tempo real

Abra o navegador em:

```
http://localhost:3000
```

O dashboard exibe gráficos de CPU e RAM atualizados a cada 3 segundos via Socket.IO.

O arquivo HTML fica em `public/index.html`. Qualquer asset estático adicionado nessa pasta (CSS, JS, imagens) é servido automaticamente.

---

## API REST

### `GET /stats/report`

Gera e faz o download de um relatório em **PDF** contendo:

- Cards de resumo (CPU e RAM: média, pico e mínima)
- Gráfico de linha de CPU ao longo do tempo (Plotly)
- Gráfico de linha de RAM ao longo do tempo (Plotly)
- Tabela com os registros do período (até 100 linhas)

#### Query parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `startDate` | string (ISO 8601) | Não* | Início do período |
| `endDate` | string (ISO 8601) | Não* | Fim do período |

> \* Se nenhum parâmetro for enviado, o relatório cobre o **dia atual** (00:00:00 UTC → 23:59:59 UTC).  
> Se um for enviado, o outro é obrigatório.

#### Exemplos com curl

```bash
# Relatório do dia atual
curl -OJ http://localhost:3000/stats/report

# Relatório de um período específico
curl -OJ "http://localhost:3000/stats/report?startDate=2025-06-13T00:00:00.000Z&endDate=2025-06-14T23:59:59.999Z"
```

#### Respostas

| Status | Descrição |
|---|---|
| `200` | PDF gerado — download iniciado automaticamente |
| `400` | Parâmetro inválido (formato incorreto, período inválido ou apenas um dos parâmetros enviado) |

---

## Documentação Swagger

Com o servidor rodando, acesse a UI interativa em:

```
http://localhost:3000/api
```

O Swagger permite visualizar a documentação completa do endpoint e testar a geração do relatório diretamente pelo navegador.

---

## Testando o endpoint de relatório

### Via Swagger UI

1. Acesse `http://localhost:3000/api`
2. Expanda o endpoint `GET /stats/report`
3. Clique em **Try it out**
4. Preencha `startDate` e `endDate` (opcional) e clique em **Execute**
5. Role até a seção *Response body* e clique em **Download file**

### Via curl

```bash
# Relatório do dia atual — salva automaticamente com o nome do arquivo
curl -OJ http://localhost:3000/stats/report

# Período específico
curl -OJ "http://localhost:3000/stats/report?startDate=2025-06-14T00:00:00.000Z&endDate=2025-06-14T23:59:59.999Z"
```

### Via Insomnia / Postman

- Método: `GET`
- URL: `http://localhost:3000/stats/report`
- Parâmetros (opcionais): `startDate`, `endDate`
- A resposta será um arquivo `.pdf` — configure o cliente para salvar o binário.

---

## Testes automatizados

```bash
# Todos os testes unitários
npm run test

# Modo watch (re-executa ao salvar)
npm run test:watch

# Cobertura de código
npm run test:cov
```

Os testes cobrem:

| Arquivo | O que é testado |
|---|---|
| `system-stat.service.spec.ts` | `save()` e `findByPeriod()` — repositório mockado |
| `system-stat.controller.spec.ts` | Validação de datas, defaults e chamadas ao service/report |
| `report.service.spec.ts` | Geração do HTML e do PDF (Puppeteer mockado) |

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta HTTP do servidor |
| `DB_HOST` | `localhost` | Host do PostgreSQL |
| `DB_PORT` | `5432` | Porta do PostgreSQL |
| `DB_USERNAME` | `postgres` | Usuário do banco |
| `DB_PASSWORD` | `postgres` | Senha do banco |
| `DB_DATABASE` | `system_watcher` | Nome do banco |
| `MAIL_HOST` | — | SMTP host (ex: `sandbox.smtp.mailtrap.io`) |
| `MAIL_PORT` | — | SMTP port (ex: `2525`) |
| `MAIL_USER` | — | Usuário SMTP |
| `MAIL_PASSWORD` | — | Senha SMTP |
| `MAIL_SENDER_DEFAULT` | — | Endereço de remetente (ex: `no-reply@example.com`) |
| `MAIL_SENDER_NAME_DEFAULT` | — | Nome do remetente (ex: `SystemWatcher`) |
| `MAIL_ALERT_TO` | — | Destinatário dos alertas de CPU |
