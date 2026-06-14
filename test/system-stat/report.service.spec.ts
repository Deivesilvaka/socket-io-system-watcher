// jest.mock é içado antes das declarações de variáveis — factory não pode referenciar consts do escopo externo.
// Por isso o mock é declarado com apenas jest.fn() e configurado via mockResolvedValue no beforeEach.
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import * as puppeteer from 'puppeteer';
import { ReportService } from '../../src/system-stat/report.service';
import { SystemStat } from '../../src/system-stat/system-stat.entity';

const mockPage = {
  setContent: jest.fn(),
  waitForNetworkIdle: jest.fn(),
  pdf: jest.fn(),
};

const mockBrowser = {
  newPage: jest.fn(),
  close: jest.fn(),
};

const makeStat = (overrides: Partial<SystemStat> = {}): SystemStat =>
  ({
    id: 'uuid-1',
    cpu: 55.5,
    ram: 200.0,
    createdAt: new Date('2025-06-14T10:00:00.000Z'),
    updatedAt: new Date('2025-06-14T10:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  }) as SystemStat;

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPage.setContent.mockResolvedValue(undefined);
    mockPage.waitForNetworkIdle.mockResolvedValue(undefined);
    mockPage.pdf.mockResolvedValue(Buffer.from('%PDF-1.4 fake'));
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockBrowser.close.mockResolvedValue(undefined);
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportService],
    }).compile();

    service = module.get(ReportService);
  });

  describe('generatePdf', () => {
    it('deve retornar um Buffer', async () => {
      const result = await service.generatePdf(
        [makeStat()],
        new Date('2025-06-14T00:00:00.000Z'),
        new Date('2025-06-14T23:59:59.999Z'),
      );

      expect(result).toBeInstanceOf(Buffer);
    });

    it('deve lançar o browser com no-sandbox e fechar ao finalizar', async () => {
      await service.generatePdf(
        [makeStat()],
        new Date('2025-06-14T00:00:00.000Z'),
        new Date('2025-06-14T23:59:59.999Z'),
      );

      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('deve setar o conteúdo HTML e aguardar a rede ficar idle', async () => {
      await service.generatePdf(
        [makeStat()],
        new Date('2025-06-14T00:00:00.000Z'),
        new Date('2025-06-14T23:59:59.999Z'),
      );

      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('<!DOCTYPE html>'),
        { waitUntil: 'load' },
      );
      expect(mockPage.waitForNetworkIdle).toHaveBeenCalledWith({ idleTime: 500 });
    });

    it('deve solicitar PDF em formato A4 com fundo impresso', async () => {
      await service.generatePdf(
        [makeStat()],
        new Date('2025-06-14T00:00:00.000Z'),
        new Date('2025-06-14T23:59:59.999Z'),
      );

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'A4', printBackground: true }),
      );
    });

    it('deve fechar o browser mesmo quando a geração do PDF falhar', async () => {
      mockPage.pdf.mockRejectedValueOnce(new Error('pdf failure'));

      await expect(
        service.generatePdf(
          [makeStat()],
          new Date('2025-06-14T00:00:00.000Z'),
          new Date('2025-06-14T23:59:59.999Z'),
        ),
      ).rejects.toThrow('pdf failure');

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('deve gerar PDF sem erros para lista de stats vazia', async () => {
      const result = await service.generatePdf(
        [],
        new Date('2025-06-14T00:00:00.000Z'),
        new Date('2025-06-14T23:59:59.999Z'),
      );

      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
