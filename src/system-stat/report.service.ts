import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { SystemStat } from './system-stat.entity';

@Injectable()
export class ReportService {
  async generatePdf(
    stats: SystemStat[],
    startDate: Date,
    endDate: Date,
  ): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(this.buildHtml(stats, startDate, endDate), {
        waitUntil: 'load',
      });
      await page.waitForNetworkIdle({ idleTime: 500 });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '18mm', right: '14mm', bottom: '18mm', left: '14mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private buildHtml(
    stats: SystemStat[],
    startDate: Date,
    endDate: Date,
  ): string {
    const timestamps = JSON.stringify(
      stats.map((s) => s.createdAt.toISOString()),
    );
    const cpuValues = JSON.stringify(stats.map((s) => Number(s.cpu)));
    const ramValues = JSON.stringify(stats.map((s) => Number(s.ram)));

    const allCpu = stats.map((s) => Number(s.cpu));
    const allRam = stats.map((s) => Number(s.ram));

    const avg = (arr: number[]) =>
      arr.length
        ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)
        : '—';
    const peak = (arr: number[]) =>
      arr.length ? Math.max(...arr).toFixed(2) : '—';
    const floor = (arr: number[]) =>
      arr.length ? Math.min(...arr).toFixed(2) : '—';

    const tableRows = stats
      .slice(0, 100)
      .map(
        (s) =>
          `<tr>
            <td>${s.createdAt.toISOString()}</td>
            <td>${Number(s.cpu).toFixed(2)}</td>
            <td>${Number(s.ram).toFixed(2)}</td>
          </tr>`,
      )
      .join('');

    const truncatedNote =
      stats.length > 100
        ? `<p class="note">Exibindo primeiros 100 de ${stats.length} registros. Todos os dados estão refletidos nos gráficos acima.</p>`
        : '';

    const emptyNote =
      stats.length === 0
        ? `<p class="note">Nenhum dado encontrado para o período informado.</p>`
        : '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório de Monitoramento</title>
  <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      padding: 28px 32px;
      color: #2c3e50;
      background: #fff;
      font-size: 13px;
    }
    header { margin-bottom: 24px; border-bottom: 2px solid #1a73e8; padding-bottom: 14px; }
    header h1 { font-size: 22px; color: #1a73e8; font-weight: 700; }
    header .meta { color: #666; font-size: 12px; margin-top: 5px; }
    .cards {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      margin-bottom: 26px;
    }
    .card {
      background: #f4f7ff;
      border: 1px solid #d8e3ff;
      border-radius: 8px;
      padding: 14px 8px;
      text-align: center;
    }
    .card .val { font-size: 18px; font-weight: 700; }
    .card .lbl { font-size: 10px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.4px; }
    .cpu .val { color: #1a73e8; }
    .ram .val { color: #34a853; }
    h2 {
      font-size: 13px;
      font-weight: 600;
      color: #444;
      border-left: 3px solid #1a73e8;
      padding-left: 9px;
      margin: 24px 0 10px;
    }
    .chart-wrap { width: 100%; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    thead th {
      background: #1a73e8;
      color: #fff;
      padding: 7px 10px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
    }
    tbody td { padding: 5px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
    tbody tr:nth-child(even) { background: #f7f9ff; }
    .note { font-size: 11px; color: #999; margin-bottom: 8px; }
    footer {
      margin-top: 28px;
      font-size: 10px;
      color: #bbb;
      text-align: center;
      border-top: 1px solid #eee;
      padding-top: 12px;
    }
  </style>
</head>
<body>
  <header>
    <h1>Relatório de Monitoramento do Sistema</h1>
    <div class="meta">
      Período: <strong>${startDate.toISOString()}</strong> até <strong>${endDate.toISOString()}</strong>
      &nbsp;&bull;&nbsp; ${stats.length} registros coletados
    </div>
  </header>

  <div class="cards">
    <div class="card cpu"><div class="val">${avg(allCpu)}%</div><div class="lbl">CPU Média</div></div>
    <div class="card cpu"><div class="val">${peak(allCpu)}%</div><div class="lbl">CPU Pico</div></div>
    <div class="card cpu"><div class="val">${floor(allCpu)}%</div><div class="lbl">CPU Mínima</div></div>
    <div class="card ram"><div class="val">${avg(allRam)} MB</div><div class="lbl">RAM Média</div></div>
    <div class="card ram"><div class="val">${peak(allRam)} MB</div><div class="lbl">RAM Pico</div></div>
    <div class="card ram"><div class="val">${floor(allRam)} MB</div><div class="lbl">RAM Mínima</div></div>
  </div>

  ${emptyNote}

  <h2>Uso de CPU ao longo do tempo</h2>
  <div class="chart-wrap" id="cpu-chart"></div>

  <h2>Uso de RAM ao longo do tempo</h2>
  <div class="chart-wrap" id="ram-chart"></div>

  <h2>Registros</h2>
  ${truncatedNote}
  <table>
    <thead>
      <tr><th>Timestamp (UTC)</th><th>CPU (%)</th><th>RAM (MB)</th></tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <footer>Gerado em ${new Date().toISOString()} &bull; System Watcher</footer>

  <script>
    const ts = ${timestamps};
    const cpu = ${cpuValues};
    const ram = ${ramValues};

    Plotly.newPlot('cpu-chart', [{
      x: ts,
      y: cpu,
      type: 'scatter',
      mode: 'lines',
      name: 'CPU (%)',
      line: { color: '#1a73e8', width: 1.5 },
      fill: 'tozeroy',
      fillcolor: 'rgba(26,115,232,0.08)',
    }], {
      xaxis: { title: 'Tempo', type: 'date', gridcolor: '#f0f0f0' },
      yaxis: { title: 'CPU (%)', range: [0, 100], gridcolor: '#f0f0f0' },
      margin: { t: 10, b: 45, l: 55, r: 20 },
      height: 230,
      plot_bgcolor: '#fff',
      paper_bgcolor: '#fff',
    }, { staticPlot: true, responsive: false });

    Plotly.newPlot('ram-chart', [{
      x: ts,
      y: ram,
      type: 'scatter',
      mode: 'lines',
      name: 'RAM (MB)',
      line: { color: '#34a853', width: 1.5 },
      fill: 'tozeroy',
      fillcolor: 'rgba(52,168,83,0.08)',
    }], {
      xaxis: { title: 'Tempo', type: 'date', gridcolor: '#f0f0f0' },
      yaxis: { title: 'RAM (MB)', gridcolor: '#f0f0f0' },
      margin: { t: 10, b: 45, l: 65, r: 20 },
      height: 230,
      plot_bgcolor: '#fff',
      paper_bgcolor: '#fff',
    }, { staticPlot: true, responsive: false });
  </script>
</body>
</html>`;
  }
}
