import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { SystemStatService } from '../../src/system-stat/system-stat.service';
import { SystemStat } from '../../src/system-stat/system-stat.entity';

const mockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

describe('SystemStatService', () => {
  let service: SystemStatService;
  let repo: jest.Mocked<Pick<Repository<SystemStat>, 'create' | 'save' | 'find'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemStatService,
        { provide: getRepositoryToken(SystemStat), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get(SystemStatService);
    repo = module.get(getRepositoryToken(SystemStat));
  });

  describe('save', () => {
    it('deve criar e salvar uma stat com os valores convertidos', async () => {
      const stat = { cpu: 72, ram: 128.5 } as SystemStat;
      (repo.create as jest.Mock).mockReturnValue(stat);
      (repo.save as jest.Mock).mockResolvedValue(stat);

      await service.save({ cpu: '72.00', ram: '128.50' });

      expect(repo.create).toHaveBeenCalledWith({ cpu: 72, ram: 128.5 });
      expect(repo.save).toHaveBeenCalledWith(stat);
    });
  });

  describe('findByPeriod', () => {
    it('deve buscar registros com Between aplicado em createdAt', async () => {
      const start = new Date('2025-06-14T00:00:00.000Z');
      const end = new Date('2025-06-14T23:59:59.999Z');
      const rows = [{ id: '1', cpu: 50, ram: 100, createdAt: start }] as SystemStat[];
      (repo.find as jest.Mock).mockResolvedValue(rows);

      const result = await service.findByPeriod(start, end);

      expect(repo.find).toHaveBeenCalledWith({
        where: { createdAt: Between(start, end) },
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual(rows);
    });

    it('deve retornar array vazio quando não há registros no período', async () => {
      (repo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.findByPeriod(
        new Date('2020-01-01T00:00:00.000Z'),
        new Date('2020-01-01T23:59:59.999Z'),
      );

      expect(result).toHaveLength(0);
    });
  });
});
