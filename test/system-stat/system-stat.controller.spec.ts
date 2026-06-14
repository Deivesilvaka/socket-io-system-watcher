jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SystemStatController } from '../../src/system-stat/system-stat.controller';
import { SystemStatService } from '../../src/system-stat/system-stat.service';
import { ReportService } from '../../src/system-stat/report.service';
import { SystemStat } from '../../src/system-stat/system-stat.entity';

const mockSystemStatService = { findByPeriod: jest.fn() };
const mockReportService = { generatePdf: jest.fn() };

const mockRes = () => {
  const res: Record<string, jest.Mock> = {
    setHeader: jest.fn(),
    send: jest.fn(),
  };
  res.setHeader.mockReturnValue(res);
  return res;
};

const makeStat = (): SystemStat =>
  ({
    id: 'uuid-1',
    cpu: 60,
    ram: 150,
    createdAt: new Date('2025-06-14T10:00:00.000Z'),
    updatedAt: new Date('2025-06-14T10:00:00.000Z'),
    deletedAt: null,
  }) as SystemStat;

describe('SystemStatController', () => {
  let controller: SystemStatController;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSystemStatService.findByPeriod.mockResolvedValue([makeStat()]);
    mockReportService.generatePdf.mockResolvedValue(Buffer.from('%PDF'));

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemStatController],
      providers: [
        { provide: SystemStatService, useValue: mockSystemStatService },
        { provide: ReportService, useValue: mockReportService },
      ],
    }).compile();

    controller = module.get(SystemStatController);
  });

  describe('GET /stats/report — sem parâmetros de data', () => {
    it('deve usar o intervalo do dia atual (UTC) por padrão', async () => {
      const res = mockRes();

      await controller.downloadReport(res as any);

      const [start, end]: [Date, Date] =
        mockSystemStatService.findByPeriod.mock.calls[0];

      expect(start.getUTCHours()).toBe(0);
      expect(start.getUTCMinutes()).toBe(0);
      expect(end.getUTCHours()).toBe(23);
      expect(end.getUTCMinutes()).toBe(59);
      expect(end.getUTCSeconds()).toBe(59);
    });

    it('deve retornar PDF com Content-Type correto', async () => {
      const res = mockRes();

      await controller.downloadReport(res as any);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename='),
      );
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  describe('GET /stats/report — com período válido', () => {
    it('deve chamar findByPeriod com as datas corretas', async () => {
      const res = mockRes();
      const startStr = '2025-06-13T00:00:00.000Z';
      const endStr = '2025-06-14T23:59:59.999Z';

      await controller.downloadReport(res as any, startStr, endStr);

      expect(mockSystemStatService.findByPeriod).toHaveBeenCalledWith(
        new Date(startStr),
        new Date(endStr),
      );
    });

    it('deve incluir as datas no nome do arquivo PDF', async () => {
      const res = mockRes();

      await controller.downloadReport(
        res as any,
        '2025-06-13T00:00:00.000Z',
        '2025-06-14T23:59:59.999Z',
      );

      const dispositionCall = res.setHeader.mock.calls.find(
        ([header]: string[]) => header === 'Content-Disposition',
      );
      expect(dispositionCall[1]).toContain('2025-06-13');
      expect(dispositionCall[1]).toContain('2025-06-14');
    });
  });

  describe('GET /stats/report — validação de parâmetros', () => {
    it('deve lançar BadRequestException quando só startDate é enviado', async () => {
      const res = mockRes();

      await expect(
        controller.downloadReport(res as any, '2025-06-13T00:00:00.000Z', undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando só endDate é enviado', async () => {
      const res = mockRes();

      await expect(
        controller.downloadReport(res as any, undefined, '2025-06-14T23:59:59.999Z'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException para formato de data inválido', async () => {
      const res = mockRes();

      await expect(
        controller.downloadReport(res as any, 'data-invalida', '2025-06-14T23:59:59.999Z'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando startDate === endDate', async () => {
      const res = mockRes();
      const same = '2025-06-14T00:00:00.000Z';

      await expect(
        controller.downloadReport(res as any, same, same),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando startDate é posterior a endDate', async () => {
      const res = mockRes();

      await expect(
        controller.downloadReport(
          res as any,
          '2025-06-15T00:00:00.000Z',
          '2025-06-14T00:00:00.000Z',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
