import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { SystemStatService } from './system-stat.service';
import { ReportService } from './report.service';

@ApiTags('Relatórios')
@Controller('stats')
export class SystemStatController {
  constructor(
    private readonly systemStatService: SystemStatService,
    private readonly reportService: ReportService,
  ) {}

  @Get('report')
  @ApiOperation({
    summary: 'Download do relatório de monitoramento em PDF',
    description:
      'Gera e faz o download de um relatório em PDF contendo gráficos de CPU e RAM ' +
      '(via Plotly) e tabela de registros para o período informado.\n\n' +
      'Se nenhum período for enviado, retorna os dados do **dia atual** (00:00:00 UTC até 23:59:59 UTC).',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Início do período em ISO 8601. Obrigatório se `endDate` for informado.',
    example: '2025-06-13T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Fim do período em ISO 8601. Obrigatório se `startDate` for informado.',
    example: '2025-06-14T23:59:59.999Z',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'PDF gerado com sucesso. O arquivo é retornado como download direto.',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiResponse({
    status: 400,
    description:
      'Parâmetros inválidos. Possíveis causas:\n' +
      '- Apenas um dos parâmetros de data foi enviado\n' +
      '- Formato de data inválido (esperado ISO 8601)\n' +
      '- `startDate` é igual ou posterior a `endDate`',
  })
  async downloadReport(
    @Res() res: Response,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ): Promise<void> {
    let startDate: Date;
    let endDate: Date;

    if (startDateStr || endDateStr) {
      if (!startDateStr || !endDateStr) {
        throw new BadRequestException(
          'Both startDate and endDate are required when filtering by period.',
        );
      }

      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException(
          'Invalid date format. Use ISO 8601 (e.g., 2025-01-01T00:00:00.000Z).',
        );
      }

      if (startDate >= endDate) {
        throw new BadRequestException('startDate must be before endDate.');
      }
    } else {
      const now = new Date();
      startDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          0, 0, 0, 0,
        ),
      );
      endDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23, 59, 59, 999,
        ),
      );
    }

    const stats = await this.systemStatService.findByPeriod(startDate, endDate);
    const pdf = await this.reportService.generatePdf(stats, startDate, endDate);

    const filename = `system-report_${startDate.toISOString().slice(0, 10)}_to_${endDate.toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.byteLength);
    res.send(pdf);
  }
}
